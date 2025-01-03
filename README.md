# HTML Parser
HTML parser for any Javascript runtime environment. Small, Fast, Easy to use, and highly customizable

[![npm](https://img.shields.io/npm/v/%40beforesemicolon%2Fhtml-parser)](https://www.npmjs.com/package/@beforesemicolon/html-parser)
![npm](https://img.shields.io/npm/l/%40beforesemicolon%2Fhtml-parser)
[![Test](https://github.com/beforesemicolon/html-parser/actions/workflows/test.yml/badge.svg?branch=master)](https://github.com/beforesemicolon/html-parser/actions/workflows/test.yml)

## Motivation
Most HTML parsers will force you to learn their Javascript API after the parse result. 
They won't allow you to tap into the processing to access the nodes as they are parsed or let you create your own API 
for the final result that adapts to your project instead of the other way around.

This parser
- Is one of the fastest HTML parser out there averaging 1ms per HTML page of different sizes. Check [benchmark](#benchmark).
- Uses a DOM like API which is a custom Lite DOM built for performance
- Can use browser DOM API or JsDOM to give you the parsed HTML allowing it to be used in any js runtime environment
- You can use your own [custom DOM API](#creating-your-custom-handler) like to gain absolute control
- Accepts a callback, so you can access the nodes as they are being parsed
- Super simple to use. No need for extensive options list. Parses everything in a performant way
- Handles SVG and HTML easily including comments and script tags with HTML inside

## Install 

#### Node
```
npm install @beforesemicolon/html-parser
```

#### Browser

```html
<!DOCTYPE html>
<html lang="en">
<head>

  <!-- Grab the latest version -->
  <script src="https://unpkg.com/@beforesemicolon/html-parser/dist/client.js"></script>

  <!-- Or a specific version -->
  <script src="https://unpkg.com/@beforesemicolon/html-parser@1.0.0/dist/client.js"></script>

</head>
<body></body>
</html>
```

###### Good to know
- Only works with HTML and SVG tags. Duh!
- Handles custom tags, style, script tags and comments by default without differences in the performance
- `<!Doctype>` tag is ignored
- Honor the format by keeping all white spaces which are returned as text nodes

### Usage
By default, it will return a document fragment as root. The API is DOM-like, meaning, if you know the DOM
API you already know this. The DOM-like API is minimal and built for performance allowing you to easily
use the same code in the browser, Node, Deno or any other javascript runtime environment.

See [custom handler section](#creating-your-custom-handler) to understand what this Document-like API looks like.

```js
import {parse} from "@beforesemicolon/html-parser";

const frag = parse('<h1>site title</h1>'); // return DocumentFragment-like object

frag.children[0] // h1 Element
```

This parser works with the [DOM API](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model) by default so if you want to use it in Node, Deno or any Javascript runtime environment,
make sure to import [jsDom](https://www.npmjs.com/package/jsdom) or similar and provide the [Document](https://developer.mozilla.org/en-US/docs/Web/API/Document) object.
```js
import * as jsdom from "jsdom";
const {JSDOM} = jsdom;
const document = new JSDOM('').window.document;

// import the parser
import {parse} from "@beforesemicolon/html-parser";

const frag = parse('<h1>site title</h1>', document); // return DocumentFragment

frag.children[0] // h1 Element
```

#### Browser

```html
<script>
  const {parse, Doc} = window.BFS;
  
  // uses a like Document-like object by default
  const frag1 = parse('<h1>site title</h1>'); // returns DocumentFragment-like
  
  // use the native DOM Document object
  const frag2 = parse('<h1>site title</h1>', document); // returns DocumentFragment object
  
  frag1.children[0] // h1 Element
  frag2.children[0] // h1 Element
</script>
```

#### Callback option
You may also pass a callback function as second parameter which will get called as the nodes are being parsed
and created. This will use the document as default so the callback will be get called with DOM Nodes and Element.

```js
const frag = parse('<h1>site title</h1>', (node) => {
  // handle node here
});
```

### Benchmark
The parser itself if fast but depending on the API you use for the final parsed result the performance will varies
on their algorithm. Here are two examples using [htmlparser-benchmark](https://github.com/AndreasMadsen/htmlparser-benchmark).

```ts
import {parse} from "@beforesemicolon/html-parser";

parse(aReallyMassimeHTMLString);
// avg duration: 1.86113 ms/file ± 1.09698
```
This is up to 30 times faster than the DOM Document API

#### Using jsdom Document
This is using the custom [jsDom](https://www.npmjs.com/package/jsdom) in NodeJs:

```ts
import * as jsdom from "jsdom";
import {parse} from "@beforesemicolon/html-parser";

const {JSDOM} = jsdom;
const document = new JSDOM('').window.document;

parse(aReallyMassimeHTMLString, document);
// avg duration: 27.3563 ms/file ± 19.1060`
```

### Creating your custom handler
The best thing about this parser is the ability to crate your own handler
to transform HTML into anything you like.

Here is an example of a simple implementation you can start from.

```ts
const MyCustomDoc = {
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
	createElementNS: (namespaceURI: string, tagName: string) => {
		const children: unknown[] = []
		const attributes: Record<string, unknown> = {}

		return {
			namespaceURI, // important to ALWAYS include
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
}

const result = parse<typeof MyCustomDoc>(`...`, MyCustomDoc);
```
