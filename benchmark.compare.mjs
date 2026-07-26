import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const repoRoot = process.cwd()
const baseRef = process.env.BENCHMARK_BASE_REF ?? 'origin/master'
const sampleCount = Number(process.env.BENCHMARK_SAMPLES ?? 15)
const sampleTargetMs = Number(process.env.BENCHMARK_SAMPLE_MS ?? 75)
const materialThresholdPercent = Number(
    process.env.BENCHMARK_MATERIAL_PERCENT ?? 3
)
const materialThresholdMs = Number(process.env.BENCHMARK_MATERIAL_MS ?? 0.001)
const bootstrapIterations = 5_000
const maxIterations = 200_000

const requireNumber = (name, value, minimum) => {
    if (!Number.isFinite(value) || value < minimum) {
        throw new Error(
            `${name} must be a number greater than or equal to ${minimum}`
        )
    }
}

requireNumber('BENCHMARK_SAMPLES', sampleCount, 5)
requireNumber('BENCHMARK_SAMPLE_MS', sampleTargetMs, 10)
requireNumber('BENCHMARK_MATERIAL_PERCENT', materialThresholdPercent, 0)
requireNumber('BENCHMARK_MATERIAL_MS', materialThresholdMs, 0)

if (!global.gc) {
    throw new Error(
        'Run this benchmark with `node --expose-gc benchmark.compare.mjs`.'
    )
}

const gitText = (...args) =>
    execFileSync('git', args, {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()

const gitBuffer = (...args) =>
    execFileSync('git', args, {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
    })

const repeated = (count, create) =>
    Array.from({ length: count }, (_, index) => create(index)).join('')

const benchmarkCases = {
    small: '<div class="card"><h2>Title</h2><p>Short body</p></div>',
    attributes: repeated(
        30,
        (index) =>
            `<section id="item-${index}" data-label="value > ${index}" hidden>` +
            `<input type="text" value="item-${index}"><span>Label ${index}</span></section>`
    ),
    markupTemplate: repeated(
        40,
        (index) =>
            `<button $val${index * 2} class="$val${index * 2 + 1}" ` +
            `data-index="${index}">Item $val${index * 2 + 2}</button>`
    ),
    medium: repeated(
        100,
        (index) =>
            `<article class="card" data-index="${index}"><header><h2>Title ${index}</h2></header>` +
            `<p>Body text for item ${index}</p><!-- marker --><img src="/${index}.jpg" alt="Image ${index}"></article>`
    ),
    large: repeated(
        1_000,
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

const benchmarkModes = {
    tokenizer: lightweightDocument,
    defaultDoc: undefined,
}

const selectEntries = (values, environmentName) => {
    const requested = process.env[environmentName]
    if (!requested) return Object.entries(values)

    const names = requested
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)

    return names.map((name) => {
        if (!(name in values)) {
            throw new Error(
                `${environmentName} contains unknown value "${name}". ` +
                    `Available values: ${Object.keys(values).join(', ')}`
            )
        }
        return [name, values[name]]
    })
}

const selectedCases = selectEntries(benchmarkCases, 'BENCHMARK_CASE')
const selectedModes = selectEntries(benchmarkModes, 'BENCHMARK_MODE')

const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)]
}

const geometricMean = (values) =>
    Math.exp(
        values.reduce((sum, value) => sum + Math.log(value), 0) / values.length
    )

const createRandom = (seed) => {
    let state = seed >>> 0
    return () => {
        state += 0x6d2b79f5
        let value = state
        value = Math.imul(value ^ (value >>> 15), value | 1)
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
        return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
    }
}

const hash = (value) => {
    let result = 2_166_136_261
    for (let index = 0; index < value.length; index++) {
        result ^= value.charCodeAt(index)
        result = Math.imul(result, 16_777_619)
    }
    return result >>> 0
}

const bootstrapMedianInterval = (values, seed) => {
    const random = createRandom(seed)
    const bootstrapped = new Array(bootstrapIterations)

    for (let iteration = 0; iteration < bootstrapIterations; iteration++) {
        const sample = new Array(values.length)
        for (let index = 0; index < values.length; index++) {
            sample[index] = values[Math.floor(random() * values.length)]
        }
        bootstrapped[iteration] = median(sample)
    }

    bootstrapped.sort((a, b) => a - b)
    return {
        low: bootstrapped[Math.floor(bootstrapIterations * 0.025)],
        high: bootstrapped[Math.floor(bootstrapIterations * 0.975)],
    }
}

