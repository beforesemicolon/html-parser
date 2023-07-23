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

    return [...(node.childNodes ?? node.children)].map(node => stringifyNode(node)).join('')
  }

  return '';
}

// <head>
//   <meta charset="UTF-8">
// <meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
// <meta http-equiv="X-UA-Compatible" content="ie=edge">
//   <title>Document</title>
//   <link rel="stylesheet" href="style.css">
//   </head>
//   <body>
//   <!-- logo -->
//   <h1>Page</h1>
//
//   <script src="app.js" type="module"></script>
//   </body>

describe('parse', () => {
  const basicPageMarkup = `
    <!doctype html>
    <html lang="en">
      <head>
      
      </head>
      <body>
      
      </body>
    </html>
    `;

  it('should parse content and keep all white space intact', () => {
    const root = parse(basicPageMarkup);

    // expect(stringifyNode(root)).toEqual(``);
    console.log('-- done:', stringifyNode(root));
  });
  
  it('should ', () => {
    const pattern = /\d/;
    let match = null;
    let markup = 'ksadhjq3ujkshd3hjhjq2ds33d222n3---'
    
    while((match = pattern.exec(markup)) !== null) {
      console.log(markup);
      markup = markup.slice(match.index + match[0].length)
    }
    
    console.log('-- markup', markup);
  });
  
  describe('should handle self-closing tag', () => {
    it('when known HTML self closing tag ', () => {
      const root = parse('<meta charset="UTF-8">');

      expect(root.children.length).toBe(1);
      expect(root.children[0].tagName).toBe('META');
      expect(root.children[0].children.length).toBe(0);
      expect(root.children[0].attributes.getNamedItem('charset')?.value).toBe('UTF-8');
    });

    it('when custom/new self closing tag with a self closing slash', () => {
      const root = parse('<bfs-img src="img/circle" alt=""/>');

      expect(root.children.length).toBe(1);
      expect(root.children[0].tagName).toBe('BFS-IMG');
      expect(root.children[0].children.length).toBe(0);
      expect(root.children[0].attributes.getNamedItem('src')?.value).toBe('img/circle');
      expect(root.children[0].attributes.getNamedItem('alt')?.value).toBe('');
      expect(root.children[0].outerHTML).toBe('<bfs-img src="img/circle" alt=""></bfs-img>');
    });

    it('when repeated next to each other', () => {
      const root = parse('<meta charset="UTF-8">\n<meta http-equiv="X-UA-Compatible" content="ie=edge">');

      expect(root.children.length).toBe(2);
      expect(root.children[0].tagName).toBe('META');
      expect(root.children[1].tagName).toBe('META');
      expect(root.children[0].children.length).toBe(0);
      expect(root.children[1].children.length).toBe(0);
      expect(root.children[0].attributes.getNamedItem('charset')?.value).toBe('UTF-8');
      expect(root.children[1].attributes.getNamedItem('http-equiv')?.value).toBe('X-UA-Compatible');
      expect(root.children[1].attributes.getNamedItem('content')?.value).toBe('ie=edge');
      expect(stringifyNode(root)).toBe('<meta charset="UTF-8">\n' +
        '<meta http-equiv="X-UA-Compatible" content="ie=edge">');
    });

    it('when mixed of know html and custom self-closing tag', () => {
      const root = parse('<meta charset="UTF-8">\n<bfs-img src="img/circle" alt=""/>');

      expect(root.children.length).toBe(2);
      expect(root.children[0].tagName).toBe('META');
      expect(root.children[1].tagName).toBe('BFS-IMG');
      expect(root.children[0].children.length).toBe(0);
      expect(root.children[1].children.length).toBe(0);
      expect(root.children[0].attributes.getNamedItem('charset')?.value).toBe('UTF-8');
      expect(root.children[1].attributes.getNamedItem('src')?.value).toBe('img/circle');
      expect(root.children[1].attributes.getNamedItem('alt')?.value).toBe('');
      expect(stringifyNode(root)).toBe('<meta charset="UTF-8">\n' +
        '<bfs-img src="img/circle" alt=""></bfs-img>');
    });
  });

  describe('should handle open-closing tag', () => {
    it('when no inner content', () => {
      const root = parse('<p></p>');

      expect(root.children.length).toBe(1);
      expect(root.children[0].tagName).toBe('P');
      expect(root.children[0].children.length).toBe(0);
      expect(stringifyNode(root)).toBe('<p></p>');
    });

    it('with text inside', () => {
      const root = parse('<p>Lorem ipsum dolor.</p>');

      expect(root.children.length).toBe(1);
      expect(root.children[0].tagName).toBe('P');
      expect(root.children[0].children.length).toBe(0);
      expect(root.children[0].childNodes.length).toBe(1);
      expect(stringifyNode(root.children[0])).toBe('<p>Lorem ipsum dolor.</p>');
      expect(root.children[0].textContent).toBe('Lorem ipsum dolor.');
      expect(stringifyNode(root)).toBe('<p>Lorem ipsum dolor.</p>');
    });

    it('with comment inside', () => {
      const root = parse('<p><!-- content goes here --></p>');

      expect(root.children.length).toBe(1);
      expect(root.children[0].tagName).toBe('P');
      expect(root.children[0].children.length).toBe(0);
      expect(root.children[0].childNodes.length).toBe(1);
      expect(stringifyNode(root.children[0])).toBe('<p><!-- content goes here --></p>');
      expect(root.children[0].textContent).toBe('');
      expect(stringifyNode(root)).toBe('<p><!-- content goes here --></p>');
    });

    it('with self closing tag inside', () => {
      const root = parse('<head><meta charset="UTF-8"></head>');

      expect(root.children.length).toBe(1);
      expect(root.children[0].tagName).toBe('HEAD');
      expect(root.children[0].children.length).toBe(1);
      expect(root.children[0].childNodes.length).toBe(1);
      expect(stringifyNode(root.children[0])).toBe('<head><meta charset="UTF-8"></head>');
      expect(root.children[0].textContent).toBe('');
      expect(stringifyNode(root)).toBe('<head><meta charset="UTF-8"></head>');
    });

    it('with different open-closing tag inside', () => {
      const root = parse('<head><title>Some title</title></head>');

      expect(root.children.length).toBe(1);
      expect(root.children[0].tagName).toBe('HEAD');
      expect(root.children[0].children.length).toBe(1);
      expect(root.children[0].childNodes.length).toBe(1);
      expect(stringifyNode(root.children[0])).toBe('<head><title>Some title</title></head>');
      expect(root.children[0].textContent).toBe('Some title');
      expect(stringifyNode(root)).toBe('<head><title>Some title</title></head>');
    });

    it('with similar open-closing tag inside', () => {
      const root = parse('<div><div>Some title</div></div>');
      
      // expect(root.children.length).toBe(1);
      // expect(root.children[0].tagName).toBe('DIV');
      // expect(root.children[0].children.length).toBe(1);
      // expect(root.children[0].childNodes.length).toBe(1);
      // expect(stringifyNode(root.children[0])).toBe('<div><div>Some title</div></div>');
      // expect(root.children[0].textContent).toBe('Some title');
      // expect(stringifyNode(root)).toBe('<div><div>Some title</div></div>');
      console.log(stringifyNode(root));
    });

    it('when no closing slash is present', () => {
      const root = parse('<div><div>Some title<div><div>');

      expect(stringifyNode(root)).toBe('<div></div><div></div>Some title<div></div><div></div>');
    });

  });

  describe('should handle text', () => {
    it('when passed alone', () => {
      const root = parse('some text');

      expect(root.children.length).toBe(0);
      expect(root.childNodes[0].textContent).toBe('some text');
    });

    it('when in between tags', () => {
      const root = parse('some<hr/> text');

      expect(root.children.length).toBe(1);
      expect(root.childNodes.length).toBe(3);
      expect(root.textContent).toBe('some text');
    });

    it('when after a tag', () => {
      const root = parse('<hr/>some text');

      expect(root.children.length).toBe(1);
      expect(root.childNodes.length).toBe(2);
      expect(root.textContent).toBe('some text');
    });

    it('when before a tag', () => {
      const root = parse('some text<hr/>');

      expect(root.children.length).toBe(1);
      expect(root.childNodes.length).toBe(2);
      expect(root.textContent).toBe('some text');
    });
  });
  
  describe("should handle script tags", () => {
    it('when empty', () => {
      const root = parse('<script></script>');
      
      expect(root.children.length).toBe(1);
      expect(stringifyNode(root)).toBe('<script></script>');
    });
    
    it('when with content', () => {
      const htmlStr = `<script>console.log('works')</script>`
      const root = parse(htmlStr);
      
      expect(root.children.length).toBe(1);
      expect(stringifyNode(root)).toBe('<script>console.log(\'works\')</script>');
    });
    
    it('when with content and attributes', () => {
      const htmlStr = `<script type="module">console.log('works')</script>`
      const root = parse(htmlStr);
      
      expect(root.children.length).toBe(1);
      expect(stringifyNode(root)).toBe('<script type="module">console.log(\'works\')</script>');
    });
    
    it('when with html string in content', () => {
      const htmlStr = `<script type="module">const scriptStr = '<script>console.log("works")</script>';</script>`
      const root = parse(htmlStr);
      
      expect(root.children.length).toBe(1);
      expect(root.children[0].children.length).toBe(0);
      expect(stringifyNode(root)).toBe(`<script type="module">const scriptStr = '<script>console.log("works")</script>';</script>`);
    });
    
    it('when self-closed', () => {
      const root = parse('<script/>');
      
      expect(root.children.length).toBe(1);
      expect(root.children[0].children.length).toBe(0);
      expect(stringifyNode(root)).toBe('<script></script>');
    });
    
    it('when self-closed with attributes', () => {
      const root = parse('<script src="app.js" type="module"/>');
      
      expect(root.children.length).toBe(1);
      expect(root.children[0].children.length).toBe(0);
      expect(stringifyNode(root)).toBe('<script src="app.js" type="module"></script>');
    });
  })
  
  describe('should handle SVG tags', () => {})
  
  describe('should handle style tags', () => {})

})
