const jsdom = require("jsdom");
const {JSDOM} = jsdom;
global.document = new JSDOM('').window.document;

const fs = require('fs');
const Benchmark = require('htmlparser-benchmark');
const {parse} = require('./dist/parse');

const filesDir = '/Users/ecorreia/Sites/@beforesemicolon/html-parser/node_modules/htmlparser-benchmark/files';

// fs.readdir(filesDir, "utf-8", (err, files) => {
//   files.forEach(file => {
//     fs.readFile(`${filesDir}/${file}`, "utf-8", (_, content) => {
//       console.log('-- file', file);
//       parse(content, null, {strict: false});
//     })
//   })
// })

const node = (nodeName, textContent) => {
  const nodes = [];
  const children = [];
  const attributes = {};
  let value = '';
  
  return {
    type: "element",
    get children() {
      return children
    },
    get attributes() {
      return attributes;
    },
    setAttribute: (name, value) => {
      attributes[name] = value;
    },
    get lastElementChild() {
      return children.at(-1)
    },
    nodeName,
    get textContent() {
      return value;
    },
    set textContent(val) {
      value = val;
    },
    appendChild: (n) => {
      if (n.type === "type") {
        children.push(n)
      }
      
      nodes.push(n)
    }
  };
}

const bench = new Benchmark((html, callback) => {
  const root = parse(html, {
    createTextNode: (value) => ({type: "text", value}),
    createComment: (value) => ({type: "comment", value}),
    createDocumentFragment: () => node('frag'),
    createElementNS: (ns, tagName) => node(tagName),
  });
  console.log(JSON.stringify(root, null, 2));
  callback(null);
});

bench.on('error', (key) => {
  console.log('failed', err);
});

bench.on('progress', (key) => {
  console.log(`finished parsing ${key}.html`);
});

bench.on('result', (stat) => {
  console.log(
    `${stat.mean().toPrecision(6)} ms/file ± ${stat.sd().toPrecision(6)}`,
  );
});

// const file = '0227809b88a4c7a53db0c418d1a6182343c0b22b9122148baaa93d0a58856931.html'
// fs.readFile(`${filesDir}/${file}`, "utf-8", (_, content) => {
//   try {
//     parse(content);
//     console.log('-- done', file);
//   } catch (e) {
//     console.log(e);
//   }
// })
