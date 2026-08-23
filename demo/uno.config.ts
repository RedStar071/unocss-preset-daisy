import { defineConfig, presetIcons, presetWind3 } from 'unocss';
import { presetDaisy } from '../src/index.js'; // '@redstar071/unocss-preset-daisy';

export default defineConfig({
	// presetDaisy goes last so its components win the `filter` / `table` / `tab` / `collapse` name
	// clashes with preset-wind's utilities of the same name
	presets: [presetWind3(), presetDaisy(), presetIcons()],
	// preset-mini uses `-` as a variant separator too, which collides with e.g. `file-input`
	separators: [':']
});
