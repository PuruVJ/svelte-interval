#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { build } from 'tsup';
import { sync as brotliSize } from 'brotli-size';

interface BundleResult {
	exports: string[];
	size: number;
}

// Generate all combinations of exports
function getCombinations<T>(arr: T[]): T[][] {
	const result: T[][] = [];

	// Single combinations
	for (let i = 0; i < arr.length; i++) {
		result.push([arr[i]]);
	}

	// Double combinations
	for (let i = 0; i < arr.length; i++) {
		for (let j = i + 1; j < arr.length; j++) {
			result.push([arr[i], arr[j]]);
		}
	}

	// Triple combinations
	for (let i = 0; i < arr.length; i++) {
		for (let j = i + 1; j < arr.length; j++) {
			for (let k = j + 1; k < arr.length; k++) {
				result.push([arr[i], arr[j], arr[k]]);
			}
		}
	}

	return result;
}

async function createTempFile(exports: string[], index: number): Promise<string> {
	const tempDir = path.join(process.cwd(), 'size-temp');

	// Create size-temp directory if it doesn't exist
	if (!fs.existsSync(tempDir)) {
		await fs.promises.mkdir(tempDir, { recursive: true });
	}

	const filename = path.join(tempDir, `bundle-${index}.ts`);
	const content = exports
		.map((exp) => `export { ${exp} } from '../src/index.svelte.ts';`)
		.join('\n');

	await fs.promises.writeFile(filename, content);
	return filename;
}

async function bundleAndSize(tempFile: string): Promise<number> {
	const tempDir = path.dirname(tempFile);
	const basename = path.basename(tempFile, '.ts');
	const outFile = path.join(tempDir, `${basename}.js`);

	try {
		// Bundle with tsup and minify with terser
		await build({
			entry: [tempFile],
			format: ['esm'],
			minify: 'terser',
			outDir: tempDir,
			dts: false,
			silent: true,
			clean: false,
		});

		// Read the bundled file
		const bundleContent = await fs.promises.readFile(outFile);

		// Get brotli compressed size
		const size = brotliSize(bundleContent);

		// Cleanup
		await fs.promises.unlink(outFile);

		return size;
	} catch (error) {
		console.error(`Error bundling ${tempFile}:`, error);
		throw error;
	}
}

async function cleanup(files: string[]) {
	const tempDir = path.join(process.cwd(), 'size-temp');

	// Clean up individual files
	for (const file of files) {
		try {
			await fs.promises.unlink(file);
		} catch (e) {
			// Ignore cleanup errors
		}
	}

	// Remove the size-temp directory if it exists and is empty
	try {
		const dirContents = await fs.promises.readdir(tempDir);
		if (dirContents.length === 0) {
			await fs.promises.rmdir(tempDir);
		}
	} catch (e) {
		// Ignore cleanup errors
	}
}

function formatName(exports: string[]): string {
	if (exports.length === 1) {
		return exports[0];
	} else if (exports.length === 2) {
		return exports.join(' + ');
	} else {
		return 'Total Package';
	}
}

function generateMarkdown(results: BundleResult[]): string {
	let markdown = '';

	// Sort by number of exports (singles, doubles, triples)
	const singles = results.filter((r) => r.exports.length === 1);
	const doubles = results.filter((r) => r.exports.length === 2);
	const triples = results.filter((r) => r.exports.length === 3);

	// Singles
	for (const result of singles) {
		const name = formatName(result.exports);
		markdown += `- **${name}:** ~${result.size}B (minified + brotlied)\n`;
	}

	// Doubles
	for (const result of doubles) {
		const name = formatName(result.exports);
		markdown += `- **${name}:** ~${result.size}B (minified + brotlied)\n`;
	}

	// Triples (Total Package)
	for (const result of triples) {
		const name = formatName(result.exports);
		markdown += `- **${name}:** ~${result.size}B for all features\n`;
	}

	return markdown;
}

async function main() {
	const exports = ['Interval', 'LimitedInterval', 'sync'];
	const combinations = getCombinations(exports);
	const results: BundleResult[] = [];
	const tempFiles: string[] = [];

	console.log('Generating bundle size analysis...\n');

	try {
		for (let i = 0; i < combinations.length; i++) {
			const combo = combinations[i];
			console.log(`Analyzing: ${combo.join(' + ')}`);

			const tempFile = await createTempFile(combo, i);
			tempFiles.push(tempFile);

			const size = await bundleAndSize(tempFile);
			results.push({ exports: combo, size });

			console.log(`  Size: ${size}B (brotli compressed)\n`);
		}

		// Generate and display markdown
		console.log('='.repeat(50));
		console.log('MARKDOWN OUTPUT FOR README:');
		console.log('='.repeat(50));
		console.log();

		const markdown = generateMarkdown(results);
		console.log(markdown);

		// Also show a summary table
		console.log('\nSUMMARY TABLE:');
		console.log('-'.repeat(50));
		for (const result of results) {
			const name = formatName(result.exports);
			console.log(`${name.padEnd(25)} ${result.size.toString().padStart(8)}B`);
		}
	} catch (error) {
		console.error('Error during analysis:', error);
		process.exit(1);
	} finally {
		await cleanup(tempFiles);
	}
}

// Run the script
main().catch(console.error);
