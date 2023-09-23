import selfClosingTags from './self-closing-tags.json';

export interface ElementLike extends Element {
	setAttribute: (name: string, val: string) => void;
	lastElementChild: ElementLike;
	nodeName: string;
	textContent: string;
	appendChild: <P>(node: P) => P;
}

export interface NodeHandlerDocument<F extends DocumentFragment> {
	createDocumentFragment: () => F;
	createTextNode: (text?: string) => ElementLike;
	createComment: (comment?: string) => ElementLike;
	createElementNS: (ns: string, tagName: string) => ElementLike;
}

interface TempNode<F> {
	tagName: string;
	node: ElementLike | F;
	ns: string;
}

export type NodeHandlerCallback = (node: ElementLike) => void;

export type NodeHandler<F extends DocumentFragment> = NodeHandlerCallback | NodeHandlerDocument<F>

// URI based on https://developer.mozilla.org/en-US/docs/Web/API/Document/createElementNS
const NSURI: Record<string, string> = {
	HTML: 'http://www.w3.org/1999/xhtml',
	SVG: 'http://www.w3.org/2000/svg',
}

const setAttributes = (node: ElementLike, attributes: string) => {
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

export const parse = <T extends DocumentFragment>(markup: string, handler: NodeHandler<T> | null = null): T => {
	const pattern = /<!--([^]*?(?=-->))-->|<(\/|!)?([a-z][a-z0-9-]*)\s*([^>]*?)(\/?)>/gi;
	let match: RegExpExecArray | null = null;
	const doc = (!handler || typeof handler === "function" ? document : handler) as NodeHandlerDocument<T>;
	const cb = typeof handler === "function" ? handler : null;
	const stack: Array<TempNode<T>> = [
		{tagName: "frag", node: doc.createDocumentFragment(), ns: NSURI.HTML}
	];
	let lastIndex = 0;
	
	while ((match = pattern.exec(markup)) !== null) {
		const [_, comment, bangOrClosingSlash, tagName, attributes, selfClosingSlash] = match;
		
		
		if (bangOrClosingSlash === '!') {
			lastIndex = pattern.lastIndex;
			continue;
		}
		
		const stackLastItem = stack.at(-1) as TempNode<T>;

		// pre lingering text
		if (match.index >= lastIndex + 1) {
			const text = markup.slice(lastIndex, match.index);
			const node = doc.createTextNode(text);
			(stackLastItem.node as ElementLike).appendChild(node);
			cb?.(node);
		}

		lastIndex = pattern.lastIndex;

		if (comment) {
			const node = doc.createComment(comment);
			(stackLastItem.node as ElementLike).appendChild(node);
			cb?.(node);
			continue;
		}
		
		if (tagName) {
			const selfClosingTag = Boolean(tagName) && (selfClosingTags as Record<string, string>)[tagName.toUpperCase()] || selfClosingSlash === '/';
			
			if (bangOrClosingSlash) {
				if (new RegExp(tagName, 'i').test(stackLastItem.tagName)) {
					stack.pop();
				}
				continue;
			}
			
			const ns = /svg/i.test(tagName)
				? NSURI.SVG
				: /html/i.test(tagName)
					? NSURI.HTML
					: stackLastItem.ns;
			
			if (selfClosingTag) {
				const node = doc.createElementNS(ns, tagName.toLowerCase());
				
				setAttributes(node, attributes);
				
				(stackLastItem.node as ElementLike).appendChild(node);
				cb?.(node);
				continue;
			}
			
			const node = doc.createElementNS(ns, tagName) as ElementLike;
			setAttributes(node, attributes);
			
			
			// scripts in particular can have html strings which does not impact
			// the overall markup therefore we need a special lookup to find the closing tag
			// without considering these possible HTML tag matches to be part of the final DOM
			if (isStyleOrScriptTag(tagName)) {
				// try to find the closing tag
				const possibleSimilarOnesNested: string[] = [];
				const exactTagPattern = new RegExp(`<(\\/)?(${tagName})\\s*([^>]*?)>`, 'ig');
				const markupAhead = markup.slice(lastIndex);
				let tagMatch: RegExpExecArray | null = null;
				
				while ((tagMatch = exactTagPattern.exec(markupAhead)) !== null) {
					const [_, closingSlash, name, attributes, selfClosingSlash] = tagMatch;
					
					// check if the tag name is matched
					if (new RegExp(tagName, 'i').test(name)) {
						if (closingSlash) {
							if (!possibleSimilarOnesNested.length) {
								node.textContent = markupAhead.slice(0, tagMatch.index);
								(stackLastItem.node as ElementLike).appendChild(node);
								lastIndex = lastIndex + exactTagPattern.lastIndex;
								pattern.lastIndex = lastIndex; // move the pattern needle to start matching later in the string
								break;
							} else {
								possibleSimilarOnesNested.pop()
							}
						} else if(!selfClosingSlash) {
							// could be that there is a script HTML string inside
							// we need to track those, so we don't mix them with the possible script closing tag
							possibleSimilarOnesNested.push(name);
						}
					}
				}
			} else {
				stack.push({
					tagName,
					node,
					ns
				});
			}
			
			(stackLastItem.node as ElementLike).appendChild(node);
			
			cb?.(node);
			
		}
	}

	if (lastIndex < markup.length) {
		const text = markup.slice(lastIndex);
		const node = doc.createTextNode(text);
		(stack[0].node as ElementLike).appendChild(node);
		cb?.(node);
	}
	
	return stack[0].node as T;
}
