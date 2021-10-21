import {Node} from './Node';
import {Attributes} from './Attributes';
import {Attr} from './Attr';
import {Text} from './Text';
import {parse} from '..';
import {traverseNodeDescendents} from "../utils/traverseNodeDescendents";
import matchSelector from "../utils/matchSelector";
import {traverseNodeAncestors} from "../utils/traverseNodeAncestors";
import selfClosingTags from '../utils/self-closing-tags.json';
import reg from '../utils/regexPatterns';
import {createSelectors} from "../utils/createSelectors";
import {Selector} from "./Selector";

const {tagCommentPattern} = reg;

export class Element extends Node implements ElementMock {
	private _tagName: ElementMock['tagName'];
	private _attributes: AttributesMock;
	private _children: Array<ElementMock> = [];

	constructor(tagName: string | null = null) {
		super();
		this._tagName = tagName;
		this._attributes = new Attributes();
	}

	get contentEditable() {
		return this.hasAttribute('contenteditable');
	}

	set contentEditable(val: boolean) {
		if (val) {
			this.setAttribute('contenteditable', 'true')
		} else {
			this.setAttribute('contenteditable', 'false')
		}
	}

	get spellcheck() {
		return this.hasAttribute('spellcheck');
	}

	set spellcheck(val: boolean) {
		if (val) {
			this.setAttribute('spellcheck', 'true')
		} else {
			this.setAttribute('spellcheck', 'false')
		}
	}

	get inert() {
		return this.hasAttribute('inert');
	}

	set inert(val: boolean) {
		if (val) {
			this.setAttribute('inert', '')
		} else {
			this.removeAttribute('inert')
		}
	}

	get hidden() {
		return this.hasAttribute('hidden');
	}

	set hidden(val: boolean) {
		if (val) {
			this.setAttribute('hidden', '')
		} else {
			this.removeAttribute('hidden')
		}
	}

	get draggable() {
		return this.hasAttribute('draggable');
	}

	set draggable(val: boolean) {
		if (val) {
			this.setAttribute('draggable', '')
		} else {
			this.removeAttribute('draggable')
		}
	}

	get id() {
		return this.getAttribute('id') ?? '';
	}

	set id(val: string) {
		this.setAttribute('id', val)
	}

	get className() {
		return this.getAttribute('class') ?? '';
	}

	set className(val: string) {
		this.setAttribute('class', val)
	}

	get tabIndex() {
		return this.getAttribute('tab-index') ?? '';
	}

	set tabIndex(val: string) {
		this.setAttribute('tab-index', val)
	}

	get title() {
		return this.getAttribute('title') ?? '';
	}

	set title(val: string) {
		this.setAttribute('title', val)
	}

	get lang() {
		return this.getAttribute('lang') ?? '';
	}

	set lang(val: string) {
		this.setAttribute('lang', val)
	}

	get slot() {
		return this.getAttribute('slot') ?? '';
	}

	set slot(val: string) {
		this.setAttribute('slot', val)
	}

	get name() {
		return this.getAttribute('name') ?? '';
	}

	set name(val: string) {
		this.setAttribute('name', val)
	}

	get tagName() {
		return this._tagName;
	}

	get nodeName() {
		return (this.tagName?.toUpperCase() ?? '');
	}

	get attributes() {
		return this._attributes;
	}

	get children() {
		return [...this._children];
	}

	get lastElementChild() {
		return this._children[this._children.length - 1] || null;
	}

	get firstElementChild() {
		return this._children[0] || null;
	}

	get innerHTML() {
		return this.childNodes.join('');
	}

	set innerHTML(value: string) {
		this._children = [];

		for (let childNode of this.childNodes) {
			this.removeChild(childNode);
		}

		parse(value).childNodes.forEach(node => this.appendChild(node));
	}

	set textContent(value: string) {
		value = value.replace(tagCommentPattern, '');
		this._children = [];

		for (let childNode of this.childNodes) {
			this.removeChild(childNode);
		}

		// @ts-ignore
		this.appendChild(new Text(value))
	}

