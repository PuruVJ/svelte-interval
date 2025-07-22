import { defineConfig } from 'tsup';

export default defineConfig([
	{
		entry: ['./src/index.svelte.ts'],
		format: 'esm',
		dts: true,
		external: ['svelte', 'svelte/reactivity'],
		clean: true,
		treeshake: 'recommended',
	},
]);
