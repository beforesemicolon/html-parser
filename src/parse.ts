import selfClosingTags from './self-closing-tags.json'
import { Doc, DocumentLike } from './Doc'

type ElementLike = ReturnType<DocumentLike['createElementNS']>
type DocumentFragmentLike = ReturnType<DocumentLike['createDocumentFragment']>
type NodeLike =
    | ReturnType<DocumentLike['createTextNode']>
    | ReturnType<DocumentLike['createComment']>

interface TempNode {
    tagName: string
    node: DocumentFragmentLike | Element | ElementLike
    ns: string
}

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

export const parse = <D extends DocumentLike | Document>(
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
    const stack: Array<TempNode> = [
        { tagName: 'frag', node: doc.createDocumentFragment(), ns: NSURI.HTML },
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

        const stackLastItem = stack.at(-1) as TempNode

        // pre lingering text
        if (match.index >= lastIndex + 1) {
            const text = markup.slice(lastIndex, match.index)
            const node = doc.createTextNode(text)
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            stackLastItem?.node.appendChild(node as ElementLike)
            cb?.(node)
        }

        lastIndex = pattern.lastIndex

        if (comment) {
            const node = doc.createComment(comment)
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            stackLastItem?.node.appendChild(node as ElementLike)
            cb?.(node)
            continue
        }

        if (tagName) {
            const selfClosingTag =
                (Boolean(tagName) &&
                    (selfClosingTags as Record<string, string>)[
                        tagName.toUpperCase()
                    ]) ||
                selfClosingSlash === '/'

            if (bangOrClosingSlash) {
                if (new RegExp(tagName, 'i').test(stackLastItem?.tagName)) {
                    stack.pop()
                }
                continue
            }

            const ns = /svg/i.test(tagName)
                ? NSURI.SVG
                : /html/i.test(tagName)
                ? NSURI.HTML
                : stackLastItem?.ns

            if (selfClosingTag) {
                const node = doc.createElementNS(ns, tagName.toLowerCase())

                setAttributes(node, attributes)
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                stackLastItem?.node.appendChild(node as ElementLike)
                cb?.(node)
                continue
            }

            const node = doc.createElementNS(ns, tagName)
            setAttributes(node, attributes)

            // scripts in particular can have html strings that do not need to be rendered.
            // The overall markup therefore we need a special lookup to find the closing tag
            // without considering these possible HTML tag matches to be part of the final DOM
            if (/SCRIPT|STYLE/i.test(String(tagName))) {
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
                                node.textContent = markupAhead.slice(
                                    0,
                                    tagMatch.index
                                )
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
                stack.push({
                    tagName,
                    node,
                    ns,
                })
            }

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            stackLastItem?.node.appendChild(node as ElementLike)

            cb?.(node)
        }
    }

    if (lastIndex < markup.length) {
        const text = markup.slice(lastIndex)
        const node = doc.createTextNode(text)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        stack[0].node.appendChild(node as ElementLike)
        cb?.(node)
    }

    return stack[0].node as ParseReturn<D>
}
