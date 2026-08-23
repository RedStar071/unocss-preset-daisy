/**
 * daisyUI ships no type definitions for its plugin entry point, so the (stable) tailwind plugin
 * surface the preset relies on is declared here.
 */
declare module 'daisyui' {
	export interface DaisyPluginApi {
		addBase: (css: Record<string, unknown>) => void;
		addComponents: (css: Record<string, unknown>) => void;
		addUtilities: (css: Record<string, unknown>) => void;
		/** Only called by daisyUI >= 5.1 (`is-drawer-open` / `is-drawer-close`). */
		addVariant: (name: string, value: string[] | string) => void;
		/** Only called by daisyUI v4. */
		config: (key: string) => unknown;
	}

	export interface DaisyPlugin {
		config?: {
			theme?: Record<string, unknown> & { extend?: Record<string, unknown> };
		};
		handler: (api: DaisyPluginApi) => void;
	}

	/** daisyUI v5 exports `plugin.withOptions(…)`; daisyUI v4 exports the resolved plugin object. */
	const daisyui: DaisyPlugin | ((options?: unknown) => DaisyPlugin);
	export default daisyui;
}