const runIterations = (parse, markup, handler, iterations) => {
    if (handler) {
        for (let iteration = 0; iteration < iterations; iteration++) {
            parse(markup, handler)
        }
    } else {
        for (let iteration = 0; iteration < iterations; iteration++) {
            parse(markup)
        }
    }
}

const measure = (parse, markup, handler, iterations) => {
    const start = performance.now()
    runIterations(parse, markup, handler, iterations)
    return performance.now() - start
}

const calibrate = (parse, markup, handler) => {
    let iterations = 1
    let elapsed = 0

    while (iterations < maxIterations) {
        global.gc()
        elapsed = measure(parse, markup, handler, iterations)
        if (elapsed >= 10) break
        iterations = Math.min(maxIterations, iterations * 2)
    }

    if (elapsed <= 0) return maxIterations

    return Math.max(
        1,
        Math.min(
            maxIterations,
            Math.round((iterations * sampleTargetMs) / elapsed)
        )
    )
}

const classify = (changePercent, absoluteChangeMs, confidenceInterval) => {
    const lowPercent = (confidenceInterval.low - 1) * 100
    const highPercent = (confidenceInterval.high - 1) * 100
    const isMaterial =
        Math.abs(changePercent) >= materialThresholdPercent &&
        Math.abs(absoluteChangeMs) >= materialThresholdMs

    if (lowPercent > 0 && isMaterial) {
        return 'meaningfully faster'
    }
    if (lowPercent > 0) return 'faster, below material threshold'
    if (highPercent < 0 && isMaterial) {
        return 'meaningfully slower'
    }
    if (highPercent < 0) return 'slower, below material threshold'
    return 'inconclusive'
}

const measurePair = (beforeParse, afterParse, markup, handler, resultSeed) => {
    const warmupIterations = Math.max(
        20,
        Math.min(2_000, Math.ceil(1_000_000 / markup.length))
    )
    runIterations(beforeParse, markup, handler, warmupIterations)
    runIterations(afterParse, markup, handler, warmupIterations)

    const iterations = Math.max(
        calibrate(beforeParse, markup, handler),
        calibrate(afterParse, markup, handler)
    )

    runIterations(beforeParse, markup, handler, iterations)
    runIterations(afterParse, markup, handler, iterations)

    const samples = {
        before: new Array(sampleCount),
        after: new Array(sampleCount),
    }

    for (let sample = 0; sample < sampleCount; sample++) {
        const order = sample % 2 ? ['after', 'before'] : ['before', 'after']
        for (const name of order) {
            global.gc()
            const parse = name === 'before' ? beforeParse : afterParse
            samples[name][sample] =
                measure(parse, markup, handler, iterations) / iterations
        }
    }

    const pairedRatios = samples.before.map(
        (before, index) => before / samples.after[index]
    )
    const speedup = median(pairedRatios)
    const confidenceInterval = bootstrapMedianInterval(pairedRatios, resultSeed)
    const changePercent = (speedup - 1) * 100
    const beforeMs = median(samples.before)
    const afterMs = median(samples.after)

    return {
        iterations,
        beforeMs,
        afterMs,
        speedup,
        changePercent,
        confidenceInterval,
        verdict: classify(
            changePercent,
            beforeMs - afterMs,
            confidenceInterval
        ),
        samples,
    }
}

const materializeBaseSource = async (directory) => {
    const sourceFiles = gitText(
        'ls-tree',
        '-r',
        '--name-only',
        baseRef,
        '--',
        'src'
    )
        .split('\n')
        .filter((file) => /\.(?:ts|js)$/.test(file))

    if (!sourceFiles.length) {
        throw new Error(`No source files found at base ref "${baseRef}".`)
    }

    for (const file of sourceFiles) {
        const destination = path.join(directory, file)
        await mkdir(path.dirname(destination), { recursive: true })
        await writeFile(destination, gitBuffer('show', `${baseRef}:${file}`))
    }
}

const buildBundle = async (entryPoint, outfile) => {
    await build({
        entryPoints: [entryPoint],
        outfile,
        bundle: true,
        minify: true,
        keepNames: true,
        legalComments: 'none',
        format: 'esm',
        platform: 'node',
        target: 'esnext',
        logLevel: 'silent',
    })
}

