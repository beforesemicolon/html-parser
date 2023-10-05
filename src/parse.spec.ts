import {parse} from './parse';

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
      const root = parse('<bfs-img src="img/circle" alt=""/>', document);
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
      const root = parse('<meta charset="UTF-8">\n<meta http-equiv="X-UA-Compatible" content="ie=edge">', document);
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
      const root = parse('<meta charset="UTF-8">\n<bfs-img src="img/circle" alt=""/>', document);
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
      const root = parse('<p></p>', document);
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
      const root = parse('<p>Lorem ipsum dolor.</p>', document);
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
      const root = parse('<p><!-- content goes here --></p>', document);
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
      const root = parse('<head><meta charset="UTF-8"></head>', document);
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
      const root = parse('<head><title>Some title</title></head>', document);
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
      const root = parse('<div><div>Some title</div></div>', document);
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
      const root = parse('<div><div>Some title<div><div>', document);
      const root2 = parse('<div><div>Some title<div><div>', document);
      
      expect(stringifyNode(root)).toBe('<div><div>Some title<div><div></div></div></div></div>');
      expect(stringifyNode(root2)).toBe('<div><div>Some title<div><div></div></div></div></div>');
    })

  });

  describe('should handle text', () => {
    it('when passed alone', () => {
      const root = parse('some text', document);
      const root2 = parse('some text', document);

      expect(root.children.length).toBe(0);
      expect(root2.children.length).toBe(0);
      expect(root.childNodes[0].textContent).toBe('some text');
      expect(root2.childNodes[0].textContent).toBe('some text');
    });

    it('when in around tags', () => {
      const root = parse('some<hr/> text', document);
      const root2 = parse('some<hr/> text', document);

      expect(root.children.length).toBe(1);
      expect(root2.children.length).toBe(1);
      expect(root.childNodes.length).toBe(3);
      expect(root2.childNodes.length).toBe(3);
      expect(root.textContent).toBe('some text');
      expect(root2.textContent).toBe('some text');
    });

    it('when after a tag', () => {
      const root = parse('<hr/>some text', document);
      const root2 = parse('<hr/>some text', document);

      expect(root.children.length).toBe(1);
      expect(root2.children.length).toBe(1);
      expect(root.childNodes.length).toBe(2);
      expect(root2.childNodes.length).toBe(2);
      expect(root.textContent).toBe('some text');
      expect(root2.textContent).toBe('some text');
    });

    it('when before a tag', () => {
      const root = parse('some text<hr/>', document);
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
      const root = parse(htmlStr, document);
      const root2 = parse(htmlStr, document);

      expect(root.children.length).toBe(1);
      expect(root2.children.length).toBe(1);
      expect(stringifyNode(root)).toBe('<script>console.log(\'works\')</script>');
      expect(stringifyNode(root2)).toBe('<script>console.log(\'works\')</script>');
    });

    it('when with content and attributes', () => {
      const htmlStr = `<script type="module">console.log('works')</script>`
      const root = parse(htmlStr, document);
      const root2 = parse(htmlStr, document);

      expect(root.children.length).toBe(1);
      expect(stringifyNode(root)).toBe('<script type="module">console.log(\'works\')</script>');
    });

    it('when with html string in content', () => {
      const htmlStr = `<script type="module">const scriptStr = '<script>console.log("works")</script>';</script>`
      const root = parse(htmlStr, document);
      const root2 = parse(htmlStr, document);

      expect(root.children.length).toBe(1);
      expect(root2.children.length).toBe(1);
      expect(root.children[0].children.length).toBe(0);
      expect(root2.children[0].children.length).toBe(0);
      expect(stringifyNode(root)).toBe(`<script type="module">const scriptStr = '<script>console.log("works")</script>';</script>`);
      expect(stringifyNode(root2)).toBe(`<script type="module">const scriptStr = '<script>console.log("works")</script>';</script>`);
    });

    it('when self-closed', () => {
      const root = parse('<script/>', document);
      const root2 = parse('<script/>', document);

      expect(root.children.length).toBe(1);
      expect(root2.children.length).toBe(1);
      expect(root.children[0].children.length).toBe(0);
      expect(root2.children[0].children.length).toBe(0);
      expect(stringifyNode(root)).toBe('<script></script>');
      expect(stringifyNode(root2)).toBe('<script></script>');
    });

    it('when self-closed with attributes', () => {
      const root = parse('<script src="app.js" type="module"/>', document);
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
      const root = parse('<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"></svg>', document);
      const root2 = parse('<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"></svg>', document);
      
      expect(root.children.length).toBe(1);
      expect(root2.children.length).toBe(1);
      expect(root.children[0].children.length).toBe(0);
      expect(root2.children[0].children.length).toBe(0);
      expect(stringifyNode(root)).toBe('<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"></svg>');
      expect(stringifyNode(root2)).toBe('<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"></svg>');
    });
    
    it('when with shapes inside', () => {
      const root = parse('<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"><circle cx="50" cy="50" r="40" /></svg>', document);
      const root2 = parse('<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"><circle cx="50" cy="50" r="40" /></svg>', document);
      
      expect(root.children.length).toBe(1);
      expect(root2.children.length).toBe(1);
      expect(root.children[0].children.length).toBe(1);
      expect(root2.children[0].children.length).toBe(1);
      expect(stringifyNode(root)).toBe('<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"><circle cx="50" cy="50" r="40"></circle></svg>');
      expect(stringifyNode(root2)).toBe('<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"><circle cx="50" cy="50" r="40"></circle></svg>');
    });
    
    it('when with other svg tag inside', () => {
      const root = parse('<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"><svg viewBox="0 0 10 10" x="200" width="100"><circle cx="5" cy="5" r="4" /></svg></svg>', document);
      const root2 = parse('<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"><svg viewBox="0 0 10 10" x="200" width="100"><circle cx="5" cy="5" r="4" /></svg></svg>', document);
      
      expect(root.children.length).toBe(1);
      expect(root2.children.length).toBe(1);
      expect(root.children[0].children.length).toBe(1);
      expect(root2.children[0].children.length).toBe(1);
      expect(root.children[0].children[0].children.length).toBe(1);
      expect(root2.children[0].children[0].children.length).toBe(1);
      expect(stringifyNode(root)).toBe('<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"><svg viewBox="0 0 10 10" x="200" width="100"><circle cx="5" cy="5" r="4"></circle></svg></svg>');
      expect(stringifyNode(root2)).toBe('<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"><svg viewBox="0 0 10 10" x="200" width="100"><circle cx="5" cy="5" r="4"></circle></svg></svg>');
    });
  })
  
  it('should handle namespace URI correctly', () => {
    const root = parse('<body><svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="black"><circle cx="50" cy="50" r="40" /></svg><p>sample</p></body>', document);
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
      const root = parse('<style></style>', document);
      const root2 = parse('<style></style>', document);
      
      expect(root.children.length).toBe(1);
      expect(root2.children.length).toBe(1);
      expect(stringifyNode(root)).toBe('<style></style>');
      expect(stringifyNode(root2)).toBe('<style></style>');
    });
    
    it('when with content', () => {
      const htmlStr = `<style>.sample {color: blue;}</style>`
      const root = parse(htmlStr, document);
      const root2 = parse(htmlStr, document);
      
      expect(root.children.length).toBe(1);
      expect(root2.children.length).toBe(1);
      expect(stringifyNode(root)).toBe('<style>.sample {color: blue;}</style>');
      expect(stringifyNode(root2)).toBe('<style>.sample {color: blue;}</style>');
    });
    
    it('when with content and attributes', () => {
      const htmlStr = `<style class="style">.sample {color: blue;}</style>`
      const root = parse(htmlStr, document);
      const root2 = parse(htmlStr, document);
      
      expect(root.children.length).toBe(1);
      expect(root2.children.length).toBe(1);
      expect(stringifyNode(root)).toBe('<style class="style">.sample {color: blue;}</style>');
      expect(stringifyNode(root2)).toBe('<style class="style">.sample {color: blue;}</style>');
    });
    
    it('when self-closed', () => {
      const root = parse('<style/>', document);
      const root2 = parse('<style/>', document);
      
      expect(root.children.length).toBe(1);
      expect(root2.children.length).toBe(1);
      expect(root.children[0].children.length).toBe(0);
      expect(root2.children[0].children.length).toBe(0);
      expect(stringifyNode(root)).toBe('<style></style>');
      expect(stringifyNode(root2)).toBe('<style></style>');
    });
    
    it('when self-closed with attributes', () => {
      const root = parse('<style id="style" />', document);
      const root2 = parse('<style id="style" />', document);
      
      expect(root.children.length).toBe(1);
      expect(root2.children.length).toBe(1);
      expect(root.children[0].children.length).toBe(0);
      expect(root2.children[0].children.length).toBe(0);
      expect(stringifyNode(root)).toBe('<style id="style"></style>');
      expect(stringifyNode(root2)).toBe('<style id="style"></style>');
    });
  })

})
