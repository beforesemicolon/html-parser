import {
    Doc,
    DocumentLike,
    ElementLike,
    NodeLike,
    DocumentFragmentLike,
} from './Doc.ts'

export type NodeHandlerCallback = (node: ElementLike | NodeLike) => void

const SELF_CLOSING_TAGS =
    /^(AREA|META|BASE|BR|COL|EMBED|HR|IMG|INPUT|LINK|PARAM|SOURCE|TRACK|WBR|COMMAND|KEYGEN|MENUITEM|DOCTYPE|!DOCTYPE)$/i
// Pre-compiled regexes for better performance
const HTML_PATTERN =
    /<!--([^]*?(?=-->))-->|<(\/|!)?([a-z][a-z0-9-]*)\s*([^>]*?)(\/?)>/gi
const ATTR_PATTERN =
    /([a-z][\w-.:]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/gi

// URI based on https://developer.mozilla.org/en-US/docs/Web/API/Document/createElementNS
const NSURI: Record<string, string> = {
    HTML: 'http://www.w3.org/1999/xhtml',
    SVG: 'http://www.w3.org/2000/svg',
    MATH: 'http://www.w3.org/1998/Math/MathML',
}

// Cache for tag regexes and namespaces
const tagRegexCache = new Map<string, RegExp>()
const namespaceCache = new Map<string, string>()

const getTagRegex = (tagName: string): RegExp => {
    let regex = tagRegexCache.get(tagName)
    if (!regex) {
        regex = new RegExp(tagName, 'i')
        tagRegexCache.set(tagName, regex)
    }
    return regex
}

const getNamespace = (tagName: string, parentNS?: string): string => {
    let ns = namespaceCache.get(tagName)
    if (!ns) {
        const lower = tagName.toLowerCase()
        ns =
            lower === 'svg'
                ? NSURI.SVG
                : lower.startsWith('math')
                ? NSURI.MATH
                : lower === 'html'
                ? NSURI.HTML
                : parentNS ?? NSURI.HTML
        namespaceCache.set(tagName, ns)
    }
    return ns
}

const setAttributes = (node: Element | ElementLike, attributes: string) => {
    const trimmed = attributes?.trim()
    if (!trimmed) return

    ATTR_PATTERN.lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = ATTR_PATTERN.exec(trimmed))) {
        const name = match[1]
        const value = match[2] ?? match[3] ?? match[4] ?? ''
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
    // Fast path for simple text-only content
    if (!markup.includes('<')) {
        const doc = (
            !handler || typeof handler === 'function' ? Doc : handler
        ) as DocumentLike
        const fragment = doc.createDocumentFragment()
        const textNode = doc.createTextNode(markup)
        fragment.appendChild(textNode)
        if (typeof handler === 'function') handler(textNode)
        return fragment as ParseReturn<D>
    }

    HTML_PATTERN.lastIndex = 0
    let match: RegExpExecArray | null = null
    const doc = (
        !handler || typeof handler === 'function' ? Doc : handler
    ) as DocumentLike
    const cb = (typeof handler === 'function'
        ? handler
        : null) as unknown as NodeHandlerCallback

    // Pre-allocate stack with reasonable size
    const stack: Array<ElementLike | DocumentFragmentLike> = new Array(32)
    stack[0] = doc.createDocumentFragment()
    let stackIndex = 0
    let lastIndex = 0
    const markupLength = markup.length

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

        const stackLastItem = stack[stackIndex]

        // Pre-lingering text
        if (match.index > lastIndex) {
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
                if (stackTagName && getTagRegex(tagName).test(stackTagName)) {
                    stackIndex--
                }
                continue
            }

            const ns = getNamespace(
                tagName,
                (stackLastItem as ElementLike)?.namespaceURI
            )
            const isSelfClosing =
                SELF_CLOSING_TAGS.test(tagName.toLowerCase()) ||
                selfClosingSlash === '/'

            const node = doc.createElementNS(ns, tagName)
            setAttributes(node, attributes)
            stackLastItem?.appendChild(node)

            if (isSelfClosing) {
                cb?.(node)
                continue
            }

            // Handle script tags specially
            if (tagName.toUpperCase() === 'SCRIPT') {
                const possibleSimilarOnesNested: string[] = []
                const exactTagPattern = new RegExp(
                    `<(\\/)?(${tagName})\\s*([^>]*)>`,
                    'ig'
                )
                const markupAhead = markup.slice(lastIndex)
                let tagMatch: RegExpExecArray | null = null

                while (
                    (tagMatch = exactTagPattern.exec(markupAhead)) !== null
                ) {
                    const [, closingSlash, name] = tagMatch

                    if (getTagRegex(tagName).test(name)) {
                        if (closingSlash) {
                            if (!possibleSimilarOnesNested.length) {
                                const textNode = doc.createTextNode(
                                    markupAhead.slice(0, tagMatch.index)
                                )
                                node.appendChild(textNode)
                                lastIndex =
                                    lastIndex + exactTagPattern.lastIndex
                                HTML_PATTERN.lastIndex = lastIndex
                                break
                            } else {
                                possibleSimilarOnesNested.pop()
                            }
                        } else {
                            possibleSimilarOnesNested.push(name)
                        }
                    }
                }
            } else {
                stack[++stackIndex] = node
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