	get textContent() {
		return this.childNodes.join('').replace(tagCommentPattern, '');
	}

	get outerHTML() {
		return this.toString();
	}

	get prevElementSibling(): ElementMock | null {
		if (this.parentNode) {
			const sibs = this.parentNode.children
			return sibs[sibs.indexOf(this as unknown as ElementMock) - 1] || null;
		}

		return null;
	}

	get nextElementSibling(): ElementMock | null {
		if (this.parentNode) {
			const sibs = this.parentNode.children
			return sibs[sibs.indexOf(this as unknown as ElementMock) + 1] || null;
		}

		return null;
	}

	get isContentEditable() {
		return this.contentEditable;
	}

	get style() {
		// todo: https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleDeclaration
		return '';
	}

	hasAttributes() {
		return this.attributes.length > 0;
	}

	hasAttribute(name: string) {
		return this.attributes.getNamedItem(name) !== null;
	}

	setAttribute(name: string, value: string | null = null) {
		if (typeof name === 'string') {
			this._attributes.setNamedItem(name, value as string);
		}
	}

	setAttributeNode(attr: AttrMock) {
		if (attr instanceof Attr) {
			this.setAttribute(attr.name, attr.value);
		}
	}

	getAttributeNames() {
		// @ts-ignore
		return [...this.attributes].map(attr => attr.name);
	}

	getAttribute(name: string) {
		return this.getAttributeNode(name)?.value ?? null;
	}

	getAttributeNode(name: string) {
		return this.attributes.getNamedItem(name)
	}

	removeAttribute(name: string) {
		this._attributes.removeNamedItem(name);
	}

	removeAttributeNode(attr: AttrMock) {
		if (attr instanceof Attr) {
			this.removeAttribute(attr.name)
		}
	}

	appendChild(node: NodeMock) {
		if (isValidNode(node)) {
			super.appendChild(node);

			if (node instanceof Element) {
				this._children.push(node as unknown as ElementMock);
			}
		}
	}

	removeChild(node: NodeMock) {
		if (isValidNode(node)) {
			super.removeChild(node);

			if (node instanceof Element) {
				this._children.splice(this._children.indexOf(node as unknown as ElementMock), 1);
			}
		}
	}

	remove() {
		if (this.parentNode) {
			this.parentNode.removeChild(this);
		}
	}

	replaceChild(newNode: NodeMock, oldNode: NodeMock) {
		if (isValidNode(newNode) && isValidNode(oldNode)) {
			super.replaceChild(newNode, oldNode);

			if (newNode instanceof Element) {
				this._children.splice(this._children.indexOf(oldNode as unknown as ElementMock), 1, newNode as unknown as ElementMock);
			}
		}
	}

	cloneNode(deep?: boolean): ElementMock {
		const cloneNode = new Element(this.tagName) as unknown as ElementMock;

		// @ts-ignore
		for (let attribute of this.attributes) {
			cloneNode.setAttribute(attribute.name, attribute.value)
		}

		if (deep) {
			this.childNodes.forEach(child => {
				cloneNode.appendChild((child as ElementMock).cloneNode(deep))
			});
		}

		return cloneNode;
	}

	before(node: NodeMock) {
		if (isValidNode(node) && this.parentNode) {
			this.parentNode.insertBefore(node, this);
		}
	}

	after(node: NodeMock) {
		if (isValidNode(node) && this.parentNode) {
			if (this.nextSibling) {
				this.parentNode.insertBefore(node, this.nextSibling);
			} else {
				this.parentNode.appendChild(node);
			}
		}
	}

	insertBefore(newNode: NodeMock, refNode: NodeMock) {
		if (isValidNode(newNode) && isValidNode(refNode)) {
			super.insertBefore(newNode, refNode)

			if (newNode instanceof Element) {
				this._children.splice(this._children.indexOf(refNode as unknown as ElementMock), 0, newNode as unknown as ElementMock);
			}
		}
	}

