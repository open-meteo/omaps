import { defineConfig } from 'vite';

import dts from 'vite-plugin-dts';

// import { wasm } from '@rollup/plugin-wasm';

export default defineConfig({
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
			input: {
				'om-protocol': 'src/om-protocol.ts'
			},
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
