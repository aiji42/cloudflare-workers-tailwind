import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';

export interface Env {}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const { css } = await postcss([
			tailwindcss({
				plugins: [],
				content: ['/template.html'],
				safelist: ['bg-red-500', 'text-red-200'],
			}),
			autoprefixer({ remove: false }),
		]).process(`@tailwind base;@tailwind components;@tailwind utilities;`, { from: undefined });

		return new Response(css);
	},
};
