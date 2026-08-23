import { createGenerator, presetWind3 } from 'unocss';
import { describe, expect, it } from 'vitest';
import { presetDaisy } from '../src/index.js';

/**
 * Smoke test run against every supported daisyUI release (see the `compat` job in `ci.yml`).
 * It may only assert on what daisyUI v4 and v5 have in common.
 */
const COMMON_COMPONENTS = ['btn', 'btn-primary', 'card', 'modal', 'dropdown', 'navbar', 'input', 'file-input', 'toggle', 'join', 'join-item'];

describe('daisyUI compatibility', () => {
	it('given the installed daisyUI then the preset resolves without throwing', async () => {
		await expect(presetDaisy({ logs: false })).resolves.toMatchObject({ name: 'unocss-preset-daisy' });
	});

	it('given the installed daisyUI then every core component is generated', async () => {
		const { rules, ...wind3 } = presetWind3();
		const uno = await createGenerator({
			presets: [
				await presetDaisy({ logs: false, themes: ['light'] }),
				{ ...wind3, rules: rules!.filter(([matcher]) => !['/^tab(?:-(.+))?$/', 'table'].includes(matcher.toString())) }
			],
			separators: [':']
		});

		const { css, matched } = await uno.generate(COMMON_COMPONENTS.join(' '), { preflights: true });

		expect(COMMON_COMPONENTS.filter((token) => !matched.has(token))).toEqual([]);
		expect(css).not.toContain('[object Object]');
		expect(css).not.toContain('--tw-');
	});
});
