import { defineConfig, loadEnv } from 'vite';

import dts from 'vite-plugin-dts';

// import { wasm } from '@rollup/plugin-wasm';

export default ({ mode }) => {
	process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };
	const input =
		process.env.GH_PAGES === 'true'
			? {
					index: 'src/main.ts'
				}
			: {
					'om-protocol': 'src/om-protocol.ts'
				};
	return defineConfig({
		plugins: [
			dts({
				insertTypesEntry: true
			})
		],
		optimizeDeps: {
			exclude: ['@openmeteo/file-reader', '@openmeteo/file-format-wasm']
		},
		base: '/omaps/',
		build: {
			chunkSizeWarningLimit: 1200,
			rollupOptions: {
				input: input,
				output: {
					entryFileNames: `[name].js`,
					chunkFileNames: `[name].js`,
					assetFileNames: `[name].[ext]`,

					name: 'MaplibreOMProtocol',
					format: 'umd',
					sourcemap: true,
					inlineDynamicImports: true
				},
				preserveEntrySignatures: 'strict'
			},
			minify: false
		}
	});
};
