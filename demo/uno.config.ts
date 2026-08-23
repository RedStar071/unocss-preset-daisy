import { defineConfig, presetIcons, presetWind3 } from 'unocss';
import { presetDaisy } from '../src/index.js'; // '@redstar071/unocss-preset-daisy';

// preset-wind3 ships `tab`/`table` rules that collide with the daisyUI components of the same name
const { rules, ...preset } = presetWind3();

export default defineConfig({
	presets: [
		presetDaisy(),
		{ ...preset, rules: rules!.filter(([selector]) => !['/^tab(?:-(.+))?$/', 'table'].includes(selector.toString())) },
		presetIcons()
	],
	// preset-mini uses `-` as a variant separator too, which collides with e.g. `file-input`
	separators: [':']
});
