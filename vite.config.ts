import { defineConfig } from 'vite';

import wasm from 'vite-plugin-wasm';

export default defineConfig({
	plugins: [wasm()],
	optimizeDeps: {
		exclude: ['@openmeteo/file-reader', '@openmeteo/file-format-wasm']
	},
	base: '/omaps/',
	build: {
		chunkSizeWarningLimit: 1200,
		rollupOptions: {
			// input: {
			// 	worker: 'src/worker.ts',
			// 	index: 'src/main.ts',
			// 	om_protocol: 'src/om-protocol.ts'
			// },
			output: {
				entryFileNames: `[name].js`,
				chunkFileNames: `[name].js`,
				assetFileNames: `[name].[ext]`
			}
		}
	}
});
