export function traverseNodeAncestors(node: NodeMock, cb = (node: ElementMock) => false): void {
  let quit = false;
  let parent = node.parentNode;
  
  while (!quit && parent) {
    quit = cb(parent);
    
    if (quit) {
        break;
    }
    
    parent = parent.parentNode
  }
}