const buildModuleTree = async (sourceDirectory, outputDirectory) => {
    await mkdir(outputDirectory, { recursive: true })
    await writeFile(
        path.join(outputDirectory, 'package.json'),
        '{"type":"module"}\n'
    )

    const builderUrl = pathToFileURL(
        path.join(
            repoRoot,
            'node_modules',
            '@beforesemicolon',
            'builder',
            'dist',
            'esm',
            'build-modules.js'
        )
    ).href
    execFileSync(
        process.execPath,
        [
            '--input-type=module',
            '--eval',
            `import { buildModules } from ${JSON.stringify(builderUrl)}; ` +
                'await buildModules({ directoryPath: ' +
                'process.env.BENCHMARK_SOURCE_DIRECTORY })',
        ],
        {
            cwd: outputDirectory,
            env: {
                ...process.env,
                BENCHMARK_SOURCE_DIRECTORY: sourceDirectory,
            },
            stdio: ['ignore', 'ignore', 'inherit'],
        }
    )

    return path.join(outputDirectory, 'dist', 'esm', 'index.js')
}

const formatMilliseconds = (value) =>
    value < 0.01 ? value.toFixed(5) : value.toFixed(4)

const formatPercent = (value) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`

if (process.env.BENCHMARK_INTERNAL_WORKER === '1') {
    const caseName = process.env.BENCHMARK_INTERNAL_CASE
    const mode = process.env.BENCHMARK_INTERNAL_MODE
    const baseBundlePath = process.env.BENCHMARK_INTERNAL_BASE_BUNDLE
    const currentBundlePath = process.env.BENCHMARK_INTERNAL_CURRENT_BUNDLE

    if (
        !caseName ||
        !mode ||
        !baseBundlePath ||
        !currentBundlePath ||
        !(caseName in benchmarkCases) ||
        !(mode in benchmarkModes)
    ) {
        throw new Error('Invalid internal benchmark worker configuration.')
    }

    const cacheKey = `${Date.now()}-${process.pid}`
    const [baseModule, currentModule] = await Promise.all([
        import(`${pathToFileURL(baseBundlePath).href}?${cacheKey}-base`),
        import(`${pathToFileURL(currentBundlePath).href}?${cacheKey}-current`),
    ])

    if (
        typeof baseModule.parse !== 'function' ||
        typeof currentModule.parse !== 'function'
    ) {
        throw new Error('Both benchmark bundles must export a parse function.')
    }

    const measurement = measurePair(
        baseModule.parse,
        currentModule.parse,
        benchmarkCases[caseName],
        benchmarkModes[mode],
        hash(`${mode}/${caseName}`)
    )
    await new Promise((resolve) =>
        process.stdout.write(JSON.stringify(measurement), resolve)
    )
    process.exit(0)
}

const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), 'html-parser-benchmark-')
)

try {
    const baseSourceDirectory = path.join(temporaryDirectory, 'base')
    const baseBundlePath = path.join(temporaryDirectory, 'base.mjs')
    const currentBundlePath = path.join(temporaryDirectory, 'current.mjs')
    const baseModuleRoot = path.join(temporaryDirectory, 'base-modules')
    const currentModuleRoot = path.join(temporaryDirectory, 'current-modules')

    await materializeBaseSource(baseSourceDirectory)
    const baseEntryPath = await buildModuleTree(
        path.join(baseSourceDirectory, 'src'),
        baseModuleRoot
    )
    const currentEntryPath = await buildModuleTree(
        path.join(repoRoot, 'src'),
        currentModuleRoot
    )
    await Promise.all([
        buildBundle(
            path.join(baseSourceDirectory, 'src', 'index.ts'),
            baseBundlePath
        ),
        buildBundle(path.join(repoRoot, 'src', 'index.ts'), currentBundlePath),
    ])

    const cacheKey = `${Date.now()}-${process.pid}`
    const [baseModule, currentModule] = await Promise.all([
        import(`${pathToFileURL(baseEntryPath).href}?${cacheKey}-base`),
        import(`${pathToFileURL(currentEntryPath).href}?${cacheKey}-current`),
    ])

    if (
        typeof baseModule.parse !== 'function' ||
        typeof currentModule.parse !== 'function'
    ) {
        throw new Error('Both benchmark bundles must export a parse function.')
    }

    const baseSha = gitText('rev-parse', baseRef)
    const currentSha = gitText('rev-parse', 'HEAD')
    const dirty = Boolean(gitText('status', '--short'))
    const bundleSizes = {
        before: (await stat(baseBundlePath)).size,
        after: (await stat(currentBundlePath)).size,
    }
    const results = []
    const startedAt = performance.now()

    console.error(
        `Comparing ${baseRef} (${baseSha.slice(0, 8)}) with ` +
            `HEAD (${currentSha.slice(0, 8)}${dirty ? ', dirty' : ''})`
    )
    console.error(
        `${sampleCount} paired samples targeting ${sampleTargetMs}ms each`
    )

    for (const [mode] of selectedModes) {
        for (const [caseName, markup] of selectedCases) {
            console.error(`Measuring ${mode}/${caseName}...`)
            const measurement = JSON.parse(
                execFileSync(
                    process.execPath,
                    [
                        '--expose-gc',
                        path.join(repoRoot, 'benchmark.compare.mjs'),
                    ],
                    {
                        cwd: repoRoot,
                        encoding: 'utf8',
                        maxBuffer: 10 * 1024 * 1024,
                        stdio: ['ignore', 'pipe', 'inherit'],
                        env: {
                            ...process.env,
                            BENCHMARK_INTERNAL_WORKER: '1',
                            BENCHMARK_INTERNAL_CASE: caseName,
                            BENCHMARK_INTERNAL_MODE: mode,
                            BENCHMARK_INTERNAL_BASE_BUNDLE: baseEntryPath,
                            BENCHMARK_INTERNAL_CURRENT_BUNDLE: currentEntryPath,
                        },
                    }
                )
            )
            results.push({
                mode,
                case: caseName,
                bytes: markup.length,
                ...measurement,
            })
        }
    }

    const summaries = selectedModes.map(([mode]) => {
        const modeResults = results.filter((result) => result.mode === mode)
        const speedup = geometricMean(
            modeResults.map((result) => result.speedup)
        )
        return {
            mode,
            speedup,
            changePercent: (speedup - 1) * 100,
        }
    })

    const report = {
        environment: {
            node: process.version,
            platform: process.platform,
            arch: process.arch,
            baseRef,
            baseSha,
            currentSha,
            dirty,
            processIsolation: true,
            sampleCount,
            sampleTargetMs,
            materialThresholdPercent,
            materialThresholdMs,
            elapsedSeconds: (performance.now() - startedAt) / 1_000,
        },
        bundleSizes: {
            ...bundleSizes,
            changePercent: (bundleSizes.after / bundleSizes.before - 1) * 100,
        },
        results,
        summaries,
    }

    console.log(
        '| Mode | Case | Bytes | Iterations | Before ms | After ms | Before MB/s | After MB/s | Change | Paired 95% CI | Verdict |'
    )
    console.log('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|')
    for (const result of results) {
        const low = (result.confidenceInterval.low - 1) * 100
        const high = (result.confidenceInterval.high - 1) * 100
        const beforeThroughput = result.bytes / result.beforeMs / 1_000
        const afterThroughput = result.bytes / result.afterMs / 1_000
        console.log(
            `| ${result.mode} | ${result.case} | ${result.bytes} | ` +
                `${result.iterations} | ${formatMilliseconds(
                    result.beforeMs
                )} | ` +
                `${formatMilliseconds(result.afterMs)} | ` +
                `${beforeThroughput.toFixed(1)} | ` +
                `${afterThroughput.toFixed(1)} | ` +
                `${formatPercent(result.changePercent)} | ` +
                `${formatPercent(low)} to ${formatPercent(high)} | ` +
                `${result.verdict} |`
        )
    }

    console.log('')
    for (const summary of summaries) {
        console.log(
            `${summary.mode} geometric-mean change: ` +
                formatPercent(summary.changePercent)
        )
    }
    console.log(
        `Bundle size: ${bundleSizes.before.toLocaleString()} → ` +
            `${bundleSizes.after.toLocaleString()} bytes ` +
            `(${formatPercent(report.bundleSizes.changePercent)})`
    )
    console.log(
        `Elapsed: ${report.environment.elapsedSeconds.toFixed(1)}s on ` +
            `${process.version} ${process.platform}/${process.arch}`
    )

    if (process.env.BENCHMARK_JSON) {
        const outputPath = path.resolve(repoRoot, process.env.BENCHMARK_JSON)
        await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`)
        console.error(`Wrote ${outputPath}`)
    }
} finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
}
