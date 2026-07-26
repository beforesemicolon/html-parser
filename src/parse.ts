import { Doc } from './Doc.ts'
import type {
    DocumentFragmentLike,
    DocumentLike,
    ElementLike,
    NodeLike,
} from './Doc.ts'

export type NodeHandlerCallback = (node: ElementLike | NodeLike) => void

const HTML_NS = 'http://www.w3.org/1999/xhtml'
const SVG_NS = 'http://www.w3.org/2000/svg'
const MATH_NS = 'http://www.w3.org/1998/Math/MathML'

const VOID_TAGS = new Set([
    'AREA',
    'BASE',
    'BR',
    'COL',
    'COMMAND',
    'EMBED',
    'HR',
    'IMG',
    'INPUT',
    'KEYGEN',
    'LINK',
    'MENUITEM',
    'META',
    'PARAM',
    'SOURCE',
    'TRACK',
    'WBR',
])

const RAW_TEXT_TAGS = new Set(['STYLE', 'TEXTAREA', 'TITLE'])

const isWhitespace = (code: number) =>
    code === 9 || code === 10 || code === 12 || code === 13 || code === 32

const isAsciiLetter = (code: number) =>
    (code >= 65 && code <= 90) || (code >= 97 && code <= 122)

const isTagNameCharacter = (code: number) =>
    isAsciiLetter(code) || (code >= 48 && code <= 57) || code === 45

const isTagBoundary = (code: number) =>
    !code || isWhitespace(code) || code === 47 || code === 62

const findTagEnd = (markup: string, start: number) => {
    let quote = 0

    for (let i = start; i < markup.length; i++) {
        const code = markup.charCodeAt(i)

        if (quote) {
            if (code === quote) quote = 0
        } else if (code === 34 || code === 39) {
            quote = code
        } else if (code === 62) {
            return i
        }
    }

    return -1
}

const matchesTagAt = (markup: string, index: number, tagName: string) => {
    if (index + tagName.length > markup.length) return false

    for (let i = 0; i < tagName.length; i++) {
        const actual = markup.charCodeAt(index + i)
        const expected = tagName.charCodeAt(i)
        if (actual !== expected && actual !== expected + 32) return false
    }

    return isTagBoundary(markup.charCodeAt(index + tagName.length))
}

const findRawTextEnd = (
    markup: string,
    start: number,
    tagName: string,
    balanced = false
) => {
    let searchIndex = start
    let depth = 0

    while (searchIndex < markup.length) {
        const tagStart = markup.indexOf('<', searchIndex)
        if (tagStart < 0) return null

        const closing = markup.charCodeAt(tagStart + 1) === 47
        const nameStart = tagStart + (closing ? 2 : 1)

        if (matchesTagAt(markup, nameStart, tagName)) {
            const tagEnd = findTagEnd(markup, nameStart + tagName.length)
            if (tagEnd < 0) return null

            if (closing) {
                if (depth === 0) {
                    return { contentEnd: tagStart, tagEnd: tagEnd + 1 }
                }
                depth--
            } else if (balanced) {
                depth++
            }

            searchIndex = tagEnd + 1
        } else {
            searchIndex = tagStart + 1
        }
    }

    return null
}

const getNamespace = (
    tagName: string,
    parent?: ElementLike | DocumentFragmentLike
) => {
    if (tagName === 'SVG') return SVG_NS
    if (tagName === 'MATH') return MATH_NS
    if (tagName === 'HTML') return HTML_NS

    const parentElement = parent as ElementLike
    if (
        parentElement?.namespaceURI === SVG_NS &&
        parentElement.tagName?.toUpperCase() === 'FOREIGNOBJECT'
    ) {
        return HTML_NS
    }

    return parentElement?.namespaceURI ?? HTML_NS
}

const setAttributes = (
    node: Element | ElementLike,
    markup: string,
    start: number,
    end: number
) => {
    let i = start

    while (i < end) {
        while (i < end && isWhitespace(markup.charCodeAt(i))) i++
        if (i >= end || markup.charCodeAt(i) === 47) break

        const nameStart = i
        while (i < end) {
            const code = markup.charCodeAt(i)
            if (isWhitespace(code) || code === 61 || code === 47) break
            i++
        }

        if (nameStart === i) {
            i++
            continue
        }

        const name = markup.slice(nameStart, i)
        while (i < end && isWhitespace(markup.charCodeAt(i))) i++

        let value = ''
        if (markup.charCodeAt(i) === 61) {
            i++
            while (i < end && isWhitespace(markup.charCodeAt(i))) i++

            const quote = markup.charCodeAt(i)
            if (quote === 34 || quote === 39) {
                const valueStart = ++i
                while (i < end && markup.charCodeAt(i) !== quote) i++
                value = markup.slice(valueStart, i)
                if (i < end) i++
            } else {
                const valueStart = i
                while (i < end) {
                    const code = markup.charCodeAt(i)
                    if (isWhitespace(code) || (code === 47 && i + 1 === end)) {
                        break
                    }
                    i++
                }
                value = markup.slice(valueStart, i)
            }
        }

        node.setAttribute(name, value)
    }
}

