import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';

export interface Env {}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const res = await fetch(proxy(request.url), { method: request.method });
		if (!res.ok || !res.headers.get('content-type')?.includes('text/html')) return res;

		const detector = new DetectClassNames();
		await new HTMLRewriter().on(DetectClassNames.selector, detector).transform(res.clone()).arrayBuffer();

		const css = await buildTailwindCss([...detector.classNameSet]);

		return new HTMLRewriter().on(ReplaceStylesheet.selector, new ReplaceStylesheet(css)).transform(res);
	},
};

const buildTailwindCss = async (classNames: string[]) => {
	const { css } = await postcss([
		tailwindcss({
			plugins: [],
			content: ['/template.html'],
			safelist: classNames,
		}),
		autoprefixer({ remove: false }),
	]).process(`@tailwind base;@tailwind components;@tailwind utilities;`, { from: undefined });

	return css;
};

const proxy = (_url: string) => {
	const url = new URL(_url);
	url.protocol = 'https';
	url.hostname = '<your site hostname>';
	url.port = '';

	return url;
};

class DetectClassNames implements HTMLRewriterElementContentHandlers {
	static selector = '*';
	public classNameSet = new Set<string>();
	element(element: Element) {
		const classNames = element.getAttribute('class')?.split(' ') ?? [];
		classNames.forEach((c) => this.classNameSet.add(c));
	}
}

class ReplaceStylesheet implements HTMLRewriterElementContentHandlers {
	static selector = 'link[rel="stylesheet"]';
	private css = '';
	constructor(css: string) {
		this.css = css;
	}
	element(element: Element) {
		element.replace(`<style>${this.css}</style>`, { html: true });
	}
}
