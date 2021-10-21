import {SelectorType} from "../enums/SelectorType.enum";

export class Selector implements SelectorMock {
  constructor(
      public type: SelectorType,
      public name: SelectorMock['name'] = null,
      public value: SelectorMock['value'] = null,
      public operator: SelectorMock['operator'] = null,
      public modifier: SelectorMock['modifier'] = null,
  ) {
    if (!/tag|global|attribute|pseudo-class|combinator/.test(type)) {
        throw new Error('Invalid or missing selector type.')
    }
  }

  static global() {
    return new Selector(SelectorType.GLOBAL, null, '*')
  }

  static tag(name: string) {
    return new Selector(SelectorType.TAG, name)
  }

  static class(value: string) {
    return new Selector(SelectorType.ATTRIBUTE, 'class', value, '~')
  }

  static id(value: string) {
    return new Selector(SelectorType.ATTRIBUTE, 'id', value)
  }

  static attribute(name: string, value: SelectorMock['value'], operator: SelectorMock['operator'] = null, modifier: string | null = null) {
    return new Selector(SelectorType.ATTRIBUTE, name, value, operator, modifier)
  }

  static pseudoClass(name: string, value: SelectorMock['value'] = null) {
    return new Selector(SelectorType.PSEUDO_CLASS, name, value)
  }

  static combinator(value: string) {
    return new Selector(SelectorType.COMBINATOR, null, value)
  }

  toString() {
    switch (this.type) {
      case 'global':
        return this.value;
      case 'tag':
        return this.name;
      case 'combinator':
        return this.value === ' ' ? this.value : ` ${this.value} `;
      case 'attribute':
        switch (this.name) {
          case 'id':
            return `#${this.value}`;
          case 'class':
            return `.${this.value}`;
          default:
            return this.value === null
              ? `[${this.name}]`
              : `[${this.name}${this.operator || ''}="${this.value}"${this.modifier || ''}]`;
        }
      case 'pseudo-class':
        return this.value === null
          ? `:${this.name}`
          : `:${this.name}(${this.value})`;
      default:
        return '';
    }
  }
}
