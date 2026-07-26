import { selfClosingTags } from './self-closing-tags.ts'

export interface NodeLike {
    readonly nodeType: number
    readonly nodeName: string
    nodeValue: string | null
}

export interface CommentLike extends NodeLike {}

export interface TextLike extends NodeLike {}

export interface AttrLike {
    name: string
    value: string
}

export interface NamedNodeMapLike {
    getNamedItem(name: string): AttrLike | null
    setNamedItem(attr: AttrLike): AttrLike
    removeNamedItem(name: string): AttrLike | null
    item(index: number): AttrLike | null
    length: number
    [Symbol.iterator](): IterableIterator<AttrLike>
}

export interface ElementLike extends NodeLike {
    readonly tagName: string
    readonly namespaceURI: string
    readonly outerHTML: string
    readonly childNodes: Array<NodeLike>
    readonly children: Array<ElementLike>
    readonly attributes: NamedNodeMapLike
    textContent: string
    setAttribute: (name: string, value?: string) => void
    appendChild: (node: NodeLike | ElementLike | DocumentFragmentLike) => void
}

export interface DocumentFragmentLike
    extends Omit<
        ElementLike,
        'outerHTML' | 'setAttribute' | 'attributes' | 'namespaceURI'
    > {}

export interface DocumentLike {
    createTextNode: (value: string) => TextLike
    createComment: (value: string) => CommentLike
    createDocumentFragment: () => DocumentFragmentLike
    createElementNS: (ns: string, tagName: string) => ElementLike
}

class Node implements NodeLike {
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

class Text extends Node implements TextLike {
    get nodeType() {
        return 3
    }

    get nodeName() {
        return '#text'
    }
}

class Comment extends Node implements CommentLike {
    get nodeType() {
        return 8
    }

    get nodeName() {
        return '#comment'
    }
}

class NamedNodeMap implements NamedNodeMapLike {
    #attributes: Map<string, AttrLike> = new Map()

    get length() {
        return this.#attributes.size
    }

    item(index: number) {
        if (index < 0 || index >= this.#attributes.size) return null

        let current = 0
        for (const attribute of this.#attributes.values()) {
            if (current++ === index) return attribute
        }
        return null
    }

    getNamedItem(name: string) {
        return this.#attributes.get(name) ?? null
    }

    setNamedItem(attr: AttrLike) {
        this.#attributes.set(attr.name, attr)
        return attr
    }

    removeNamedItem(name: string) {
        const attribute = this.getNamedItem(name)
        this.#attributes.delete(name)
        return attribute
    }

    [Symbol.iterator]() {
        return this.#attributes.values()
    }
}

class Element extends Node implements ElementLike {
    #tag = ''
    #children: ElementLike[] = []
    #nodes: Array<NodeLike | ElementLike> = []
    #attributes = new NamedNodeMap()
    #ns: string

    get nodeType() {
        return 1
    }

    get nodeName() {
        return this.#tag
    }

    get tagName() {
        return this.#tag
    }

    get namespaceURI() {
        return this.#ns
    }

    get childNodes() {
        return this.#nodes
    }

    get children() {
        return this.#children
    }

    get attributes() {
        return this.#attributes
    }

    get textContent() {
        return this.#nodes.length
            ? this.#nodes
                  .map((n) => {
                      if (n.nodeType === 8) {
                          return ''
                      }

                      return (n as ElementLike).textContent ?? n.nodeValue ?? ''
                  })
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
            str += [...this.#attributes]
                .map(({ name, value }) => `${name}="${value}"`)
                .join(' ')
        }

        str += '>'

        if (!selfClosingTags().test(tag)) {
            if (this.#nodes.length) {
                str += this.#nodes
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

    constructor(ns: string, tagName = '') {
        super('')
        this.#tag = tagName
        this.#ns = ns
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
        if (node.nodeType === 11) {
            ;(node as Element).childNodes.forEach((n) => {
                if ((n as ElementLike).nodeType === 1) {
                    this.#children.push(n as ElementLike)
                }

                this.#nodes.push(n)
            })
            return
        }

        if (node.nodeType === 1) {
            this.#children.push(node as Element)
        }

        this.#nodes.push(node as NodeLike)
    }
}

class DocumentFragment extends Element implements DocumentFragmentLike {
    get nodeType() {
        return 11
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    outerHTML: undefined
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    setAttribute: undefined
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    attributes: undefined
}

export const Doc: DocumentLike = {
    createTextNode: (nodeValue = '') => new Text(nodeValue),
    createComment: (nodeValue = '') => new Comment(nodeValue),
    createDocumentFragment: () =>
        new DocumentFragment('http://www.w3.org/1999/xhtml', '#fragment'),
    createElementNS: (ns: string, name: string) =>
        new Element(ns, name.toUpperCase()),
}
