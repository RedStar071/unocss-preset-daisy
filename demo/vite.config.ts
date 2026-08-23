import type { UserConfig } from 'vite';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import unocss from 'unocss/vite';
import pkgJson from '../package.json' with { type: 'json' };

const { version } = pkgJson as { version: string };
process.env.VITE_VERSION = version;

export default {
	base: process.env.BASE_URL ?? '/',
	// `vite build demo` runs from the repo root, so point UnoCSS at the demo config explicitly
	plugins: [unocss({ configFile: fileURLToPath(new URL('./uno.config.ts', import.meta.url)) })]
} as UserConfig;
