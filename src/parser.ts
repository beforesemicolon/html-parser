import selfClosingTags from "./utils/self-closing-tags.json";

export function Parser(document: Document | null = null) {
	// @ts-ignore
	document = document ?? window.document;

	return function parse(markup: string) {
		const tagCommentPattern = /<!--([^]*?)-->|<(\/|!)?([a-z][\w-.:]*)((?:\s+[a-z][\w-.:]*(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)+\s*|\s*)(\/?)>/ig;
		const root = (document as Document).createDocumentFragment();
		const stack: Array<DocumentFragment | HTMLElement> = [root];
		let match: RegExpExecArray | null = null;
		let lastIndex = 0;

		while ((match = tagCommentPattern.exec(markup)) !== null) {
			let [fullMatch, comment, closeOrBangSymbol, tagName, attributes, selfCloseSlash] = match;

			tagName = tagName?.toUpperCase();

			if (closeOrBangSymbol === '!') {
				continue;
			}

			const parentNode = stack[stack.length - 1] || null;

			// grab in between text
			if (lastIndex !== match.index) {
				const textNode = (document as Document).createTextNode(markup.slice(lastIndex, match.index));
				parentNode.appendChild(textNode);
			}

			lastIndex = tagCommentPattern.lastIndex;

			if (comment) {
				const commentNode = (document as Document).createComment(comment);
				parentNode.appendChild(commentNode);
				continue;
			}

			if (selfCloseSlash || (selfClosingTags as {[key: string]: string})[tagName]) {
				const node = (document as Document).createElement(tagName);

				setAttributes(node, attributes)

				parentNode.appendChild(node);
			} else if (closeOrBangSymbol === '/') {
				stack.pop();
			} else if (!closeOrBangSymbol) {
				const node = (document as Document).createElement(tagName);

				setAttributes(node, attributes)

				parentNode.appendChild(node);

				stack.push(node)
			}
		}

		// grab ending text
		if (lastIndex < markup.length) {
			const textNode = (document as Document).createTextNode(markup.slice(lastIndex));
			root.appendChild(textNode);
		}

		return root;
	}
}

function setAttributes(node: HTMLElement, attributes: string) {
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

// @ts-ignore
if (window) {
	// @ts-ignore
	window.Parser = Parser
}
