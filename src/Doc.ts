import selfClosingTags from './self-closing-tags.json'

export interface DocumentLike {
    createTextNode: (value: string) => TextLike
    createComment: (value: string) => CommentLike
    createDocumentFragment: () => DocumentFragmentLike
    createElementNS: (ns: string, tagName: string) => ElementLike
}

type AttrLike = { name: string; value: string }

class NodeLike {
    #value = ''

    get nodeValue() {
        return this.#value
    }

    set nodeValue(val: string) {
        if (typeof val === 'string') {
            this.#value = val
        }
    }

    get nodeType() {
        return 0
    }

    get nodeName() {
        return '#node'
    }

    constructor(val: string) {
        this.nodeValue = val
    }
}

class TextLike extends NodeLike {
    get nodeType() {
        return 3
    }

    get nodeName() {
        return '#text'
    }
}

class CommentLike extends NodeLike {
    get nodeType() {
        return 8
    }

    get nodeName() {
        return '#comment'
    }
}

class NamedNodeMapLike {
    #attributes: Map<string, AttrLike> = new Map()

    get length() {
        return this.#attributes.size
    }

    item(index: number) {
        return Array.from(this.#attributes.values())[index] || null
    }

    getNamedItem(name: string) {
        return this.#attributes.get(name)
    }

    setNamedItem(attr: AttrLike) {
        this.#attributes.set(attr.name, attr)
        return attr
    }

    removeNamedItem(name: string) {
        this.#attributes.delete(name)
        return this.getNamedItem(name) || null
    }

    [Symbol.iterator]() {
        return this.#attributes.values()
    }
}

class ElementLike extends NodeLike {
    #tag = ''
    #children: Set<ElementLike> = new Set()
    #nodes: Set<NodeLike | ElementLike> = new Set()
    #attributes = new NamedNodeMapLike()

    get nodeType() {
        return 1
    }

    get nodeName() {
        return this.#tag
    }

    get tagName() {
        return this.#tag
    }

    get childNodes() {
        return Array.from(this.#nodes.values())
    }

    get children() {
        return Array.from(this.#children.values())
    }

    get attributes() {
        return this.#attributes
    }

    get textContent() {
        return this.#nodes.size
            ? Array.from(this.#nodes.values())
                  .map((n) => n.nodeValue)
                  .join('')
            : this.nodeValue
    }

    set textContent(newValue: string) {
        this.nodeValue = newValue
    }

    get outerHTML() {
        const tag = this.#tag.toLowerCase()
        let str = `<${tag}`

        const hasAttrs = this.#attributes.length
        if (hasAttrs) {
            str += ' '
            str += Array.from(this.#attributes)
                .map(({ name, value }) => `${name}="${value}"`)
                .join(' ')
        }

        str += '>'

        if (!(selfClosingTags as Record<string, string>)[this.#tag]) {
            if (this.#nodes.size) {
                str += Array.from(this.#nodes.values())
                    .map((n) => {
                        switch (n.nodeType) {
                            case 3:
                                return n.nodeValue
                            case 8:
                                return `<!--${n.nodeValue}-->`
                            default:
                                return (n as ElementLike).outerHTML
                        }
                    })
                    .join('')
            } else {
                str += this.nodeValue
            }

            str += `</${tag}>`
        }

        return str
    }

    constructor(tagName = '') {
        super('')
        this.#tag = tagName
    }

    setAttribute(name: string, value: string = '') {
        this.#attributes.setNamedItem({
            name,
            value,
        })
    }

    appendChild(
        node:
            | ElementLike
            | CommentLike
            | TextLike
            | DocumentFragmentLike
            | NodeLike
    ) {
        if (
            !(
                node instanceof NodeLike ||
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                node instanceof ElementLike ||
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                node instanceof DocumentFragmentLike
            )
        ) {
            return
        }

        if (node.nodeType === 11) {
            ;(node as DocumentFragmentLike).childNodes.forEach((n) => {
                if ((n as ElementLike).nodeType === 1) {
                    this.#children.add(n as ElementLike)
                }

                this.#nodes.add(n)
            })
            return
        }

        if (node.nodeType === 1) {
            this.#children.add(node as ElementLike)
        }

        this.#nodes.add(node as NodeLike)
    }
}

class DocumentFragmentLike extends ElementLike {
    get nodeType() {
        return 11
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    outerHTML: undefined
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    nodeValue: undefined
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    textContent: undefined
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    setAttribute: undefined
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    attributes: undefined
}

export const Doc: DocumentLike = {
    createTextNode: (nodeValue = '') => new TextLike(nodeValue),
    createComment: (nodeValue = '') => new CommentLike(nodeValue),
    createDocumentFragment: () => new DocumentFragmentLike('#fragment'),
    createElementNS: (ns: string, name: string) =>
        new ElementLike(name.toUpperCase()),
}
