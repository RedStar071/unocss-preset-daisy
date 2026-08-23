import type { UnoGenerator } from 'unocss';
import { createGenerator, presetWind3 } from 'unocss';
import { beforeAll, describe, expect, it } from 'vitest';
import { presetDaisy } from '../src/index.js';

/**
 * preset-mini/wind3 ship `tab` and `table` rules that collide with the daisyUI components of the
 * same name, exactly like the demo config documents in the README.
 */
const COLLIDING = new Set(['/^tab(?:-(.+))?$/', 'table']);

async function createUno(options?: Parameters<typeof presetDaisy>[0]): Promise<UnoGenerator> {
	const { rules, ...wind3 } = presetWind3();
	return createGenerator({
		presets: [
			await presetDaisy({ logs: false, ...options }),
			{ ...wind3, rules: rules!.filter(([matcher]) => !COLLIDING.has(matcher.toString())) }
		],
		separators: [':']
	});
}

describe('presetDaisy', () => {
	let uno: UnoGenerator;

	beforeAll(async () => {
		uno = await createUno({ themes: ['light --default', 'dark --prefersdark'] });
	});

	it('given daisyUI component classes then it generates a rule for each of them', async () => {
		const classes = [
			'btn',
			'btn-primary',
			'card',
			'modal',
			'dropdown',
			'navbar',
			'tab',
			'table',
			'input',
			'file-input',
			'toggle',
			'join',
			'join-item'
		];
		const { matched } = await uno.generate(classes.join(' '), { preflights: false });
		expect([...classes].filter((token) => !matched.has(token))).toEqual([]);
	});

	it('given daisyUI 5 only components then it generates a rule for each of them', async () => {
		// Regression guard: these all landed after daisyUI 5.0 and exercise the newer plugin output.
		const classes = [
			'btn-soft',
			'btn-dash',
			'list',
			'fieldset',
			'status',
			'validator',
			'dock',
			'fab',
			'megamenu',
			'otp',
			'aura',
			'cally',
			'hover-3d'
		];
		const { matched } = await uno.generate(classes.join(' '), { preflights: false });
		expect([...classes].filter((token) => !matched.has(token))).toEqual([]);
	});

	it('given a component nested in a daisyUI sublayer then it keeps the cascade layer', async () => {
		const { css } = await uno.generate('btn', { preflights: false });
		expect(css).toMatch(/@layer daisyui(?:\.l\d)+\s*\{/);
	});

	it('given the join utility then it resolves the `&` in its `@scope` prelude', async () => {
		const { css } = await uno.generate('join', { preflights: false });
		expect(css).toContain('@scope (.join)');
		expect(css).not.toContain('@scope (&)');
	});

	it('given a component using `@starting-style` then it emits a valid at-rule', async () => {
		const { css } = await uno.generate('megamenu dropdown modal', { preflights: false });
		expect(css).toContain('@starting-style');
		// The at-rule must not be smuggled through as a declaration (`@starting-style:{…}`).
		expect(css).not.toMatch(/@starting-style\s*:/);
	});

	it('given a variant registered by daisyUI then it exposes it to UnoCSS', async () => {
		const { css, matched } = await uno.generate('is-drawer-open:opacity-100 is-drawer-close:opacity-0', { preflights: false });
		expect(matched.size).toBe(2);
		expect(css).toContain('.drawer-toggle:checked ~ .drawer-side');
		expect(css).toContain('.drawer-toggle:not(:checked) ~ .drawer-side');
	});

	it('given no explicit theme then it exposes the daisyUI design tokens', async () => {
		const { css } = await uno.generate('bg-primary rounded-box', { preflights: false });
		expect(css).toContain('var(--color-primary)');
		expect(css).toContain('var(--radius-box)');
	});

	it('given the default variable prefix then it rewrites daisyUI `--tw-` variables', async () => {
		const { css } = await uno.generate('btn card badge alert', { preflights: true });
		expect(css).not.toContain('--tw-');
		expect(css).toContain('--un-');
	});

	it('given a custom variable prefix then it uses it', async () => {
		const custom = await createUno({ themes: ['light'], variablePrefix: 'daisy-' });
		const { css } = await custom.generate('btn card badge alert', { preflights: true });
		expect(css).not.toContain('--tw-');
		expect(css).toContain('--daisy-');
	});

	it('given the selected themes then it emits them as preflights', async () => {
		const { css } = await uno.generate('', { preflights: true });
		expect(css).toContain('[data-theme=light]');
		expect(css).toContain('[data-theme=dark]');
		expect(css).toContain('(prefers-color-scheme: dark)');
	});

	it('given an unknown class then it does not match', async () => {
		const { matched } = await uno.generate('definitely-not-a-daisy-component', { preflights: false });
		expect(matched.size).toBe(0);
	});
});
