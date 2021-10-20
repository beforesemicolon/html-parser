export class Attr implements AttrMock {
  _name: string;
  _value: string;
  
  constructor(name: string, value: string = '') {
    this._name = name.toLowerCase();
    this._value = value;
  }
  
  get name() {
    return this._name;
  }
  
  get value() {
    return this._value;
  }
  
  toString() {
    // if the value is null is because the value was explicitly left out
    // otherwise it can contain value or be an empty string
    return (this.value === null ? this.name : `${this.name}="${this.value}"`);
  }
}