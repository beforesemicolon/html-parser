import {Attr} from './Attr';

export class Attributes implements AttributesMock {
  _map: Map<string, AttrMock> = new Map();
  
  get length() {
    return this._map.size;
  }

  *[Symbol.iterator]() {
    for (let attr of this._map.values()) {
      yield attr
    }
  }
  
  getNamedItem(name: string) {
    return this._map.get(name) || null;
  }
  
  setNamedItem(name: string, value = '') {
    this._map.set(name, new Attr(name, value));
  }
  
  removeNamedItem(name: string) {
    this._map.delete(name);
  }
  
  toString() {
    return Array.from(this._map.values(), (val) => val.toString()).join(' ');
  }
}
