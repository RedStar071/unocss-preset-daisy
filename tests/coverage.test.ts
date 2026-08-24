import type { AtRule, ChildNode, Container, Root, Rule } from 'postcss';
import daisyui from 'daisyui';
import postcss from 'postcss';
import nested from 'postcss-nested';
import { createGenerator, presetWind3, presetWind4 } from 'unocss';
import { describe, expect, it } from 'vitest';
import { presetDaisy } from '../src/index.js';
import parse from '../src/parser.js';

const CSSCLASS = /\.(?<name>[-\w\P{ASCII}]+)/gu;

/**
 * Mirrors the `&`-in-at-rule-prelude resolution `presetDaisy` applies before postcss-nested bubbles
 * the at-rule out of its rule, so reference and generated keys line up for `@scope (&)` (`.join`).
 */
const resolveAmpersand = {
	Once(root: Root) {
		root.walkAtRules((atRule: AtRule) => {
			if (!atRule.params.includes('&')) return;
			let parent = atRule.parent as Container | undefined;
			while (parent != null && parent.type !== 'rule') parent = parent.parent as Container | undefined;
			if (parent != null) atRule.params = atRule.params.replaceAll('&', (parent as Rule).selector);
		});
	},
	postcssPlugin: 'resolve-ampersand'
};

/** daisyUI writes `--tw-*`, the preset rewrites it to the UnoCSS `--un-*` prefix. */
function norm(value: string) {
	return value
		.replaceAll('--tw-', '--un-')
		.replace(/\s+/g, ' ')
		.replace(/\s*([,{}:;>~+])\s*/g, '$1')
		.trim();
}

/** Splits a selector list on top-level commas only, so `:is(a, b)` stays in one piece. */
function splitSelectors(selector: string): string[] {
	const out: string[] = [];
	let depth = 0;
	let current = '';
	for (const char of selector) {
		if (char === '(' || char === '[') depth++;
		else if (char === ')' || char === ']') depth--;
		if (char === ',' && depth === 0) {
			out.push(current);
			current = '';
		} else current += char;
	}
	out.push(current);
	return out;
}

/** `at-rule context || selector` → set of `prop:value` strings. */
type RuleMap = Map<string, Set<string>>;

function collect(nodes: ChildNode[], parents: string[], out: RuleMap) {
	for (const node of nodes) {
		if (node.type === 'comment') continue;
		if (node.type === 'rule') {
			for (const selector of splitSelectors(node.selector)) {
				const key = `${parents.join('|')}||${norm(selector)}`;
				let declarations = out.get(key);
				if (declarations == null) out.set(key, (declarations = new Set()));
				for (const child of node.nodes) {
					if (child.type === 'decl') declarations.add(`${norm(child.prop)}:${norm(child.value)}${child.important ? '!' : ''}`);
				}
			}
		} else if (node.type === 'atrule' && node.nodes != null) {
			// keyframes/property bodies are opaque: the preset ships them verbatim as preflights
			if (node.name === 'keyframes' || node.name === 'property')
				out.set(`@${node.name} ${norm(node.params)}`, new Set([norm(node.toString())]));
			else collect(node.nodes, [...parents, norm(`@${node.name} ${node.params}`)], out);
		}
	}
}

/** Everything daisyUI's tailwind plugin emits for components + utilities, flattened. */
async function daisyReference() {
	const roots: Root[] = [];
	const jobs: Promise<void>[] = [];
	const processor = postcss(resolveAmpersand, nested({ bubble: ['scope'] }));
	const push = (styles: Record<string, unknown>) => {
		jobs.push(
			processor.process(parse(styles), { from: undefined }).then((result) => {
				roots.push(result.root);
			})
		);
	};
	const { handler } = (daisyui as unknown as (options?: object) => { handler: (api: Record<string, unknown>) => void })({});
	handler({ addBase: () => {}, addComponents: push, addUtilities: push, addVariant: () => {}, config: () => undefined });
	await Promise.all(jobs);

	const rules: RuleMap = new Map();
	for (const root of roots) collect(root.nodes, [], rules);

	const tokens = new Set<string>();
	for (const root of roots) {
		root.walkRules((rule) => {
			// skip keyframe steps: `89.9999%` would otherwise look like a `.9999` class
			if ((rule.parent as AtRule | undefined)?.type === 'atrule' && (rule.parent as AtRule).name === 'keyframes') return;
			for (const [, name] of rule.selector.matchAll(CSSCLASS)) tokens.add(name);
		});
	}
	return { rules, tokens: [...tokens].toSorted() };
}

describe('daisyUI component coverage', () => {
	it('given every class daisyUI ships then the preset generates a rule for it', async () => {
		const { tokens } = await daisyReference();
		const uno = await createGenerator({ presets: [await presetDaisy()], separators: [':'] });

		const missing: string[] = [];
		for (const token of tokens) {
			const { css } = await uno.generate(new Set([token]), { preflights: false });
			if (!css.trim()) missing.push(token);
		}
		expect(missing).toEqual([]);
		expect(tokens.length).toBeGreaterThan(500);
	}, 120_000);

	it('given daisyUI declarations then none are dropped, including CSS fallback chains', async () => {
		const { rules, tokens } = await daisyReference();
		const uno = await createGenerator({ presets: [await presetDaisy()], separators: [':'] });
		const generated: RuleMap = new Map();
		collect(postcss.parse((await uno.generate(new Set(tokens), { preflights: true })).css).nodes, [], generated);

		const dropped: string[] = [];
		for (const [key, declarations] of rules) {
			const got = generated.get(key);
			if (got == null) {
				dropped.push(`missing rule ${key}`);
				continue;
			}
			for (const declaration of declarations) if (!got.has(declaration)) dropped.push(`missing declaration ${key} { ${declaration} }`);
		}
		expect(dropped).toEqual([]);
	}, 120_000);

	/*
	 * daisyUI and preset-wind share a few class names (`filter`, `table`, `tab`, `collapse`). UnoCSS
	 * resolves a token against `rulesStaticMap` before any dynamic rule, so the preset has to register
	 * static rules for preset order to decide the winner — otherwise preset-wind always wins.
	 */
	it.each([
		['preset-wind3', presetWind3],
		['preset-wind4', presetWind4]
	])(
		'given %s listed before presetDaisy then no daisyUI component is shadowed',
		async (_name, wind) => {
			const { tokens } = await daisyReference();
			const solo = await createGenerator({ presets: [await presetDaisy()], separators: [':'] });
			const combined = await createGenerator({ presets: [wind() as never, await presetDaisy()], separators: [':'] });

			const shadowed: string[] = [];
			for (const token of tokens) {
				const own = (await solo.generate(new Set([token]), { preflights: false })).css.trim();
				if (!own) continue;
				const { css } = await combined.generate(new Set([token]), { preflights: false });
				const declarations = [...own.matchAll(/\{([^{}]*)\}/g)].flatMap((match) => match[1].split(';')).filter(Boolean);
				if (!declarations.every((declaration) => css.includes(declaration))) shadowed.push(token);
			}
			expect(shadowed).toEqual([]);
		},
		120_000
	);
});
