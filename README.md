# HTML Parser
Simple, Fast, flexible, and lightweight HTML parser for Server and Browser parsing.

Official HTML parser for [@beforesemicolon/html](https://www.npmjs.com/package/@beforesemicolon/html) and [@beforesemicolon/cube](https://www.npmjs.com/package/@beforesemicolon/cube)

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
  <script src="https://unpkg.com/@beforesemicolon/html-parser/dist/parser-client.min.js"></script>

  <!-- Or a specific version -->
  <script src="https://unpkg.com/@beforesemicolon/html-parser@1.0.0/dist/parser-client.min.js"></script>

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
You can import the `DocumentLike` type and use as guide but in general, the parser expect
just a Document and Elements with the following fields.

Feel free to implement things however you like to fit your project. It is up to you.

```ts
interface NodeLike {
	readonly nodeType: number;
	readonly nodeName: string;
	nodeValue: string;
}

interface CommentLike extends NodeLike {}

interface TextLike extends NodeLike {}

interface ElementLike extends NodeLike {
	readonly tagName: string;
	outerHTML: string; // not needed during parsing
    textContent: string;
    childNodes: Array<NodeLike>;
    children: Array<ElementLike>;
    attributes: NamedNodeMapLike;
    setAttribute: (name: string, value?: string) => void;
    appendChild: (node: NodeLike | ElementLike | DocumentFragmentLike) => void;
}


interface DocumentFragmentLike extends Omit<ElementLike, 'outerHTML', 'setAttribute', 'attributes', 'textContent'> {
}

interface CustomDoc {
    createTextNode: (nodeValue: string) => TextLike;
    createComment: (nodeValue: string) => CommentLike;
    createDocumentFragment: () => DocumentFragmentLik;
    createElementNS: (ns: string, nodeName: string) => ElementLike;
}

const MyCustomDocument: CustomDoc = {
	// logic here
} 
```
