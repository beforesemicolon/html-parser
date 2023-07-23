import selfClosingTags from './self-closing-tags.json';

export interface NodeLike extends Node {
	setAttribute: (name: string, val: string) => void;
	lastElementChild: NodeLike;
	nodeName: string;
	textContent: string;
	appendChild: <P>(node: P) => P;
}

export interface NodeHandlerDocument<F extends DocumentFragment, N> {
	createDocumentFragment: () => F;
	createTextNode: (text?: string) => N;
	createComment: (comment?: string) => N;
	createElement: (tagName: string) => N;
	createElementNS: (ns: string, tagName: string) => N;
}

export type NodeHandlerCallback<T> = (node: T) => void;

export type NodeHandler<F extends DocumentFragment, N> = NodeHandlerCallback<N> | NodeHandlerDocument<F, N>

const NSURI: Record<string, string> = {
	HTML: 'http://www.w3.org/1999/xhtml',
	SVG: 'http://www.w3.org/2000/svg',
}

function setAttributes(node: NodeLike, attributes: string) {
	attributes = attributes?.trim();
	if (attributes) {
		const attrPattern = /([a-z][\w-.:]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/ig;
		let match: RegExpExecArray | null = null;
		
		while ((match = attrPattern.exec(attributes))) {
			let name = match[1];
			const value = match[2] || match[3] || match[4] || (
				new RegExp(`^${match[1]}\\s*=`).test(match[0]) ? '' : null
			)
			
			node.setAttribute(name, value ?? '');
		}
	}
}

const isStyleOrScriptTag = (tagName: string) => /SCRIPT|STYLE/i.test(String(tagName));

const isHtmlOrSvgTag = (tagName: string) => /SVG|HTML/i.test(String(tagName));

export const parse = <T extends DocumentFragment, N extends NodeLike>(markup: string, handler?: NodeHandler<T, N>): T => {
	// const pattern = /<!--(.*?(?=-->))-->|<(\/|!)?([a-z][\w\-.:]*)(\s*[^>]*?)(\/)?>(?:(.*?)<\/\3>)?/gis;
	const pattern = /<!--(.*?(?=-->))-->|<(\/|!)?([a-zA-Z][\w\-.:]*)(\s*[^>]*?)(\/)?>(?:(.*?)(?<=<\/\s*\3\s*>)<\/\s*\3\s*>)?/gis;
	let match: RegExpExecArray | null = null;
	let isNSTag = false
	let URI = '';
	let lastIndex = 0;
	const doc = (!handler || typeof handler === "function" ? document : handler) as NodeHandlerDocument<T, N>;
	const cb = (typeof handler === "function" ? handler : () => {}) as NodeHandlerCallback<N>
	const frag = doc.createDocumentFragment();
	let openedScriptOrStyleLastMatchIndex = 0;
	
	while ((match = pattern.exec(markup)) !== null) {
		let [fullMatchedString, comment, closeOrBangSymbol, tagName, attributes, selfCloseSlash, content] = match;
		
		console.log({markup, tagName, fullMatchedString, content, comment, closeOrBangSymbol});
		
		if (closeOrBangSymbol) {
			continue;
		}
		
		if (openedScriptOrStyleLastMatchIndex && isStyleOrScriptTag(tagName)) {
			continue;
		}
		
		// grab in between text
		if (match.index > 0) {
			const textNode = doc.createTextNode(markup.slice(0, match.index));
			frag.appendChild(textNode);
			cb(textNode);
		}
		
		if (comment) {
			const commentNode = doc.createComment(comment);
			frag.appendChild(commentNode);
			cb(commentNode);
		} else if (tagName) {
			if (isHtmlOrSvgTag(tagName)) {
				isNSTag = true;
				URI = NSURI[tagName];
			}
			
			if (selfCloseSlash || (selfClosingTags as { [key: string]: string })[tagName.toUpperCase()]) {
				const node = isNSTag
					? doc.createElementNS(URI, tagName.toLowerCase())
					: doc.createElement(tagName.toLowerCase());
				
				setAttributes(node, attributes)
				frag.appendChild(node);
				cb(node);
			} else if (!closeOrBangSymbol) {
				const node = isNSTag
					? doc.createElementNS(URI, tagName.toLowerCase())
					: doc.createElement(tagName.toLowerCase());
				
				setAttributes(node, attributes)
				frag.appendChild(node);
				cb(node);
				
				if (content?.length) {
					// full length of the opening tag including attributes and 2 for opening and close <|>
					// const tagOpenOrCloseSize = 1;
					// const endOfTagIndex =  tagOpenOrCloseSize + tagName.length + attributes?.length + tagOpenOrCloseSize;
					// const endTagPattern = new RegExp(`(<\/\s*${tagName}\s*>)[^<>]*$`, 'si');
					// const endMatch = fullMatchedString.match(endTagPattern);
					// const endOfContentIndex = endMatch?.index || fullMatchedString.length;
					// const tagContent = fullMatchedString.slice(endOfTagIndex, endOfContentIndex);
					//
					// console.log('-- content after', {tagName, content, tagContent, endMatch, endOfTagIndex, markup, fullMatchedString});
					
					if (isStyleOrScriptTag(tagName)) {
						node.textContent = content
					} else {
						node.appendChild(parse(content, handler));
					}
				}
			}
		}
		
		markup = markup.slice(match.index + fullMatchedString.length)
		
		console.log('-- sliced');
	}
	
	console.log('-- end', markup);
	
	// grab ending text
	if (markup.length) {
		const textNode = doc.createTextNode(markup);
		frag.appendChild(textNode);
		cb(textNode);
	}
	
	return frag;
}
