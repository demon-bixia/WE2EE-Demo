/** Dispatch event on click outside of node */
export function clickOutside(node: Node) {
  const handleClick = (event: MouseEvent) => {
    if (node && !node.contains((event.target as Node)) && !event.defaultPrevented) {
      node.dispatchEvent(
        new CustomEvent('outside', (node as any))
      )
    }
  }

  document.addEventListener('click', handleClick, true);

  return {
    destroy() {
      // the node has been removed from the DOM
      document.removeEventListener('click', handleClick, true);
    }
  }
}