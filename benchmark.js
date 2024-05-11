const Benchmark = require('htmlparser-benchmark')
const { parse } = require('./dist') // run "npm run build" to obtain the dist folder

// const jsdom = require('jsdom')
// const { JSDOM } = jsdom
// const document = new JSDOM('').window.document

const bench = new Benchmark((html, callback) => {
    // parse(html, document)
    parse(html)
    callback()
})

bench.on('result', (stat) => {
    console.log(
        `${stat.mean().toPrecision(6)} ms/file ± ${stat.sd().toPrecision(6)}`
    )
})
