import esbuild from 'esbuild';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';
import textReplace from 'esbuild-plugin-text-replace';
import * as fs from 'node:fs';
import * as path from 'node:path';
import postcss from 'postcss';
import cssnanoPlugin from 'cssnano';

const replaceModulesPlugin = {
	name: 'replace-modules',
	setup(build) {
		build.onResolve({ filter: /^(fast-glob|glob-parent|jiti)$/ }, (args) => ({
			path: args.path,
			namespace: 'replace-modules',
		}));

		build.onLoad({ filter: /.*/, namespace: 'replace-modules' }, (args) => {
			let contents = '';
			if (args.path === 'fast-glob') {
				contents = `
          module.exports = {
            sync: i => [].concat(i),
            generateTasks: i => [{
              dynamic: false,
              base: ".",
              negative: [],
              positive: [].concat(i),
              patterns: [].concat(i)
            }],
            escapePath: i => i
          };
        `;
			} else if (args.path === 'glob-parent') {
				contents = `module.exports = () => "";`;
			} else {
				contents = `module.exports = () => {};`;
			}
			return { contents, loader: 'js' };
		});
	},
};

const loadPreflightCss = async () => {
	const css = fs.readFileSync(path.resolve('./node_modules/tailwindcss/lib/css/preflight.css'), 'utf8');
	const res = await postcss([cssnanoPlugin({ preset: 'lite' })]).process(css, { from: false });
	return res.css.replace(/\n/g, '');
};

await esbuild.build({
	plugins: [
		NodeModulesPolyfillPlugin(),
		replaceModulesPlugin,
		textReplace({
			include: /.*\.js$/,
			pattern: [
				['_fs.default.readFileSync(_path.join(__dirname, "./css/preflight.css"), "utf8")', JSON.stringify(await loadPreflightCss())],
				['_fs.default.statSync(file).mtimeMs', 1],
				['_fs.default.promises.readFile(file, "utf8")', JSON.stringify('')],
			],
		}),
	],
	platform: 'browser',
	conditions: ['worker', 'browser'],
	entryPoints: ['./src/index.ts'],
	sourcemap: false,
	outfile: './dist/index.js',
	logLevel: 'warning',
	format: 'esm',
	target: 'es2020',
	bundle: true,
	minify: false,
});
