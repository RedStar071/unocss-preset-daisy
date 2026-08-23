import type { AtRule, ChildNode, Container, Declaration, Rule } from 'postcss';
import type { CSSObjectInput, DynamicRule, Preflight, Preset, Variant } from 'unocss';
import daisyui from 'daisyui';
import postcss from 'postcss';
import nested from 'postcss-nested';
import { symbols } from 'unocss';
import parse from './parser.js';

export interface DaisyOptions {
	base?: boolean;
	darkTheme?: boolean;
	exclude?: string[];
	include?: string[];
	logs?: boolean;
	prefix?: string;
	root?: string;
	styled?: boolean;
	themeRoot?: string; // :root
	themes?: boolean | string[];
	utils?: boolean;
	variablePrefix?: string;
}

/** Kept as an alias so the previously exported type name keeps resolving. */
export type Options = DaisyOptions;

const CSSCLASS = /\.(?<name>[-\w\P{ASCII}]+)/gu;
const NOMERGE = /^file-input(?:-.+)?|.*::-webkit-slider-runnable-track$/;
/**
 * At-rules that have to be lifted out of the rule they are nested in, on top of the ones
 * postcss-nested already bubbles (`media`, `supports`, `layer`, `container`, `starting-style`).
 * daisyUI uses `@scope (&)` for `.join` since v5.1.
 */
const BUBBLE = ['scope'];

/** Nearest ancestor style rule of `node`, if any. */
function closestRule(node: AtRule): Rule | undefined {
	let parent = node.parent as Container | undefined;
	while (parent != null) {
		if (parent.type === 'rule') {
			return parent as Rule;
		}
		parent = parent.parent as Container | undefined;
	}
	return undefined;
}

function wrapInParents(parents: string[], css: string): string {
	return parents.reduceRight((inner, parent) => `${parent}{${inner}}`, css);
}

function stringifyDeclarations(declarations: Declaration[]): string {
	return declarations.map(({ important, prop, value }) => `${prop}:${value}${important ? ' !important' : ''}`).join(';');
}

function* flattenRules(nodes: ChildNode[], parents: string[] = []): Generator<[string[], string, Declaration[]] | string> {
	for (const node of nodes) {
		if (node.type === 'comment') {
			continue;
		} else if (node.type === 'rule') {
			const declarations = node.nodes.filter(({ type }) => type === 'decl') as Declaration[];
			if (declarations.length !== node.nodes.filter(({ type }) => type !== 'comment').length) {
				throw new Error('unexpected mixed declarations node');
			}
			if (declarations.length) {
				node.nodes = declarations;
				yield [parents, node.selector, declarations];
			}
		} else if (node.type === 'atrule') {
			if (node.nodes == null || node.nodes.length === 0) {
				continue;
			}
			if (node.name === 'keyframes' || node.name === 'property') {
				yield node.toString();
			} else {
				yield* flattenRules(node.nodes, [...parents, `@${node.name}${node.raws.afterName ?? ' '}${node.params ?? ''}`]);
			}
		} else {
			console.warn('skipping', node.type);
		}
	}
}

function getUnoCssElements(childNodes: ChildNode[], cssObjectInputsByClassToken: Map<string, CSSObjectInput[]>, layer?: string): Preflight[] {
	const preflights: Preflight[] = [];
	Array.from(flattenRules(childNodes)).forEach((rawElement, idx) => {
		if (typeof rawElement === 'string') {
			preflights.push({
				getCSS: () => rawElement,
				layer
			});
			return;
		}
		const [parents, selector, declarations] = rawElement;
		const classTokens = new Set(Array.from(selector.matchAll(CSSCLASS), ([, name]) => name));

		if (classTokens.size === 0) {
			/*
			 * A rule without any class can never be attached to a utility (daisyUI emits a few, e.g.
			 * `:where(:root)`), so it is shipped as a preflight instead of failing the whole build.
			 */
			preflights.push({
				getCSS: () => wrapInParents(parents, `${selector}{${stringifyDeclarations(declarations)}}`),
				layer
			});
			return;
		}

		for (const classToken of classTokens) {
			let cssObjectInputs = cssObjectInputsByClassToken.get(classToken);
			if (cssObjectInputs == null) {
				cssObjectInputs = [];
				cssObjectInputsByClassToken.set(classToken, cssObjectInputs);
			}
			cssObjectInputs.push({
				...Object.fromEntries(declarations.map(({ important, prop, value }) => [prop, `${value}${important ? ' !important' : ''}`])),
				[symbols.layer]: layer,
				[symbols.parent]: parents.join(' $$ '),
				[symbols.selector]: (currentSelector: string) =>
					selector === currentSelector
						? selector
						: selector.replaceAll(CSSCLASS, (all, c) => {
								return c === classToken ? currentSelector : all;
							}),
				[symbols.sort]: idx
			});
		}
	});
	return preflights;
}

