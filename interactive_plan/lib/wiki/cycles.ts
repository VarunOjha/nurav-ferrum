/**
 * Every node that lies on a directed cycle (IP-9 review fix): the members of each strongly connected
 * component with more than one node, plus every node with a self-loop. Iterative Tarjan, so deep
 * graphs cannot overflow the stack. Used by the PHASE-ORDER lint rule and by phaseDag (roadmap), so
 * both report the same set. A plain DFS that collects only the stack slice of each back edge misses
 * nodes whose only way back onto a cycle passes through an already finished node.
 *
 * `deps(id)` may return ids outside `nodes`; those are ignored.
 */
export function cycleNodes(nodes: readonly string[], deps: (id: string) => readonly string[]): Set<string> {
  const inGraph = new Set(nodes);
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const out = new Set<string>();
  let next = 0;

  for (const root of nodes) {
    if (index.has(root)) continue;
    const work: { id: string; succ: string[]; i: number }[] = [];
    const open = (id: string) => {
      index.set(id, next);
      low.set(id, next);
      next++;
      stack.push(id);
      onStack.add(id);
      work.push({ id, succ: deps(id).filter((d) => inGraph.has(d)), i: 0 });
    };
    open(root);
    while (work.length) {
      const top = work[work.length - 1];
      if (top.i < top.succ.length) {
        const d = top.succ[top.i++];
        if (d === top.id) out.add(d); // self-loop
        if (!index.has(d)) open(d);
        else if (onStack.has(d)) low.set(top.id, Math.min(low.get(top.id)!, index.get(d)!));
        continue;
      }
      work.pop();
      if (work.length) {
        const parent = work[work.length - 1].id;
        low.set(parent, Math.min(low.get(parent)!, low.get(top.id)!));
      }
      if (low.get(top.id) === index.get(top.id)) {
        const scc: string[] = [];
        let x: string;
        do {
          x = stack.pop()!;
          onStack.delete(x);
          scc.push(x);
        } while (x !== top.id);
        if (scc.length > 1) for (const m of scc) out.add(m);
      }
    }
  }
  return out;
}
