import {parse} from './parse.ts';

function stringifyNode(node: any): string {
	if (node) {
		if (node.nodeType === Node.ELEMENT_NODE) {
			return node.outerHTML;
		}

		if (node.nodeType === Node.TEXT_NODE) {
			return node.nodeValue;
		}

		if (node.nodeType === Node.COMMENT_NODE) {
			return `<!--${node.nodeValue}-->`;
		}

		return [...node.childNodes].map(node => stringifyNode(node)).join('')
	}

	return '';
}

describe('parse', () => {
	const basicPageMarkup = `
<!doctype>
<html lang="en">
  <head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Document</title>
    <link rel="stylesheet" href="style.css">
  </head>
  <body>
    some lose text at the top
    <!-- logo -->
    <h1>Page</h1>
    <script src="app.js" type="module">
      const x = '<script>console.log(12)</script>';
    </script>
    some lose text at the end
  </body>
</html>`;

	it('should parse content and keep all white space intact', () => {
		const root = parse(basicPageMarkup);
		const root2 = parse(basicPageMarkup, document);

		const res = `
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Document</title>
    <link rel="stylesheet" href="style.css">
  </head>
  <body>
    some lose text at the top
    <!-- logo -->
    <h1>Page</h1>
    <script src="app.js" type="module">
      const x = '<script>console.log(12)</script>';
    </script>
    some lose text at the end
  </body>
</html>`

		expect(stringifyNode(root)).toEqual(res);
		expect(stringifyNode(root2)).toEqual(res);
	});

	describe('should handle self-closing tag', () => {
		it('when known HTML self closing tag ', () => {
			const root = parse('<meta charset="UTF-8">');
			const root2 = parse('<meta charset="UTF-8">', document);

			expect(root.children.length).toBe(1);
			expect(root2.children.length).toBe(1);
			expect(root.children[0].tagName).toBe('META');
			expect(root2.children[0].tagName).toBe('META');
			expect(root.children[0].children.length).toBe(0);
			expect(root2.children[0].children.length).toBe(0);
			expect(root.children[0].attributes.getNamedItem('charset')?.value).toBe('UTF-8');
			expect(root2.children[0].attributes.getNamedItem('charset')?.value).toBe('UTF-8');
		});

		it('when custom/new self closing tag with a self closing slash', () => {
			const root = parse('<bfs-img src="img/circle" alt=""/>');
			const root2 = parse('<bfs-img src="img/circle" alt=""/>', document);

			expect(root2.children.length).toBe(1);
			expect(root.children.length).toBe(1);
			expect(root2.children[0].tagName).toBe('BFS-IMG');
			expect(root.children[0].tagName).toBe('BFS-IMG');
			expect(root2.children[0].children.length).toBe(0);
			expect(root.children[0].children.length).toBe(0);
			expect(root2.children[0].attributes.getNamedItem('src')?.value).toBe('img/circle');
			expect(root.children[0].attributes.getNamedItem('src')?.value).toBe('img/circle');
			expect(root2.children[0].attributes.getNamedItem('alt')?.value).toBe('');
			expect(root.children[0].attributes.getNamedItem('alt')?.value).toBe('');
			expect(root2.children[0].outerHTML).toBe('<bfs-img src="img/circle" alt=""></bfs-img>');
			expect(root.children[0].outerHTML).toBe('<bfs-img src="img/circle" alt=""></bfs-img>');
		});

		it('when repeated next to each other', () => {
			const root = parse('<meta charset="UTF-8">\n<meta http-equiv="X-UA-Compatible" content="ie=edge">');
			const root2 = parse('<meta charset="UTF-8">\n<meta http-equiv="X-UA-Compatible" content="ie=edge">', document);

			expect(root.children.length).toBe(2);
			expect(root2.children.length).toBe(2);
			expect(root.children[0].tagName).toBe('META');
			expect(root2.children[0].tagName).toBe('META');
			expect(root.children[1].tagName).toBe('META');
			expect(root2.children[1].tagName).toBe('META');
			expect(root.children[0].children.length).toBe(0);
			expect(root2.children[0].children.length).toBe(0);
			expect(root.children[1].children.length).toBe(0);
			expect(root2.children[1].children.length).toBe(0);
			expect(root.children[0].attributes.getNamedItem('charset')?.value).toBe('UTF-8');
			expect(root2.children[0].attributes.getNamedItem('charset')?.value).toBe('UTF-8');
			expect(root.children[1].attributes.getNamedItem('http-equiv')?.value).toBe('X-UA-Compatible');
			expect(root2.children[1].attributes.getNamedItem('http-equiv')?.value).toBe('X-UA-Compatible');
			expect(root.children[1].attributes.getNamedItem('content')?.value).toBe('ie=edge');
			expect(root2.children[1].attributes.getNamedItem('content')?.value).toBe('ie=edge');
			expect(stringifyNode(root)).toBe('<meta charset="UTF-8">\n<meta http-equiv="X-UA-Compatible" content="ie=edge">');
			expect(stringifyNode(root2)).toBe('<meta charset="UTF-8">\n<meta http-equiv="X-UA-Compatible" content="ie=edge">');
		});

		it('when mixed of know html and custom self-closing tag', () => {
			const root = parse('<meta charset="UTF-8">\n<bfs-img src="img/circle" alt=""/>');
			const root2 = parse('<meta charset="UTF-8">\n<bfs-img src="img/circle" alt=""/>', document);

			expect(root2.children.length).toBe(2);
			expect(root.children.length).toBe(2);
			expect(root2.children[0].tagName).toBe('META');
			expect(root.children[0].tagName).toBe('META');
			expect(root2.children[1].tagName).toBe('BFS-IMG');
			expect(root.children[1].tagName).toBe('BFS-IMG');
			expect(root2.children[0].children.length).toBe(0);
			expect(root.children[0].children.length).toBe(0);
			expect(root2.children[1].children.length).toBe(0);
			expect(root.children[1].children.length).toBe(0);
			expect(root2.children[0].attributes.getNamedItem('charset')?.value).toBe('UTF-8');
			expect(root.children[0].attributes.getNamedItem('charset')?.value).toBe('UTF-8');
			expect(root2.children[1].attributes.getNamedItem('src')?.value).toBe('img/circle');
			expect(root.children[1].attributes.getNamedItem('src')?.value).toBe('img/circle');
			expect(root2.children[1].attributes.getNamedItem('alt')?.value).toBe('');
			expect(root.children[1].attributes.getNamedItem('alt')?.value).toBe('');
			expect(stringifyNode(root2)).toBe('<meta charset="UTF-8">\n<bfs-img src="img/circle" alt=""></bfs-img>');
			expect(stringifyNode(root)).toBe('<meta charset="UTF-8">\n<bfs-img src="img/circle" alt=""></bfs-img>');
		});
	});

	describe('should handle open-closing tag', () => {
		it('when no inner content', () => {
			const root = parse('<p></p>');
			const root2 = parse('<p></p>', document);

			expect(root.children.length).toBe(1);
			expect(root2.children.length).toBe(1);
			expect(root.children[0].tagName).toBe('P');
			expect(root2.children[0].tagName).toBe('P');
			expect(root.children[0].children.length).toBe(0);
			expect(root2.children[0].children.length).toBe(0);
			expect(stringifyNode(root)).toBe('<p></p>');
			expect(stringifyNode(root2)).toBe('<p></p>');
		});

		it('with text inside', () => {
			const root = parse('<p>Lorem ipsum dolor.</p>');
			const root2 = parse('<p>Lorem ipsum dolor.</p>', document);

			expect(root.children.length).toBe(1);
			expect(root2.children.length).toBe(1);
			expect(root.children[0].tagName).toBe('P');
			expect(root2.children[0].tagName).toBe('P');
			expect(root.children[0].children.length).toBe(0);
			expect(root2.children[0].children.length).toBe(0);
			expect(root.children[0].childNodes.length).toBe(1);
			expect(root2.children[0].childNodes.length).toBe(1);
			expect(stringifyNode(root.children[0])).toBe('<p>Lorem ipsum dolor.</p>');
			expect(stringifyNode(root2.children[0])).toBe('<p>Lorem ipsum dolor.</p>');
			expect(root.children[0].textContent).toBe('Lorem ipsum dolor.');
			expect(root2.children[0].textContent).toBe('Lorem ipsum dolor.');
			expect(stringifyNode(root)).toBe('<p>Lorem ipsum dolor.</p>');
			expect(stringifyNode(root2)).toBe('<p>Lorem ipsum dolor.</p>');
		});

		it('with comment inside', () => {
			const root = parse('<p><!-- content goes here --></p>');
			const root2 = parse('<p><!-- content goes here --></p>', document);

			expect(root.children.length).toBe(1);
			expect(root2.children.length).toBe(1);
			expect(root.children[0].tagName).toBe('P');
			expect(root2.children[0].tagName).toBe('P');
			expect(root.children[0].children.length).toBe(0);
			expect(root2.children[0].children.length).toBe(0);
			expect(root.children[0].childNodes.length).toBe(1);
			expect(root2.children[0].childNodes.length).toBe(1);
			expect(stringifyNode(root.children[0])).toBe('<p><!-- content goes here --></p>');
			expect(stringifyNode(root2.children[0])).toBe('<p><!-- content goes here --></p>');
			expect(root.children[0].textContent).toBe('');
			expect(root2.children[0].textContent).toBe('');
			expect(stringifyNode(root)).toBe('<p><!-- content goes here --></p>');
			expect(stringifyNode(root2)).toBe('<p><!-- content goes here --></p>');
		});

		it('with self closing tag inside', () => {
			const root = parse('<head><meta charset="UTF-8"></head>');
			const root2 = parse('<head><meta charset="UTF-8"></head>', document);

			expect(root.children.length).toBe(1);
			expect(root2.children.length).toBe(1);
			expect(root.children[0].tagName).toBe('HEAD');
			expect(root2.children[0].tagName).toBe('HEAD');
			expect(root.children[0].children.length).toBe(1);
			expect(root2.children[0].children.length).toBe(1);
			expect(root.children[0].childNodes.length).toBe(1);
			expect(root2.children[0].childNodes.length).toBe(1);
			expect(stringifyNode(root.children[0])).toBe('<head><meta charset="UTF-8"></head>');
			expect(stringifyNode(root2.children[0])).toBe('<head><meta charset="UTF-8"></head>');
			expect(root.children[0].textContent).toBe('');
			expect(root2.children[0].textContent).toBe('');
			expect(stringifyNode(root)).toBe('<head><meta charset="UTF-8"></head>');
			expect(stringifyNode(root2)).toBe('<head><meta charset="UTF-8"></head>');
		});

		it('with different open-closing tag inside', () => {
			const root = parse('<head><title>Some title</title></head>');
			const root2 = parse('<head><title>Some title</title></head>', document);

			expect(root.children.length).toBe(1);
			expect(root2.children.length).toBe(1);
			expect(root.children[0].tagName).toBe('HEAD');
			expect(root2.children[0].tagName).toBe('HEAD');
			expect(root.children[0].children.length).toBe(1);
			expect(root2.children[0].children.length).toBe(1);
			expect(root.children[0].childNodes.length).toBe(1);
			expect(root2.children[0].childNodes.length).toBe(1);
			expect(stringifyNode(root.children[0])).toBe('<head><title>Some title</title></head>');
			expect(stringifyNode(root2.children[0])).toBe('<head><title>Some title</title></head>');
			expect(root.children[0].textContent).toBe('Some title');
			expect(root2.children[0].textContent).toBe('Some title');
			expect(stringifyNode(root)).toBe('<head><title>Some title</title></head>');
			expect(stringifyNode(root2)).toBe('<head><title>Some title</title></head>');
		});

		it('with similar open-closing tag inside', () => {
			const root = parse('<div><div>Some title</div></div>');
			const root2 = parse('<div><div>Some title</div></div>', document);

			expect(root.children.length).toBe(1);
			expect(root2.children.length).toBe(1);
			expect(root.children[0].tagName).toBe('DIV');
			expect(root2.children[0].tagName).toBe('DIV');
			expect(root.children[0].children.length).toBe(1);
			expect(root2.children[0].children.length).toBe(1);
			expect(root.children[0].childNodes.length).toBe(1);
			expect(root2.children[0].childNodes.length).toBe(1);
			expect(stringifyNode(root.children[0])).toBe('<div><div>Some title</div></div>');
			expect(stringifyNode(root2.children[0])).toBe('<div><div>Some title</div></div>');
			expect(root.children[0].textContent).toBe('Some title');
			expect(root2.children[0].textContent).toBe('Some title');
			expect(stringifyNode(root)).toBe('<div><div>Some title</div></div>');
			expect(stringifyNode(root2)).toBe('<div><div>Some title</div></div>');
		});

		it('when no closing slash is present', () => {
			const root = parse('<div><div>Some title<div><div>');
			const root2 = parse('<div><div>Some title<div><div>', document);

			expect(stringifyNode(root)).toBe('<div><div>Some title<div><div></div></div></div></div>');
			expect(stringifyNode(root2)).toBe('<div><div>Some title<div><div></div></div></div></div>');
		})

	});

	describe('should handle text', () => {
		it('when passed alone', () => {
			const root = parse('some text');
			const root2 = parse('some text', document);

			expect(root.children.length).toBe(0);
			expect(root2.children.length).toBe(0);
			expect(root.childNodes[0].nodeValue).toBe('some text');
			expect(root2.childNodes[0].nodeValue).toBe('some text');
		});

		it('when in around tags', () => {
			const root = parse('some<hr/> text');
			const root2 = parse('some<hr/> text', document);

			expect(root.children.length).toBe(1);
			expect(root2.children.length).toBe(1);
			expect(root.childNodes.length).toBe(3);
			expect(root2.childNodes.length).toBe(3);
			expect(root.textContent).toBe('some text');
			expect(root2.textContent).toBe('some text');
		});

		it('when after a tag', () => {
			const root = parse('<hr/>some text');
			const root2 = parse('<hr/>some text', document);

			expect(root.children.length).toBe(1);
			expect(root2.children.length).toBe(1);
			expect(root.childNodes.length).toBe(2);
			expect(root2.childNodes.length).toBe(2);
			expect(root.textContent).toBe('some text');
			expect(root2.textContent).toBe('some text');
		});

		it('when before a tag', () => {
			const root = parse('some text<hr/>');
			const root2 = parse('some text<hr/>', document);

			expect(root.children.length).toBe(1);
			expect(root2.children.length).toBe(1);
			expect(root.childNodes.length).toBe(2);
			expect(root2.childNodes.length).toBe(2);
			expect(root.textContent).toBe('some text');
			expect(root2.textContent).toBe('some text');
		});
	});

	describe("should handle script tags", () => {
		it('when empty', () => {
			const root = parse('<script></script>');
			const root2 = parse('<script></script>', document);

			expect(root.children.length).toBe(1);
			expect(root2.children.length).toBe(1);
			expect(stringifyNode(root)).toBe('<script></script>');
			expect(stringifyNode(root2)).toBe('<script></script>');
		});

		it('when with content', () => {
			const htmlStr = `<script>console.log('works')</script>`
			const root = parse(htmlStr);
			const root2 = parse(htmlStr, document);

			expect(root.children.length).toBe(1);
			expect(root2.children.length).toBe(1);
			expect(stringifyNode(root)).toBe('<script>console.log(\'works\')</script>');
			expect(stringifyNode(root2)).toBe('<script>console.log(\'works\')</script>');
		});

		it('when with content and attributes', () => {
			const htmlStr = `<script type="module">console.log('works')</script>`
			const root = parse(htmlStr);
			const root2 = parse(htmlStr, document);

			expect(root.children.length).toBe(1);
			expect(stringifyNode(root)).toBe('<script type="module">console.log(\'works\')</script>');
		});

		it('when with html string in content', () => {
			const htmlStr = `<script type="module">const scriptStr = '<script>console.log("works")</script>';</script>`
			const root = parse(htmlStr);
			const root2 = parse(htmlStr, document);

			expect(root.children.length).toBe(1);
			expect(root2.children.length).toBe(1);
			expect(root.children[0].children.length).toBe(0);
			expect(root2.children[0].children.length).toBe(0);
			expect(stringifyNode(root)).toBe(`<script type="module">const scriptStr = '<script>console.log("works")</script>';</script>`);
			expect(stringifyNode(root2)).toBe(`<script type="module">const scriptStr = '<script>console.log("works")</script>';</script>`);
		});

		it('when self-closed', () => {
			const root = parse('<script/>');
			const root2 = parse('<script/>', document);

			expect(root.children.length).toBe(1);
			expect(root2.children.length).toBe(1);
			expect(root.children[0].children.length).toBe(0);
			expect(root2.children[0].children.length).toBe(0);
			expect(stringifyNode(root)).toBe('<script></script>');
			expect(stringifyNode(root2)).toBe('<script></script>');
		});

		it('when self-closed with attributes', () => {
			const root = parse('<script src="app.js" type="module"/>');
			const root2 = parse('<script src="app.js" type="module"/>', document);

			expect(root.children.length).toBe(1);
			expect(root2.children.length).toBe(1);
			expect(root.children[0].children.length).toBe(0);
			expect(root2.children[0].children.length).toBe(0);
			expect(stringifyNode(root)).toBe('<script src="app.js" type="module"></script>');
			expect(stringifyNode(root2)).toBe('<script src="app.js" type="module"></script>');
		});
	})

	describe('should handle SVG tags', () => {
		it('when empty', () => {
			const root = parse('<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"></svg>');
			const root2 = parse('<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"></svg>', document);

			expect(root.children.length).toBe(1);
			expect(root.children[0].namespaceURI).toBe('http://www.w3.org/2000/svg');
			expect(root2.children.length).toBe(1);
			expect(root2.children[0].namespaceURI).toBe('http://www.w3.org/2000/svg');
			expect(root.children[0].children.length).toBe(0);
			expect(root2.children[0].children.length).toBe(0);
			expect(stringifyNode(root)).toBe('<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"></svg>');
			expect(stringifyNode(root2)).toBe('<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"></svg>');
		});

		it('when with shapes inside', () => {
			const root = parse('<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"><circle cx="50" cy="50" r="40" /></svg>');
			const root2 = parse('<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"><circle cx="50" cy="50" r="40" /></svg>', document);

			expect(root.children.length).toBe(1);
			expect(root.children[0].namespaceURI).toBe('http://www.w3.org/2000/svg');
			expect(root2.children.length).toBe(1);
			expect(root2.children[0].namespaceURI).toBe('http://www.w3.org/2000/svg');
			
			expect(root.children[0].children.length).toBe(1);
			expect(root.children[0].children[0].namespaceURI).toBe('http://www.w3.org/2000/svg');
			expect(root2.children[0].children.length).toBe(1);
			expect(root2.children[0].children[0].namespaceURI).toBe('http://www.w3.org/2000/svg');
			
			expect(stringifyNode(root)).toBe('<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"><circle cx="50" cy="50" r="40"></circle></svg>');
			expect(stringifyNode(root2)).toBe('<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"><circle cx="50" cy="50" r="40"></circle></svg>');
		});

		it('when with other svg tag inside', () => {
			const root = parse('<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"><svg viewBox="0 0 10 10" x="200" width="100"><circle cx="5" cy="5" r="4" /></svg></svg>');
			const root2 = parse('<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"><svg viewBox="0 0 10 10" x="200" width="100"><circle cx="5" cy="5" r="4" /></svg></svg>', document);
			
			expect(root.children.length).toBe(1);
			expect(root.children[0].namespaceURI).toBe('http://www.w3.org/2000/svg');
			expect(root2.children.length).toBe(1);
			expect(root2.children[0].namespaceURI).toBe('http://www.w3.org/2000/svg');
			
			expect(root.children[0].children.length).toBe(1);
			expect(root.children[0].children[0].namespaceURI).toBe('http://www.w3.org/2000/svg');
			expect(root2.children[0].children.length).toBe(1);
			expect(root2.children[0].children[0].namespaceURI).toBe('http://www.w3.org/2000/svg');
			
			expect(root.children[0].children[0].children.length).toBe(1);
			expect(root.children[0].children[0].children[0].namespaceURI).toBe('http://www.w3.org/2000/svg');
			expect(root2.children[0].children[0].children.length).toBe(1);
			expect(root2.children[0].children[0].children[0].namespaceURI).toBe('http://www.w3.org/2000/svg');
			
			expect(stringifyNode(root)).toBe('<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"><svg viewBox="0 0 10 10" x="200" width="100"><circle cx="5" cy="5" r="4"></circle></svg></svg>');
			expect(stringifyNode(root2)).toBe('<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"><svg viewBox="0 0 10 10" x="200" width="100"><circle cx="5" cy="5" r="4"></circle></svg></svg>');
		});
		
		it('with style tag inside', () => {
			const root = parse('<svg version="1.1" xmlns="http://www.w3.org/2000/svg"\n' +
					'\t viewBox="0 0 240 240" xml:space="preserve">\n' +
					'<style type="text/css">\n' +
					'\t.st0{fill-rule:evenodd;clip-rule:evenodd;}\n' +
					'</style>\n' +
					'<g>\n' +
					'\t<path class="st0" d="M60.7,116.9l33.7,39l98.6-117c7.4-7.9,19,0.5,13.2,9.5l-97,148.1c-7.4,9.5-17.4,10.5-25.8,1.1l-49-58.5\n' +
					'\t\tC24.9,125.4,49.1,105.9,60.7,116.9z"/>\n' +
					'</g>\n' +
					'</svg>' +
				'<p>some text</p>');
			const root2 = parse('<svg version="1.1" xmlns="http://www.w3.org/2000/svg"\n' +
				'\t viewBox="0 0 240 240" xml:space="preserve">\n' +
				'<style type="text/css">\n' +
				'\t.st0{fill-rule:evenodd;clip-rule:evenodd;}\n' +
				'</style>\n' +
				'<g>\n' +
				'\t<path class="st0" d="M60.7,116.9l33.7,39l98.6-117c7.4-7.9,19,0.5,13.2,9.5l-97,148.1c-7.4,9.5-17.4,10.5-25.8,1.1l-49-58.5\n' +
				'\t\tC24.9,125.4,49.1,105.9,60.7,116.9z"/>\n' +
				'</g>\n' +
				'</svg>' + '<p>some text</p>', document);
			
			const svg = root.children[0];
			const p = root.children[1];
			const style = svg.children[0];
			const g = svg.children[1];
			const path = g.children[0];
			
			expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg')
			expect(p.namespaceURI).toBe('http://www.w3.org/1999/xhtml')
			expect(style.namespaceURI).toBe('http://www.w3.org/2000/svg')
			expect(g.namespaceURI).toBe('http://www.w3.org/2000/svg')
			expect(path.namespaceURI).toBe('http://www.w3.org/2000/svg')
			
			const svg2 = root2.children[0];
			const p2 = root2.children[1];
			const style2 = svg2.children[0];
			const g2 = svg2.children[1];
			const path2 = g2.children[0];
			
			expect(svg2.namespaceURI).toBe('http://www.w3.org/2000/svg')
			expect(p2.namespaceURI).toBe('http://www.w3.org/1999/xhtml')
			expect(style2.namespaceURI).toBe('http://www.w3.org/2000/svg')
			expect(g2.namespaceURI).toBe('http://www.w3.org/2000/svg')
			expect(path2.namespaceURI).toBe('http://www.w3.org/2000/svg')
		
		});
	})

	it('should handle namespace URI correctly', () => {
		const root = parse('<body><svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"><circle cx="50" cy="50" r="40" /></svg><p>sample</p></body>');
		const root2 = parse('<body><svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"><circle cx="50" cy="50" r="40" /></svg><p>sample</p></body>', document);

		expect(root.children[0].namespaceURI).toBe('http://www.w3.org/1999/xhtml');
		expect(root2.children[0].namespaceURI).toBe('http://www.w3.org/1999/xhtml');
		expect(root.children[0].children[0].namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(root2.children[0].children[0].namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(root.children[0].children[0].children[0].namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(root2.children[0].children[0].children[0].namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(root.children[0].children[1].namespaceURI).toBe('http://www.w3.org/1999/xhtml');
		expect(root2.children[0].children[1].namespaceURI).toBe('http://www.w3.org/1999/xhtml');
	});

	describe('should handle style tags', () => {
		it('when empty', () => {
			const root = parse('<style></style>');
			const root2 = parse('<style></style>', document);

			expect(root.children.length).toBe(1);
			expect(root2.children.length).toBe(1);
			expect(stringifyNode(root)).toBe('<style></style>');
			expect(stringifyNode(root2)).toBe('<style></style>');
		});

		it('when with content', () => {
			const htmlStr = `<style>.sample {color: blue;}</style>`
			const root = parse(htmlStr);
			const root2 = parse(htmlStr, document);

			expect(root.children.length).toBe(1);
			expect(root2.children.length).toBe(1);
			expect(stringifyNode(root)).toBe('<style>.sample {color: blue;}</style>');
			expect(stringifyNode(root2)).toBe('<style>.sample {color: blue;}</style>');
		});

		it('when with content and attributes', () => {
			const htmlStr = `<style class="style">.sample {color: blue;}</style>`
			const root = parse(htmlStr);
			const root2 = parse(htmlStr, document);

			expect(root.children.length).toBe(1);
			expect(root2.children.length).toBe(1);
			expect(stringifyNode(root)).toBe('<style class="style">.sample {color: blue;}</style>');
			expect(stringifyNode(root2)).toBe('<style class="style">.sample {color: blue;}</style>');
		});

		it('when self-closed', () => {
			const root = parse('<style/>');
			const root2 = parse('<style/>', document);

			expect(root.children.length).toBe(1);
			expect(root2.children.length).toBe(1);
			expect(root.children[0].children.length).toBe(0);
			expect(root2.children[0].children.length).toBe(0);
			expect(stringifyNode(root)).toBe('<style></style>');
			expect(stringifyNode(root2)).toBe('<style></style>');
		});

		it('when self-closed with attributes', () => {
			const root = parse('<style id="style" />');
			const root2 = parse('<style id="style" />', document);

			expect(root.children.length).toBe(1);
			expect(root2.children.length).toBe(1);
			expect(root.children[0].children.length).toBe(0);
			expect(root2.children[0].children.length).toBe(0);
			expect(stringifyNode(root)).toBe('<style id="style"></style>');
			expect(stringifyNode(root2)).toBe('<style id="style"></style>');
		});
	})

	it('should handle commented out HTML', () => {
		const root = parse('<!-- <style id="style" /> -->');
		const root2 = parse('<!-- <style id="style" /> -->', document);

		expect(stringifyNode(root)).toBe('<!-- <style id="style" /> -->');
		expect(stringifyNode(root2)).toBe('<!-- <style id="style" /> -->');
	});

	it('should handle callback', () => {
		const nodeCallback = jest.fn();
		const root = parse(basicPageMarkup, nodeCallback);

		expect(nodeCallback).toHaveBeenCalledTimes(27)
		expect(nodeCallback).toHaveBeenCalledWith(root.children[0])
	});

	it('should handle custom handler', () => {
		const root = parse<Record<string, unknown>>(basicPageMarkup, {
			createComment: (value: string) => ({type: 'comment', value}),
			createTextNode: (value: string) => ({type: 'text', value}),
			createDocumentFragment: () => {
				const children: unknown[] = []

				return {
					type: 'fragment',
					children,
					appendChild: (node: unknown) => {
						children.push(node)
					}
				}
			},
			createElementNS: (namespace: string, tagName: string) => {
				const children: unknown[] = []
				const attributes: Record<string, unknown> = {}

				return {
					namespace,
					tagName,
					children,
					attributes,
					type: 'node',
					appendChild(node: unknown) {
						children.push(node)
					},
					setAttribute(name: string, value: string) {
						attributes[name] = value;
					}
				}
			},
		});

		expect(root).toEqual({
			"appendChild": expect.any(Function),
			"children": [
				{
					"type": "text",
					"value": "\n"
				},
				{
					"appendChild": expect.any(Function),
					"attributes": {
						"lang": "en"
					},
					"children": [
						{
							"type": "text",
							"value": "\n  "
						},
						{
							"appendChild": expect.any(Function),
							"attributes": {},
							"children": [
								{
									"type": "text",
									"value": "\n    "
								},
								{
									"appendChild": expect.any(Function),
									"attributes": {
										"charset": "UTF-8"
									},
									"children": [],
									"namespace": "http://www.w3.org/1999/xhtml",
									"setAttribute": expect.any(Function),
									"tagName": "meta",
									"type": "node"
								},
								{
									"type": "text",
									"value": "\n    "
								},
								{
									"appendChild": expect.any(Function),
									"attributes": {
										"content": "width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0",
										"name": "viewport"
									},
									"children": [],
									"namespace": "http://www.w3.org/1999/xhtml",
									"setAttribute": expect.any(Function),
									"tagName": "meta",
									"type": "node"
								},
								{
									"type": "text",
									"value": "\n    "
								},
								{
									"appendChild": expect.any(Function),
									"attributes": {
										"content": "ie=edge",
										"http-equiv": "X-UA-Compatible"
									},
									"children": [],
									"namespace": "http://www.w3.org/1999/xhtml",
									"setAttribute": expect.any(Function),
									"tagName": "meta",
									"type": "node"
								},
								{
									"type": "text",
									"value": "\n    "
								},
								{
									"appendChild": expect.any(Function),
									"attributes": {},
									"children": [
										{
											"type": "text",
											"value": "Document"
										}
									],
									"namespace": "http://www.w3.org/1999/xhtml",
									"setAttribute": expect.any(Function),
									"tagName": "title",
									"type": "node"
								},
								{
									"type": "text",
									"value": "\n    "
								},
								{
									"appendChild": expect.any(Function),
									"attributes": {
										"href": "style.css",
										"rel": "stylesheet"
									},
									"children": [],
									"namespace": "http://www.w3.org/1999/xhtml",
									"setAttribute": expect.any(Function),
									"tagName": "link",
									"type": "node"
								},
								{
									"type": "text",
									"value": "\n  "
								}
							],
							"namespace": "http://www.w3.org/1999/xhtml",
							"setAttribute": expect.any(Function),
							"tagName": "head",
							"type": "node"
						},
						{
							"type": "text",
							"value": "\n  "
						},
						{
							"appendChild": expect.any(Function),
							"attributes": {},
							"children": [
								{
									"type": "text",
									"value": "\n    some lose text at the top\n    "
								},
								{
									"type": "comment",
									"value": " logo "
								},
								{
									"type": "text",
									"value": "\n    "
								},
								{
									"appendChild": expect.any(Function),
									"attributes": {},
									"children": [
										{
											"type": "text",
											"value": "Page"
										}
									],
									"namespace": "http://www.w3.org/1999/xhtml",
									"setAttribute": expect.any(Function),
									"tagName": "h1",
									"type": "node"
								},
								{
									"type": "text",
									"value": "\n    "
								},
								{
									"appendChild": expect.any(Function),
									"attributes": {
										"src": "app.js",
										"type": "module"
									},
									"children": [
										{
											"type": "text",
											"value": "\n      const x = '<script>console.log(12)</script>';\n    "
										}
									],
									"namespace": "http://www.w3.org/1999/xhtml",
									"setAttribute": expect.any(Function),
									"tagName": "script",
									"type": "node"
								},
								{
									"type": "text",
									"value": "\n    some lose text at the end\n  "
								}
							],
							"namespace": "http://www.w3.org/1999/xhtml",
							"setAttribute": expect.any(Function),
							"tagName": "body",
							"type": "node"
						},
						{
							"type": "text",
							"value": "\n"
						}
					],
					"namespace": "http://www.w3.org/1999/xhtml",
					"setAttribute": expect.any(Function),
					"tagName": "html",
					"type": "node"
				}
			],
			"type": "fragment"
		})
	});
	
	it('should parse noscript', () => {
		const root = parse('<noscript><p>hello world</p></noscript>');
		const root2 = parse('<noscript><p>hello world</p></noscript>', document);
		
		const res = `<noscript><p>hello world</p></noscript>`
		
		expect(stringifyNode(root)).toEqual(res);
		expect(stringifyNode(root2)).toEqual(res);
		
		expect(root.children).toHaveLength(1)
		expect(root.children[0].children).toHaveLength(1)
	});
})