export async function presetDaisy(options?: DaisyOptions): Promise<Preset<Record<string, any>>> {
	const cssObjectInputsByClassToken = new Map<string, CSSObjectInput[]>();
	const processor = postcss(
		{
			Once(root) {
				/*
				 * `&` is only meaningful while the at-rule is still nested, so resolve it against the rule
				 * it belongs to before postcss-nested bubbles the at-rule up to the top level.
				 */
				root.walkAtRules((atRule) => {
					if (atRule.params.includes('&')) {
						const rule = closestRule(atRule);
						if (rule != null) {
							atRule.params = atRule.params.replaceAll('&', rule.selector);
						}
					}
				});
				const variablePrefix = options?.variablePrefix ?? 'un-';
				if (variablePrefix !== 'tw-') {
					root.walkDecls((decl) => {
						if (decl.prop.startsWith('--tw-')) {
							decl.prop = `--${variablePrefix}${decl.prop.substring(5)}`;
						}
						if (decl.value.includes('var(--tw-')) {
							decl.value = decl.value.replaceAll('var(--tw-', `var(--${variablePrefix}`);
						}
					});
				}
			},
			postcssPlugin: 'fix-css'
		},
		nested({ bubble: BUBBLE })
	);

	/*
	 * daisyUI v5 exports `plugin.withOptions(…)`, i.e. a callable returning `{ config, handler }`,
	 * while daisyUI v4 exports the already-resolved object.
	 */
	const { config, handler } = typeof daisyui === 'function' ? daisyui(options) : daisyui;
	const preflightPromises: Promise<Preflight[]>[] = [];
	const variants: Variant[] = [];

	handler({
		addBase(jsCss) {
			preflightPromises.push(
				Promise.resolve([
					{
						getCSS: async () => processor.process(parse(jsCss), { from: 'base', to: 'base' }).then((ast) => ast.toString()),
						layer: 'daisy-base'
					}
				])
			);
		},
		addComponents(jsCss) {
			preflightPromises.push(
				processor
					.process(parse(jsCss), { from: 'components', to: 'components' })
					.then((ast) => getUnoCssElements(ast.root.nodes, cssObjectInputsByClassToken, 'daisy-components'))
			);
		},
		addUtilities(jsCss) {
			preflightPromises.push(
				processor
					.process(parse(jsCss), { from: 'utilities', to: 'utilities' })
					.then((ast) => getUnoCssElements(ast.root.nodes, cssObjectInputsByClassToken, 'daisy-utilities'))
			);
		},
		/* daisyUI >= 5.1 registers the `is-drawer-open` / `is-drawer-close` variants through the plugin API. */
		addVariant(name, value) {
			const selectors = Array.isArray(value) ? value : [value];
			const prefix = `${name}:`;
			variants.push({
				match(matcher) {
					if (!matcher.startsWith(prefix)) {
						return undefined;
					}
					return {
						matcher: matcher.slice(prefix.length),
						selector: (currentSelector) => selectors.map((selector) => selector.replaceAll('&', currentSelector)).join(',')
					};
				},
				name: `daisy-${name}`
			});
		},
		// for daisyUI v4
		config: (key: string) => options?.[key.split('.')[1] as keyof DaisyOptions]
	});

	const preflights = await Promise.all(preflightPromises).then((p) => p.flat());
	const rules: DynamicRule[] = [];
	for (const [classToken, cssObjectInputs] of cssObjectInputsByClassToken) {
		const noMerge = cssObjectInputs.some((cssObjectInput) => {
			const selector = (cssObjectInput as Record<symbol, unknown>)[symbols.selector] as ((selector: string) => string) | undefined;
			return selector != null && NOMERGE.test(selector(`.${classToken}`));
		});
		rules.push([
			new RegExp(`^${classToken}$`),
			() => cssObjectInputs,
			{
				autocomplete: classToken,
				noMerge
			}
		]);
	}

	/*
	 * daisyUI hands its design tokens back under `theme.extend` (the tailwind shape). UnoCSS has no
	 * `extend` key, so hoist them and `bg-primary`, `rounded-box`, … work without extra user config.
	 */
	const { theme: daisyTheme, ...restConfig } = config ?? {};
	const theme = daisyTheme?.extend == null ? daisyTheme : { ...daisyTheme, ...daisyTheme.extend, extend: undefined };

	return {
		...restConfig,
		name: 'unocss-preset-daisy',
		preflights,
		rules,
		theme,
		variants
	};
}
