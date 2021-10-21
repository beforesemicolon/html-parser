import {Node} from './Node';
import {Element} from "./Element";

describe('Node', () => {
  const node = new Node();
  
  it('should get/set parent', () => {
    expect(node.parentNode).toBe(null);
  
    node.parentNode = new Element();
  
    expect(node.parentNode).toBeInstanceOf(Node);
  });
});
