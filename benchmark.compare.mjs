import { performance } from 'node:perf_hooks'
import { parse as beforeParse } from '/tmp/html-parser-baseline.mjs'
import { parse as afterParse } from '/tmp/html-parser-after.mjs'

const repeated = (count, create) =>
    Array.from({ length: count }, (_, index) => create(index)).join('')

const cases = {
    small: '<div class="card"><h2>Title</h2><p>Short body</p></div>',
    attributes: repeated(
        30,
        (index) =>
            `<section id="item-${index}" data-label="value > ${index}" hidden>` +
            `<input type="text" value="item-${index}"><span>Label ${index}</span></section>`
    ),
    medium: repeated(
        100,
        (index) =>
            `<article class="card" data-index="${index}"><header><h2>Title ${index}</h2></header>` +
            `<p>Body text for item ${index}</p><!-- marker --><img src="/${index}.jpg" alt="Image ${index}"></article>`
    ),
    large: repeated(
        1000,
        (index) =>
            `<article class="card" data-index="${index}"><header><h2>Title ${index}</h2></header>` +
            `<p>Body text for item ${index}</p><!-- marker --><img src="/${index}.jpg" alt="Image ${index}"></article>`
    ),
    scripts: repeated(
        150,
        (index) =>
            `<script type="module">const template${index} = '<span>${index}</span>'; console.log(template${index});</script>`
    ),
    svg: `<svg viewBox="0 0 1000 1000">${repeated(
        500,
        (index) =>
            `<g transform="translate(${index} ${index})"><path d="M0 0 L10 10" fill="none"/></g>`
    )}</svg>`,
    malformed: repeated(
        250,
        (index) => `<div data-index="${index}"><span>Unclosed ${index}`
    ),
}

const lightweightDocument = {
    createTextNode: (value) => ({ nodeType: 3, nodeValue: value }),
    createComment: (value) => ({ nodeType: 8, nodeValue: value }),
    createDocumentFragment: () => {
        const childNodes = []
        return {
            nodeType: 11,
            childNodes,
            appendChild(node) {
                childNodes.push(node)
            },
        }
    },
    createElementNS: (namespaceURI, tagName) => {
        const childNodes = []
        return {
            nodeType: 1,
            namespaceURI,
            tagName,
            childNodes,
            appendChild(node) {
                childNodes.push(node)
            },
            setAttribute() {},
        }
    },
}

const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)]
}

const measurePair = (markup, handler, iterations) => {
    const parsers = { before: beforeParse, after: afterParse }
    const samples = { before: [], after: [] }

    for (const parse of Object.values(parsers)) {
        for (let i = 0; i < Math.min(iterations, 200); i++)
            parse(markup, handler)
    }

    for (let sample = 0; sample < 7; sample++) {
        const order = sample % 2 ? ['after', 'before'] : ['before', 'after']
        for (const name of order) {
            global.gc?.()
            const start = performance.now()
            for (let i = 0; i < iterations; i++) parsers[name](markup, handler)
            samples[name].push((performance.now() - start) / iterations)
        }
    }

    return {
        beforeMs: median(samples.before),
        afterMs: median(samples.after),
    }
}

const modes = {
    tokenizer: lightweightDocument,
    defaultDoc: undefined,
}

const results = []
for (const [mode, handler] of Object.entries(modes)) {
    for (const [name, markup] of Object.entries(cases)) {
        const targetBytes = 300_000
        const iterations = Math.max(
            5,
            Math.min(5_000, Math.ceil(targetBytes / markup.length))
        )
        const { beforeMs, afterMs } = measurePair(markup, handler, iterations)

        results.push({
            mode,
            case: name,
            bytes: markup.length,
            iterations,
            beforeMs,
            afterMs,
            speedup: beforeMs / afterMs,
            beforeMBps: markup.length / beforeMs / 1000,
            afterMBps: markup.length / afterMs / 1000,
        })
    }
}

console.log(
    '| Mode | Case | Size | Before ms | After ms | Change | Before MB/s | After MB/s |'
)
console.log('|---|---:|---:|---:|---:|---:|---:|---:|')
for (const result of results) {
    const change = (result.speedup - 1) * 100
    console.log(
        `| ${result.mode} | ${result.case} | ${result.bytes} | ` +
            `${result.beforeMs.toFixed(4)} | ${result.afterMs.toFixed(4)} | ` +
            `${change >= 0 ? '+' : ''}${change.toFixed(1)}% | ` +
            `${result.beforeMBps.toFixed(1)} | ${result.afterMBps.toFixed(1)} |`
    )
}

const geometricMean = (values) =>
    Math.exp(
        values.reduce((sum, value) => sum + Math.log(value), 0) / values.length
    )

for (const mode of Object.keys(modes)) {
    const speedups = results
        .filter((result) => result.mode === mode)
        .map((result) => result.speedup)
    console.log(
        `${mode} geometric-mean change: ${(
            (geometricMean(speedups) - 1) *
            100
        ).toFixed(1)}%`
    )
}
