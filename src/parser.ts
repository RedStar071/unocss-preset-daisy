import type { Container } from 'postcss';
import postcss from 'postcss';

// derived from https://github.com/postcss/postcss-js/blob/b3db658b932b42f6ac14ca0b1d50f50c4569805b/parser.js, MIT, Copyright 2015 Andrey Sitnik <andrey@sitnik.ru>
const IMPORTANT = /\s*!important\s*$/i;
const UNITLESS = new Set([
	'box-flex',
	'box-flex-group',
	'column-count',
	'fill-opacity',
	'flex',
	'flex-grow',
	'flex-negative',
	'flex-positive',
	'flex-shrink',
	'font-weight',
	'line-clamp',
	'line-height',
	'opacity',
	'order',
	'orphans',
	'stroke-dashoffset',
	'stroke-opacity',
	'stroke-width',
	'tab-size',
	'widows',
	'z-index',
	'zoom'
]);

export type ScalarValue = false | null | number | string;

function dashify(str: string) {
	return str
		.replace(/([A-Z])/g, '-$1')
		.replace(/^ms-/, '-ms-')
		.toLowerCase();
}

function isStyleObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decl(parent: Container, name: string, value: ScalarValue) {
	if (value === false || value === null) {
		return;
	}

	if (!name.startsWith('--')) {
		name = dashify(name);
	}

	if (typeof value === 'number') {
		if (value === 0 || UNITLESS.has(name)) {
			value = value.toString();
		} else {
			value = `${value}px`;
		}
	}

	if (name === 'css-float') {
		name = 'float';
	}

	if (IMPORTANT.test(value)) {
		value = value.replace(IMPORTANT, '');
		parent.push(postcss.decl({ important: true, prop: name, value }));
	} else {
		parent.push(postcss.decl({ prop: name, value }));
	}
}

function atRule(parent: Container, parts: string[], value: unknown) {
	const node = postcss.atRule({ name: parts[1], params: parts[3] || '' });
	if (isStyleObject(value)) {
		node.nodes = [];
		parse(value, node);
	}
	parent.push(node);
}

function rule(parent: Container, selector: string, value: Record<string, unknown>) {
	const node = postcss.rule({ selector });
	parse(value, node);
	parent.push(node);
}

export default function parse(obj: Record<string, unknown>, parent: Container = postcss.root()): Container {
	for (const name in obj) {
		const value = obj[name];
		if (value === null || typeof value === 'undefined') {
			continue;
		} else if (name[0] === '@') {
			const parts = name.match(/@(\S+)(\s+([\s\S]*))?/);
			if (parts == null) {
				throw new Error('unexpected at rule name');
			}
			if (Array.isArray(value)) {
				for (const item of value) {
					atRule(parent, parts, item);
				}
			} else {
				atRule(parent, parts, value);
			}
		} else if (Array.isArray(value)) {
			/*
			 * postcss-js uses arrays for repeated fallback declarations (`{ color: ['red', 'var(--x)'] }`),
			 * but daisyUI >= 5.1 hoists its nested `@layer daisyui.*` blocks out of the selector, which
			 * yields arrays of style objects instead (`{ '.btn': [{ '@layer daisyui.l1': { … } }, … ] }`).
			 * Both shapes have to be supported.
			 */
			for (const item of value as unknown[]) {
				if (isStyleObject(item)) {
					rule(parent, name, item);
				} else {
					decl(parent, name, item as ScalarValue);
				}
			}
		} else if (isStyleObject(value)) {
			rule(parent, name, value);
		} else {
			decl(parent, name, value as ScalarValue);
		}
	}
	return parent;
}
