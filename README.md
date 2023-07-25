# HTML Parser
Simple, Fast, flexible, and lightweight HTML parser for Server and Browser parsing.

Official HTML parser for [@beforesemicolon/html](https://www.npmjs.com/package/@beforesemicolon/html) and [@beforesemicolon/cube](https://www.npmjs.com/package/@beforesemicolon/cube)

## Motivation
Most HTML parsers will force you to learn their Javascript API after the parse result. They won't allow you to tap into the processing
by accessing the nodes as they are parsed or let you create your own API for the final result thats adapts to
your project instead of the other way around.

This parser
- Uses to DOM API by default to give you the parsed HTML, but you can also provide your own API. It also provides an optional lite document API if you're really striving for performance.
- Accepts a callback, so you can access the nodes as they are being parsed
- It's really fast by default. Performance will vary depending on the API you use for the parsed API. Check [benchmark](#benchmark).
- Super simple to use. No need for extensive options list

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
- Warns when tags are opened and not closed

### Usage

#### Node

You can use the `Doc` that comes with the parser but not used by default. This is a very minimal representation of the 
DOM api created to offer the best parsing performance.
```js
import {Doc, parse} from "@beforesemicolon/html-parser";

const frag = parse('<h1>site title</h1>', Doc); // return DocumentFragment-like object

frag.children[0] // h1 Element
```

This parser works with the [DOM API](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model) by default so if you want to use it node or deno, make sure to import [jsDom](https://www.npmjs.com/package/jsdom)
and make the document global in the file before calling `parse`.
```js
// make sure jsdom is present because this parser uses Document by default
import * as jsdom from "jsdom";
const {JSDOM} = jsdom;
global.document = new JSDOM('').window.document;

// import the parser
import {parse} from "@beforesemicolon/html-parser";

const frag = parse('<h1>site title</h1>'); // return DocumentFragment

frag.children[0] // h1 Element
```

#### Browser

```html
<script>
  const {parse, Doc} = window.BFS;
  
  const frag1 = parse('<h1>site title</h1>'); // returns DocumentFragment
  const frag2 = parse('<h1>site title</h1>', Doc); // returns DocumentFragment-like object
  
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

#### Using Custom Handler
This is using the custom `Doc` lite DOM document API you can import and use:

```ts
import {Doc, parse} from "@beforesemicolon/html-parser";

parse(aReallyMassimeHTMLString, Doc);
// performance: 2.52784 ms/file ± 1.62924
```

#### Using JsDOM
This is using the custom [jsDom](https://www.npmjs.com/package/jsdom) in nodejs:

```ts
import * as jsdom from "jsdom";
import {parse} from "@beforesemicolon/html-parser";

const {JSDOM} = jsdom;
global.document = new JSDOM('').window.document;

parse(aReallyMassimeHTMLString); // uses document by default like in browsers
// performance: 27.3563 ms/file ± 19.1060`
```

### Creating your custom handler
The `Doc` object exposed is actually very simple. Simply return an object of the following format/type. All logic is 
up to you.

```ts
interface CustomNode {
    readonly type: "element" | "text" | "comment";
    readonly nodeName: "#fragment" | "#text" | "#comment" | string;
    value?: string;
    readonly textContent?: string;
    readonly childNodes?: Array<CustomNode>;
    readonly children?: Array<CustomNode>;
    readonly lastElementChild?: CustomNode;
    readonly attributes?: Record<string, string>;
    setAttribute?: (name: string, value?: string) => void;
    appendChild?: (node: CustomNode) => void;
}

interface CustomDoc {
    createTextNode: (value: string) => ({type: "text", value: string, nodeName: "#text"});
    createComment: (value: string) => ({type: "comment", value: string, nodeName: "#comment"});
    createDocumentFragment: () => CustomNode;
    createElementNS: (ns: string, tagName: string) => CustomNode;
}

const Doc: CustomDoc = {...} // logic here
```
