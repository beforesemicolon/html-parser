import {NodeName} from './enums/NodeName.enum';
import {NodeType} from './enums/NodeType.enum';
import {SelectorType} from './enums/SelectorType.enum';

export declare global {

	export interface AttrMock {
		name: string;
		value: string | null;

		toString: () => string;
	}

	export interface SelectorMock {
		type: SelectorType;
		name: string | null;
		value: string | Selector | Array<Array<SelectorMock>> | null;
		operator: string | null;
		modifier: string | null;

		toString: () => string;
	}

	export interface AttributesMock {
		[SymbolConstructor.iterator]: IterableIterator<Map<string, AttrMock>>;
		readonly length: number;

		getNamedItem: (name: string) => null | AttrMock;
		setNamedItem: (name: string, value: string) => void;
		removeNamedItem: (name: string) => void;
		toString: () => string;
	}

	export interface NodeMock {
		parentNode: ElementMock | null;
		readonly nodeName: string | NodeName;
		readonly nodeType: NodeType;
		nodeValue: string;
		firstChild: NodeMock | null;
		lastChild: NodeMock | null;
		prevSibling: NodeMock | null;
		nextSibling: NodeMock | null;
		childNodes: Array<NodeMock>;
		textContent: string;

		getRootNode: () => ElementMock | null;
		appendChild: (node: NodeMock) => void;
		removeChild: (node: NodeMock) => void;
		replaceChild: (node: NodeMock, node: NodeMock) => void;
		hasChildNodes: () => boolean;
		insertBefore: (newNode: NodeMock, refNode: NodeMock) => void;
	}

	export enum adjacentPosition {
		BEFORE_BEGIN = 'beforebegin',
		BEFORE_END = 'beforeend',
		AFTER_BEGIN = 'afterbegin',
		AFTER_END = 'afterend',
	}

	export interface ElementMock extends NodeMock {
		tagName: string | null;
		attributes: AttributesMock;
		children: Array<ElementMock>;
		lastElementChild: ElementMock | null;
		firstElementChild: ElementMock | null;
		prevElementSibling: ElementMock | null;
		nextElementSibling: ElementMock | null;
		innerHTML: string;
		textContent: string;
		outerHTML: string;
		isContentEditable: boolean;
		tabIndex: string;
		className: string;
		readonly contentEditable: boolean;
		readonly nodeName: string;
		hidden: boolean;
		draggable: boolean;
		spellcheck: boolean;
		inert: boolean;
		id: string;
		title: string;
		lang: string;
		slot: string;
		name: string;

		removeAttribute: (name: string) => void;
		removeAttributeNode: (attr: AttrMock) => void;
		hasAttributes: () => boolean;
		hasAttribute: (name: string) => boolean;
		getAttribute: (name: string) => string | null;
		getAttributeNode: (name: string) => AttrMock | null;
		setAttribute: (name: string, value: string) => void;
		setAttributeNode: (attr: AttrMock) => void;
		appendChild: (node: NodeMock) => void;
		replaceChild: (newNode: NodeMock, oldNode: NodeMock) => void;
		removeChild: (node: NodeMock) => void;
		remove: () => void;
		cloneNode: (deep?: boolean) => ElementMock;
		before: (node: NodeMock) => void;
		after: (node: NodeMock) => void;
		insertBefore: (node: NodeMock, refNode: NodeMock) => void;
		insertAdjacentElement: (position: adjacentPosition, node: NodeMock) => void;
		insertAdjacentText: (position: adjacentPosition, text: string) => void;
		insertAdjacentHTML: (position: adjacentPosition, html: string) => void;
		querySelector: (selectorString: string) => NodeMock | null;
		querySelectorAll: (selectorString: string) => Array<NodeMock> | null;
		matches: (selectorString: string) => boolean;
		closest: (selectorString: string) => NodeMock | null;
		toString: () => string;
	}

	export interface TextNodeMock extends NodeMock {
		cloneNode: () => TextNodeMock;
		toString: () => string;
	}

	export interface CommentMock extends NodeMock {
		cloneNode: () => CommentMock;
		toString: () => string;
	}

	export class DocumentMock {
		createDocumentFragment: () => ElementMock;
		createElement: (tagName: string) => ElementMock;
		createComment: (text: string) => CommentMock;
		createTextNode: (text: string) => TextNodeMock;
	}
}
