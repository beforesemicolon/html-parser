import {
    Doc,
    DocumentLike,
    ElementLike,
    NodeLike,
    DocumentFragmentLike,
} from './Doc'
import { selfClosingTags } from './self-closing-tags'

export type NodeHandlerCallback = (node: ElementLike | NodeLike) => void

// URI based on https://developer.mozilla.org/en-US/docs/Web/API/Document/createElementNS
const NSURI: Record<string, string> = {
    HTML: 'http://www.w3.org/1999/xhtml',
    SVG: 'http://www.w3.org/2000/svg',
}

const setAttributes = (node: Element | ElementLike, attributes: string) => {
    attributes = attributes?.trim()
    if (attributes) {
        const attrPattern =
            /([a-z][\w-.:]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/gi
        let match: RegExpExecArray | null = null

        while ((match = attrPattern.exec(attributes))) {
            const name = match[1]
            const value =
                match[2] ||
                match[3] ||
                match[4] ||
                (new RegExp(`^${match[1]}\\s*=`).test(match[0]) ? '' : null)

            node.setAttribute(name, value ?? '')
        }
    }
}

type ParseReturn<T> = T extends DocumentLike
    ? DocumentFragmentLike
    : DocumentFragment

export const parse = <D extends Partial<DocumentLike | Document>>(
    markup: string,
    handler: D | NodeHandlerCallback = Doc as D
): ParseReturn<D> => {
    const pattern =
        /<!--([^]*?(?=-->))-->|<(\/|!)?([a-z][a-z0-9-]*)\s*([^>]*?)(\/?)>/gi
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

    while ((match = pattern.exec(markup)) !== null) {
        const [
            ,
            comment,
            bangOrClosingSlash,
            tagName,
            attributes,
            selfClosingSlash,
        ] = match

        if (bangOrClosingSlash === '!') {
            lastIndex = pattern.lastIndex
            continue
        }

        const stackLastItem = stack.at(-1)

        // pre lingering text
        if (match.index >= lastIndex + 1) {
            const text = markup.slice(lastIndex, match.index)
            const node = doc.createTextNode(text)
            stackLastItem?.appendChild(node)
            cb?.(node)
        }

        lastIndex = pattern.lastIndex

        if (comment) {
            const node = doc.createComment(comment)
            stackLastItem?.appendChild(node)
            cb?.(node)
            continue
        }

        if (tagName) {
            if (bangOrClosingSlash) {
                if (
                    new RegExp(tagName, 'i').test(stackLastItem?.tagName || '')
                ) {
                    stack.pop()
                }
                continue
            }

            const ns = /svg/i.test(tagName)
                ? NSURI.SVG
                : /html/i.test(tagName)
                ? NSURI.HTML
                : (stackLastItem as ElementLike)?.namespaceURI ?? NSURI.HTML

            const selfClosingTag =
                selfClosingTags().test(tagName) || selfClosingSlash === '/'

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
            if (/SCRIPT/i.test(String(tagName))) {
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
                                pattern.lastIndex = lastIndex // move the pattern needle to start matching later in the string
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

    if (lastIndex < markup.length) {
        const node = doc.createTextNode(markup.slice(lastIndex))
        stack[0].appendChild(node)
        cb?.(node)
    }

    return stack[0] as ParseReturn<D>
}
