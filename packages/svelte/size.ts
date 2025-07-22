import { readFileSync, unlinkSync } from 'node:fs';
import { build } from 'tsup';
import { sync } from 'brotli-size';

await build({
	entry: ['src/index.svelte.ts'],
	format: ['esm'],
	dts: false,
	external: ['svelte', 'svelte/reactivity'],
	outDir: 'temp-dist',
	minify: 'terser',
	silent: true,
	treeshake: 'recommended',
});

const file = readFileSync('temp-dist/index.svelte.js');
const size = sync(file);

unlinkSync('temp-dist/index.svelte.js');

console.log(size);