	insertAdjacentElement(position: string, node: NodeMock) {
		if (node instanceof Element) {
			this._insert(position, node);
		}
	}

	insertAdjacentText(position: string, value: string) {
		if (typeof value === "string") {
			const node = new Text(value);
			this._insert(position, node);
		}
	}

	insertAdjacentHTML(position: string, value: string) {
		if (typeof value === "string") {
			parse(value).childNodes.forEach(node => this._insert(position, node));
		}
	}

	querySelector(cssSelectorString: string) {
		const selectors = this._cssSelectorToSelectorList(cssSelectorString);
		const lastSelector: Array<Selector> = selectors[selectors.length - 1];
		let matchedNode = null;

		if (lastSelector) {
			traverseNodeDescendents(this as unknown as ElementMock, (descendentNode: ElementMock) => {
				if (lastSelector.every((selector: Selector) => matchSelector.single(descendentNode, selector))) {
					if (selectors.length > 1) {
						if (matchSelector.list(descendentNode, selectors.length - 2, selectors)) {
							matchedNode = descendentNode;
							return true;
						} else {
							return false;
						}
					}

					matchedNode = descendentNode;
					return true;
				}

				return false;
			})
		}

		return matchedNode;
	}

	querySelectorAll(cssSelectorString: string) {
		const selectors = this._cssSelectorToSelectorList(cssSelectorString);
		const lastSelector = selectors[selectors.length - 1];
		const matchedNodes: Array<ElementMock> = [];

		if (lastSelector) {
			traverseNodeDescendents(this as unknown as ElementMock, (descendentNode: ElementMock) => {
				if (lastSelector.every(selector => matchSelector.single(descendentNode, selector))) {
					if (selectors.length > 1) {
						if (matchSelector.list(descendentNode, selectors.length - 2, selectors)) {
							matchedNodes.push(descendentNode)
						}

						return false;
					}

					matchedNodes.push(descendentNode)
				}

				return false;
			})
		}

		return matchedNodes;
	}

	matches(cssSelectorString: string) {
		const selectors = this._cssSelectorToSelectorList(cssSelectorString);

		return matchSelector.list(this as unknown as ElementMock, selectors.length - 1, selectors, this as unknown as ElementMock);
	}

	closest(cssSelectorString: string): ElementMock | null {
		if (this.matches(cssSelectorString)) {
			return this as unknown as ElementMock;
		}

		const selectors = this._cssSelectorToSelectorList(cssSelectorString);
		let matchedNode = null;

		traverseNodeAncestors(this, (ancestorNode: ElementMock) => {
			if (matchSelector.list(ancestorNode, selectors.length - 1, selectors, ancestorNode)) {
				matchedNode = ancestorNode
				return true;
			}

			return false;
		})

		return matchedNode;
	}

	toString() {
		if (this.tagName === null) {
			return this.childNodes.join('');
		}

		let tag = `<${this.tagName} ${this._attributes}`.trimRight();

		// @ts-ignore
		if (selfClosingTags[this.tagName]) {
			tag += '>'
		} else {
			tag += `>${this.childNodes.join('')}</${this.tagName}>`;
		}

		return tag;
	}

	private _cssSelectorToSelectorList(cssSelectorString: string) {
		try {
			return createSelectors(cssSelectorString);
		} catch (e) {
			throw new Error(`Failed to execute 'querySelector' on 'Element': '${cssSelectorString}' is not a valid selector.`)
		}
	}

	private _insert(position: string, node: NodeMock) {
		switch (position) {
			case 'beforebegin':
				this.before(node);
				break;
			case 'afterbegin':
				if (this.firstChild) {
					this.insertBefore(node, this.firstChild);
				} else {
					this.appendChild(node);
				}
				break;
			case 'beforeend':
				this.appendChild(node);
				break;
			case 'afterend':
				this.after(node);
				break;
		}
	}
}

/**
 * check for a Node instance
 * @param node
 * @returns {boolean}
 */
function isValidNode(node: NodeMock) {
	return node && node instanceof Node;
}
