import {Node} from "./Node";
import {NodeName} from "../enums/NodeName.enum";

export class Text extends Node implements TextNodeMock {
	constructor(value: string) {
		super();
		// @ts-ignore
		super.textContent = value;
	}

	get nodeName() {
		return NodeName.TEXT;
	}

	get nodeType() {
		return 3
	}

	get nodeValue() {
		// @ts-ignore
		return super.textContent;
	}

	set textContent(value) {
		// @ts-ignore
		super.textContent = value;
		super.appendChild(new Text(this.nodeValue))
	}

	get textContent() {
		// @ts-ignore
		return super.textContent;
	}

	toString() {
		return this.textContent;
	}

	appendChild() {}

	replaceChild() {}

	insertBefore() {}

	cloneNode() {
		return new Text(this.textContent);
	}
}