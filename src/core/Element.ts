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

const {tagCommentPattern} = reg;

const attributePropertyMap: {[key: string]: string} = {
	className: 'class',
	contentEditable: 'contenteditable',
	tabIndex: 'tab-index',
}

const booleanAttributes: Array<string> = [
	'hidden',
	'draggable',
	'contentEditable',
	'spellcheck',
	'inert',
];

const keyValuePairAttributes: Array<string> = [
	'className',
	'id',
	'tabIndex',
	'title',
	'lang',
	'slot',
	'name',
];

export class Element extends Node implements ElementMock {
	private _tagName: ElementMock['tagName'];
	private _attributes: AttributesMock;
	private _children: Array<ElementMock> = [];

	constructor(tagName: string | null = null) {
		super();
		this._tagName = tagName;
		this._attributes = new Attributes();

		// getters and setters for boolean attributes
		booleanAttributes.forEach(attr => {
			Object.defineProperty(this, attr, {
				get() {
					return this.hasAttribute(attributePropertyMap[attr] || attr);
				},
				set(val) {
					if (val === true) {
						this.setAttribute(attributePropertyMap[attr] || attr)
					} else if (val === false) {
						this.removeAttribute(attributePropertyMap[attr] || attr)
					}
				}
			});
		})

		// getters and setters for key-value pair attributes
		keyValuePairAttributes.forEach(attr => {
			Object.defineProperty(this, attr, {
				get() {
					return this.getAttribute(attributePropertyMap[attr] || attr)
				},
				set(val) {
					if (typeof val === 'string') {
						this.setAttribute(attributePropertyMap[attr] || attr, val)
					}
				}
			})
		})
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
		super.textContent = value.replace(tagCommentPattern, '');
		this._children = [];

		for (let childNode of this.childNodes) {
			this.removeChild(childNode);
		}

		this.appendChild(new Text(super.textContent))
	}

	get textContent() {
		return this.childNodes.join('').replace(tagCommentPattern, '');
	}

	get outerHTML() {
		return this.toString();
	}

	get prevElementSibling() {
		if (this.parentNode) {
			const sibs = this.parentNode.children
			return sibs[sibs.indexOf(this) - 1] || null;
		}

		return null;
	}

	get nextElementSibling() {
		if (this.parentNode) {
			const sibs = this.parentNode.children
			return sibs[sibs.indexOf(this) + 1] || null;
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

	setAttribute(name: string, value = null) {
		if (typeof name === 'string') {
			if (this._customAttributes && this._customAttributes.hasOwnProperty(name)) {
				this._customAttributes.set(name, value);
			}

			this._attributes.setNamedItem(name, value);
		}
	}

	setAttributeNode(attr: string) {
		if (attr instanceof Attr) {
			this.setAttribute(attr.name, attr.value);
		}
	}

	getAttributeNames() {
		return [...this.attributes].map(attr => attr.name);
	}

	getAttribute(name: string) {
		if (this._customAttributes && this._customAttributes.has(name)) {
			return this._customAttributes.get(name);
		}

		return this.getAttributeNode(name)?.value ?? null;
	}

	getAttributeNode(name: string) {
		if (this._customAttributes && this._customAttributes.has(name)) {
			return new Attr(name, this._customAttributes.get(name));
		}

		return this.attributes.getNamedItem(name)
	}

	removeAttribute(name: string) {
		if (this._customAttributes && this._customAttributes.has(name)) {
			this._customAttributes.delete(name);
		}

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
				this._children.push(node);
			}
		}
	}

	removeChild(node: NodeMock) {
		if (isValidNode(node)) {
			super.removeChild(node);

			if (node instanceof Element) {
				this._children.splice(this._children.indexOf(node), 1);
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
				this._children.splice(this._children.indexOf(oldNode), 1, newNode);
			}
		}
	}

	cloneNode(deep: boolean) {
		const cloneNode = new Element(this.tagName);

		for (let attribute of this.attributes) {
			cloneNode.setAttribute(attribute.name, attribute.value)
		}

		// also copy the hidden special attributes as properties
		// for (let key of Object.keys(attrsPriorities)) {
		// 	if (this.hasOwnProperty(key)) {
		// 		cloneNode[key] = this[key]
		// 	}
		// }

		cloneNode.context = {...this.selfContext};

		if (deep) {
			this.childNodes.forEach(child => {
				child.context = {...this.selfContext};
				cloneNode.appendChild(child.cloneNode(deep))
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
				this._children.splice(this._children.indexOf(refNode), 0, newNode);
			}
		}
	}

	insertAdjacentElement(position: string, node: ElementMock) {
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
		const lastSelector = selectors[selectors.length - 1];
		let matchedNode = null;

		if (lastSelector) {
			traverseNodeDescendents(this, (descendentNode) => {
				if (lastSelector.every(selector => matchSelector.single(descendentNode, selector))) {
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
			})
		}

		return matchedNode;
	}

	querySelectorAll(cssSelectorString: string) {
		const selectors = this._cssSelectorToSelectorList(cssSelectorString);
		const lastSelector = selectors[selectors.length - 1];
		const matchedNodes = [];

		if (lastSelector) {
			traverseNodeDescendents(this, (descendentNode) => {
				if (lastSelector.every(selector => matchSelector.single(descendentNode, selector))) {
					if (selectors.length > 1) {
						if (matchSelector.list(descendentNode, selectors.length - 2, selectors)) {
							matchedNodes.push(descendentNode)
						}

						return false;
					}

					matchedNodes.push(descendentNode)
				}
			})
		}

		return matchedNodes;
	}

	matches(cssSelectorString: string) {
		const selectors = this._cssSelectorToSelectorList(cssSelectorString);

		return matchSelector.list(this, selectors.length - 1, selectors, this);
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
		if (selfClosingTags[this.tagName] ) {
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

	private _insert(position: string, node: ElementMock) {
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