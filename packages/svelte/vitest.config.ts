/// <reference types="@vitest/browser/providers/playwright" />
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [svelte()],
	optimizeDeps: {
		exclude: ['chromium-bidi', 'fsevents'],
	},
	test: {
		browser: {
			enabled: true,
			provider: 'playwright',
			headless: true,
			instances: [
				{
					browser: 'chromium',
				},
				{ browser: 'firefox' },
				{ browser: 'webkit' },
			],
		},

		coverage: {
			provider: 'v8',
		},

		testTimeout: 5000,
		// retry: 2,
		include: ['./tests/*.test.ts', './tests/*.test.svelte.ts'],
	},
});