type ParseReturn<T> = T extends DocumentLike
    ? DocumentFragmentLike
    : DocumentFragment

export const parse = <D extends Partial<DocumentLike | Document>>(
    markup: string,
    handler: D | NodeHandlerCallback = Doc as D
): ParseReturn<D> => {
    const doc = (
        !handler || typeof handler === 'function' ? Doc : handler
    ) as DocumentLike
    const cb =
        typeof handler === 'function' ? (handler as NodeHandlerCallback) : null
    const root = doc.createDocumentFragment()

    const appendText = (
        parent: ElementLike | DocumentFragmentLike,
        start: number,
        end: number,
        notify = true
    ) => {
        if (end <= start) return
        const node = doc.createTextNode(markup.slice(start, end))
        parent.appendChild(node)
        if (notify) cb?.(node)
    }

    if (!markup.includes('<')) {
        appendText(root, 0, markup.length)
        return root as ParseReturn<D>
    }

    const stack: Array<ElementLike | DocumentFragmentLike> = [root]
    let i = 0

    while (i < markup.length) {
        const parent = stack[stack.length - 1]
        const tagStart = markup.indexOf('<', i)

        if (tagStart < 0) {
            appendText(parent, i, markup.length)
            break
        }

        if (markup.startsWith('<!--', tagStart)) {
            appendText(parent, i, tagStart)
            const commentEnd = markup.indexOf('-->', tagStart + 4)
            if (commentEnd < 0) {
                appendText(parent, tagStart, markup.length)
                break
            }

            const node = doc.createComment(
                markup.slice(tagStart + 4, commentEnd)
            )
            parent.appendChild(node)
            cb?.(node)
            i = commentEnd + 3
            continue
        }

        const nextCode = markup.charCodeAt(tagStart + 1)
        if (nextCode === 33 || nextCode === 63) {
            const tagEnd = findTagEnd(markup, tagStart + 2)
            if (tagEnd < 0) {
                appendText(parent, tagStart, markup.length)
                break
            }
            i = tagEnd + 1
            continue
        }

        const closing = nextCode === 47
        const nameStart = tagStart + (closing ? 2 : 1)
        if (!isAsciiLetter(markup.charCodeAt(nameStart))) {
            appendText(parent, i, tagStart + 1)
            i = tagStart + 1
            continue
        }

        appendText(parent, i, tagStart)

        let nameEnd = nameStart + 1
        while (
            nameEnd < markup.length &&
            isTagNameCharacter(markup.charCodeAt(nameEnd))
        ) {
            nameEnd++
        }

        const tagEnd = findTagEnd(markup, nameEnd)
        if (tagEnd < 0) {
            appendText(parent, tagStart, markup.length)
            break
        }

        const sourceTagName = markup.slice(nameStart, nameEnd)
        const tagName = sourceTagName.toUpperCase()

        if (closing) {
            for (
                let stackIndex = stack.length - 1;
                stackIndex > 0;
                stackIndex--
            ) {
                const candidate = stack[stackIndex] as ElementLike
                if (candidate.tagName?.toUpperCase() === tagName) {
                    stack.length = stackIndex
                    break
                }
            }
            i = tagEnd + 1
            continue
        }

        let slashIndex = tagEnd - 1
        while (
            slashIndex > nameEnd &&
            isWhitespace(markup.charCodeAt(slashIndex))
        ) {
            slashIndex--
        }
        const explicitlyClosed = markup.charCodeAt(slashIndex) === 47
        const attributeEnd = explicitlyClosed ? slashIndex : tagEnd
        const node = doc.createElementNS(
            getNamespace(tagName, parent),
            sourceTagName
        )
        setAttributes(node, markup, nameEnd, attributeEnd)
        parent.appendChild(node)

        i = tagEnd + 1
        if (explicitlyClosed || VOID_TAGS.has(tagName)) {
            cb?.(node)
            continue
        }

        if (tagName === 'SCRIPT' || RAW_TEXT_TAGS.has(tagName)) {
            const rawEnd = findRawTextEnd(
                markup,
                i,
                tagName,
                tagName === 'SCRIPT'
            )
            if (rawEnd) {
                appendText(node, i, rawEnd.contentEnd, tagName !== 'SCRIPT')
                i = rawEnd.tagEnd
                cb?.(node)
                continue
            }
        }

        stack.push(node)
        cb?.(node)
    }

    return root as ParseReturn<D>
}
