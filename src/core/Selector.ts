export class Selector {
  constructor(
      public type: selectorType,
      public name: string | null = null,
      public value: string | Selector | Array<Array<Selector>> | null = null,
      public operator: string | null = null,
      public modifier: string | null = null,
  ) {
    if (!/tag|global|attribute|pseudo-class|combinator/.test(type)) {
        throw new Error('Invalid or missing selector type.')
    }
  }

  static global() {
    return new Selector(selectorType.GLOBAL, null, '*')
  }

  static tag(name: string) {
    return new Selector(selectorType.TAG, name)
  }

  static class(value: string) {
    return new Selector(selectorType.ATTRIBUTE, 'class', value, '~')
  }

  static id(value: string) {
    return new Selector(selectorType.ATTRIBUTE, 'id', value)
  }

  static attribute(name: string, value: string, operator: string | null = null, modifier: string | null = null) {
    return new Selector(selectorType.ATTRIBUTE, name, value, operator, modifier)
  }

  static pseudoClass(name: string, value: string | Selector | Array<Array<Selector>>) {
    return new Selector(selectorType.PSEUDO_CLASS, name, value)
  }

  static combinator(value: string) {
    return new Selector(selectorType.COMBINATOR, null, value)
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
