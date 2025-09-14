import {
    Doc,
    DocumentLike,
    ElementLike,
    NodeLike,
    DocumentFragmentLike,
} from './Doc.ts'
import { selfClosingTags } from './self-closing-tags.ts'

export type NodeHandlerCallback = (node: ElementLike | NodeLike) => void

// Pre-compiled regexes for better performance
const HTML_PATTERN =
    /<!--([^]*?(?=-->))-->|<(\/|!)?([a-z][a-z0-9-]*)\s*([^>]*?)(\/?)>/gi
const ATTR_PATTERN =
    /([a-z][\w-.:]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/gi
const SVG_TEST = /svg/i
const MATH_TEST = /math/i
const HTML_TEST = /html/i
const SCRIPT_TEST = /^SCRIPT$/i

// URI based on https://developer.mozilla.org/en-US/docs/Web/API/Document/createElementNS
const NSURI: Record<string, string> = {
    HTML: 'http://www.w3.org/1999/xhtml',
    SVG: 'http://www.w3.org/2000/svg',
    MATH: 'http://www.w3.org/1998/Math/MathML',
}

// Cache self-closing tags regex
let selfClosingTagsRegex: RegExp

const setAttributes = (node: Element | ElementLike, attributes: string) => {
    const trimmed = attributes?.trim()
    if (!trimmed) return

    ATTR_PATTERN.lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = ATTR_PATTERN.exec(trimmed))) {
        const name = match[1]
        const value =
            match[2] ??
            match[3] ??
            match[4] ??
            (match[0].includes('=') ? '' : '')
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
    HTML_PATTERN.lastIndex = 0
    let match: RegExpExecArray | null = null
    const doc = (
        !handler || typeof handler === 'function' ? Doc : handler
    ) as DocumentLike
    const cb = (typeof handler === 'function'
        ? handler
        : null) as unknown as NodeHandlerCallback
    const stack: Array<ElementLike | DocumentFragmentLike> = [
        doc.createDocumentFragment(),
    ]
    let lastIndex = 0
    const markupLength = markup.length

    // Cache self-closing tags regex
    if (!selfClosingTagsRegex) {
        selfClosingTagsRegex = selfClosingTags()
    }

    while ((match = HTML_PATTERN.exec(markup)) !== null) {
        const [
            ,
            comment,
            bangOrClosingSlash,
            tagName,
            attributes,
            selfClosingSlash,
        ] = match

        if (bangOrClosingSlash === '!') {
            lastIndex = HTML_PATTERN.lastIndex
            continue
        }

        const stackTop = stack.length - 1
        const stackLastItem = stack[stackTop]

        // pre lingering text
        if (match.index >= lastIndex + 1) {
            const text = markup.slice(lastIndex, match.index)
            const node = doc.createTextNode(text)
            stackLastItem?.appendChild(node)
            cb?.(node)
        }

        lastIndex = HTML_PATTERN.lastIndex

        if (comment) {
            const node = doc.createComment(comment)
            stackLastItem?.appendChild(node)
            cb?.(node)
            continue
        }

        if (tagName) {
            if (bangOrClosingSlash) {
                const stackTagName = stackLastItem?.tagName
                if (
                    stackTagName &&
                    new RegExp(tagName, 'i').test(stackTagName)
                ) {
                    stack.pop()
                }
                continue
            }

            const ns = SVG_TEST.test(tagName)
                ? NSURI.SVG
                : MATH_TEST.test(tagName)
                ? NSURI.MATH
                : HTML_TEST.test(tagName)
                ? NSURI.HTML
                : (stackLastItem as ElementLike)?.namespaceURI ?? NSURI.HTML

            const selfClosingTag =
                selfClosingTagsRegex.test(tagName) || selfClosingSlash === '/'

            if (selfClosingTag) {
                const node = doc.createElementNS(ns, tagName)
                setAttributes(node, attributes)
                stackLastItem?.appendChild(node)
                cb?.(node)
                continue
            }

            const node = doc.createElementNS(ns, tagName)
            setAttributes(node, attributes)
            stackLastItem?.appendChild(node)

            // scripts in particular can have html strings that do not need to be rendered.
            // The overall markup therefore we need a special lookup to find the closing tag
            // without considering these possible HTML tag matches to be part of the final DOM
            if (SCRIPT_TEST.test(tagName)) {
                // try to find the closing tag
                const possibleSimilarOnesNested: string[] = []
                const exactTagPattern = new RegExp(
                    `<(\\/)?(${tagName})\\s*([^>]*?)>`,
                    'ig'
                )
                const markupAhead = markup.slice(lastIndex)
                let tagMatch: RegExpExecArray | null = null

                while (
                    (tagMatch = exactTagPattern.exec(markupAhead)) !== null
                ) {
                    const [, closingSlash, name, , selfClosingSlash] = tagMatch

                    // check if the tag name is matched
                    if (new RegExp(tagName, 'i').test(name)) {
                        if (closingSlash) {
                            if (!possibleSimilarOnesNested.length) {
                                const textNode = doc.createTextNode(
                                    markupAhead.slice(0, tagMatch.index)
                                )
                                node.appendChild(textNode)
                                lastIndex =
                                    lastIndex + exactTagPattern.lastIndex
                                HTML_PATTERN.lastIndex = lastIndex // move the pattern needle to start matching later in the string
                                break
                            } else {
                                possibleSimilarOnesNested.pop()
                            }
                        } else if (!selfClosingSlash) {
                            // could be that there is a script HTML string inside
                            // we need to track those, so we don't mix them with the possible script closing tag
                            possibleSimilarOnesNested.push(name)
                        }
                    }
                }
            } else {
                stack.push(node)
            }

            cb?.(node)
        }
    }

    if (lastIndex < markupLength) {
        const node = doc.createTextNode(markup.slice(lastIndex))
        stack[0].appendChild(node)
        cb?.(node)
    }

    return stack[0] as ParseReturn<D>
}
