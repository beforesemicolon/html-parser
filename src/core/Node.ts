import {NodeName} from "../enums/NodeName.enum";

export class Node implements NodeMock {
  private _parentNode: NodeMock['parentNode'] = null;
  private _childNodes: NodeMock['childNodes'] = [];
  private _textContent: NodeMock['textContent'] = '';

  get parentNode() {
    return this._parentNode as ElementMock;
  }

  set parentNode(value: ElementMock | null) {
    if (value === null || value instanceof Node) {
      this._parentNode = value;
    }
  }

  get nodeName(): NodeName | string {
    return NodeName.NODE;
  }

  get nodeType() {
    return 1;
  }

  get nodeValue() {
    return '';
  }

  get firstChild() {
    return this._childNodes[0] || null;
  }

  get lastChild() {
    return this._childNodes[this._childNodes.length - 1] || null;
  }

  get childNodes() {
    return [...this._childNodes];
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(value) {
    this._textContent = value;
    this._childNodes = [];
  }

  get prevSibling() {
    if (this.parentNode) {
      const sibs = this.parentNode.childNodes
      return sibs[sibs.indexOf(this as unknown as NodeMock) - 1] || null;
    }

    return null;
  }

  get nextSibling() {
    if (this.parentNode) {
      const sibs = this.parentNode.childNodes
      return sibs[sibs.indexOf(this as unknown as NodeMock) + 1] || null;
    }

    return null;
  }

  getRootNode() {
    return this.parentNode
        ? this.parentNode.getRootNode()
        : this as unknown as ElementMock;
  }

  appendChild(node: NodeMock) {
    if (node instanceof Node) {
      node.parentNode = this as unknown as ElementMock;
      this._childNodes.push(node);
    }
  }

  removeChild(node: NodeMock) {
    if (node instanceof Node) {
      this._childNodes.splice(this._childNodes.indexOf(node), 1);
      node.parentNode = null;
    }
  }

  replaceChild(newNode: NodeMock, oldNode: NodeMock) {
    if (newNode instanceof Node && this._childNodes.includes(oldNode)) {
      this._childNodes.splice(this._childNodes.indexOf(oldNode), 1, newNode);
      newNode.parentNode = this as unknown as ElementMock;
      oldNode.parentNode = null;
    }
  }

  hasChildNodes() {
    return this._childNodes.length > 0;
  }

  insertBefore(newNode: NodeMock, refNode: NodeMock) {
    if (newNode instanceof Node && this._childNodes.includes(refNode)) {
      this._childNodes.splice(this._childNodes.indexOf(refNode), 0, newNode);

      newNode.parentNode = this as unknown as ElementMock;
    }
  }
}

module.exports.Node = Node;
