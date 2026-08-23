import { defineConfig } from 'tsdown';

export default defineConfig({
	attw: {
		enabled: true,
		entrypoints: ['.'],
		level: 'error',
		profile: 'esm-only'
	},
	clean: true,
	deps: { neverBundle: true },
	dts: true,
	entry: ['src/index.ts'],
	format: 'esm',
	minify: false,
	// the package is `type: module`, so plain `.js` / `.d.ts` is unambiguous
	outExtensions: () => ({ dts: '.d.ts', js: '.js' }),
	publint: {
		enabled: true,
		level: 'error'
	},
	sourcemap: true,
	target: 'es2022',
	treeshake: true,
	tsconfig: './tsconfig.build.json'
});
