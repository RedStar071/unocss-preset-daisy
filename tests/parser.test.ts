import type { Declaration, Rule } from 'postcss';
import { describe, expect, it } from 'vitest';
import parse from '../src/parser.js';

/** postcss keeps no `raws` for programmatically built nodes, so compare whitespace-insensitively. */
function css(obj: Record<string, unknown>): string {
	return parse(obj).toString().replaceAll(/\s+/g, ' ').trim();
}

describe('parse', () => {
	it('given a camelCased property then it dashifies it', () => {
		expect(css({ '.a': { backgroundColor: 'red' } })).toBe('.a { background-color: red }');
	});

	it('given a custom property then it keeps its casing', () => {
		expect(css({ '.a': { '--btnColor': 'red' } })).toBe('.a { --btnColor: red }');
	});

	it('given a unitless property then it does not append px', () => {
		expect(css({ '.a': { flexGrow: 1, zIndex: 2 } })).toBe('.a { flex-grow: 1; z-index: 2 }');
	});

	it('given a length property then it appends px exactly once', () => {
		expect(css({ '.a': { width: 12 } })).toBe('.a { width: 12px }');
	});

	it('given a value flagged !important then it marks the declaration important', () => {
		const rule = parse({ '.a': { color: 'red !important' } }).first as Rule;
		const decl = rule.nodes[0] as Declaration;
		expect(decl.important).toBe(true);
		expect(decl.value).toBe('red');
	});

	it('given an array of scalars then it emits fallback declarations', () => {
		expect(css({ '.a': { color: ['red', 'var(--x)'] } })).toBe('.a { color: red; color: var(--x) }');
	});

	it('given an array of style objects then it emits one rule per entry', () => {
		// daisyUI >= 5.1 hoists its `@layer daisyui.*` blocks out of the selector, producing this shape.
		const result = css({ '.btn': [{ '@layer daisyui.l1': { color: 'red' } }, { '@layer daisyui.l1.l2': { color: 'blue' } }] });
		expect(result).toContain('@layer daisyui.l1 {');
		expect(result).toContain('@layer daisyui.l1.l2 {');
		expect(result).not.toContain('[object Object]');
	});

	it('given an at-rule with an array value then it emits one at-rule per entry', () => {
		expect(
			css({ '@media (hover: hover)': [{ '.a': { color: 'red' } }, { '.b': { color: 'blue' } }] }).match(/@media \(hover: hover\)/g)
		).toHaveLength(2);
	});

	it('given null, undefined or false values then it skips them', () => {
		expect(css({ '.a': { color: null, opacity: undefined, zIndex: false } })).toBe('.a {}');
	});
});
