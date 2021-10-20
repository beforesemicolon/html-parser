import {Element} from "./Element";
import {Text} from "./Text";
import {Comment} from "./Comment";

export class Document implements DocumentMock {
	createDocumentFragment() {
		return new Element(null) as unknown as ElementMock;
	}

	createElement(tagName: string) {
		return new Element(tagName) as unknown as ElementMock;
	}

	createComment(comment: string) {
		return new Comment(comment);
	}

	createTextNode(text: string) {
		return new Text(text);
	}
}