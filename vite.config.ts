import { defineConfig } from 'vite';

import wasm from 'vite-plugin-wasm';

export default defineConfig({
	plugins: [wasm()],
	optimizeDeps: {
		exclude: ['@openmeteo/file-reader', '@openmeteo/file-format-wasm']
	}
});
