export function traverseNodeDescendents(node: ElementMock, cb = (child: ElementMock) => false): boolean {
  let quit = false;
  
  for (let child of node.children) {
    quit = cb(child);
    
    if (quit) {
      node = child;
      break;
    }
  }
  
  if (!quit) {
    for (let child of node.children) {
      quit = traverseNodeDescendents(child, cb);
      
      if (quit) {
        break
      }
    }
  }
  
  return quit;
}
