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
//       try {
//         parse(content);
//         console.log('-- done', file);
//       } catch (e) {
//         console.log(e);
//       }
//     })
//   })
// })

const bench = new Benchmark((html, callback) => {
  try {
    parse(html);
  } catch(e) {
    console.log(e);
  }
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
