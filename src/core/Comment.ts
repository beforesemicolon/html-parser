import {Node} from "./Node";
import {NodeName} from "../enums/NodeName.enum";

export class Comment extends Node implements CommentMock {
	constructor(value: string) {
		super();
		// @ts-ignore
		super.textContent = value.trim();
	}

	get nodeName() {
		return NodeName.COMMENT;
	}

	get nodeType() {
		return 8
	}

	get nodeValue() {
		// @ts-ignore
		return super.textContent;
	}

	set textContent(value) {
		// @ts-ignore
		super.textContent = value;
		super.appendChild(new Comment(this.nodeValue))
	}

	get textContent() {
		// @ts-ignore
		return super.textContent;
	}

	toString() {
		return `<!-- ${this.textContent} -->`;
	}

	appendChild() {
	}

	replaceChild() {
	}

	insertBefore() {
	}

	cloneNode() {
		return new Comment(this.textContent);
	}
}
