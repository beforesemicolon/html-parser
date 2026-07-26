import { buildBrowser, buildModules } from '@beforesemicolon/builder'
import { mkdir, writeFile } from 'node:fs/promises'

const target = process.argv[2] ?? 'all'

if (!['all', 'browser', 'modules'].includes(target)) {
    throw new Error(`Unknown build target "${target}".`)
}

if (target === 'all' || target === 'modules') {
    await buildModules()
    await mkdir('dist/cjs', { recursive: true })
    await writeFile('dist/cjs/package.json', '{"type":"commonjs"}\n')
}

if (target === 'all' || target === 'browser') {
    await buildBrowser()
}
