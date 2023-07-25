
export interface CustomNode {
	readonly type: "element" | "text" | "comment";
	readonly nodeName: "#fragment" | "#text" | "#comment" | string;
	value?: string;
	readonly textContent?: string;
	readonly childNodes?: Array<CustomNode>;
	readonly children?: Array<CustomNode>;
	readonly lastElementChild?: CustomNode;
	readonly attributes?: Record<string, string>;
	setAttribute?: (name: string, value?: string) => void;
	appendChild?: (node: CustomNode) => void;
}

export interface CustomDoc {
	createTextNode: (value: string) => ({type: "text", value: string, nodeName: "#text"});
	createComment: (value: string) => ({type: "comment", value: string, nodeName: "#comment"});
	createDocumentFragment: () => CustomNode;
	createElementNS: (ns: string, tagName: string) => CustomNode;
}

const node = (nodeName: string): CustomNode => {
	const nodes: Array<CustomNode> = [];
	const children: Array<CustomNode> = [];
	const attributes: Record<string, string> = {};
	let value = '';
	
	return {
		get nodeName() {
			return nodeName;
		},
		get type() {
			return "element" as CustomNode['type'];
		},
		get childNodes() {
			return nodes
		},
		get children() {
			return children
		},
		get attributes() {
			return attributes;
		},
		get lastElementChild() {
			return children.at(-1)
		},
		get textContent() {
			return nodes.map(n => n.value ?? n.textContent).join('');
		},
		setAttribute: (name: string, value: string = '') => {
			attributes[name] = value;
		},
		appendChild: (node: CustomNode) => {
			if (node.type === "element") {
				children.push(node)
			}
			
			nodes.push(node)
		}
	};
}

export const Doc: CustomDoc = {
	createTextNode: (value: string) => ({type: "text", value, nodeName: "#text"}),
	createComment: (value: string) => ({type: "comment", value, nodeName: "#comment"}),
	createDocumentFragment: () => node('#fragment'),
	createElementNS: (ns: string, tagName: string) => node(tagName),
}
