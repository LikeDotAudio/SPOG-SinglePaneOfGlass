// src/ui/console/mqtt-tree-nodes — the hierarchical topic TREE model + row render.
//
// Extracted from mqtt-tree.ts (audit §5.5 split). Pure helpers over the retained
// store: topics nest by their /-segments into fold-able branches. A branch remembers
// the operator's fold choice; untouched branches default to OPEN unless they fan out
// very wide (e.g. system/presence with hundreds of children).
export interface TreeNode { children: Map<string, TreeNode>; leaf?: { payload: string; ts: number } }

/** A retained-topic store: topic → last payload + receive timestamp. */
export type TopicStore = Map<string, { payload: string; ts: number }>;

export const escapeHtml = (s: string): string =>
  String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] ?? c));

/** Build the /-segment tree, stripping the `root/` prefix from each topic. */
export function buildTree(store: TopicStore, root: string): TreeNode {
  const treeRoot: TreeNode = { children: new Map() };
  for (const k of [...store.keys()].sort()) {
    const rel = k.startsWith(root + '/') ? k.slice(root.length + 1) : k;
    let node = treeRoot;
    for (const seg of rel.split('/')) {
      let next = node.children.get(seg);
      if (!next) { next = { children: new Map() }; node.children.set(seg, next); }
      node = next;
    }
    node.leaf = store.get(k)!;
  }
  return treeRoot;
}

export function leafCount(n: TreeNode): number {
  let c = n.leaf ? 1 : 0;
  for (const ch of n.children.values()) c += leafCount(ch);
  return c;
}

/**
 * Render the whole tree to `<tr>` HTML. `foldOverride` maps a branch path to its
 * collapsed state; branches with more than `wide` children default to collapsed.
 * `now` is the reference time (ms) for the per-leaf age column.
 */
export function renderRows(tree: TreeNode, foldOverride: Map<string, boolean>, wide: number, now: number): string {
  const out: string[] = [];
  const walk = (node: TreeNode, path: string, depth: number): void => {
    for (const [name, n] of node.children) {
      const full = path ? `${path}/${name}` : name;
      const pad = 14 + depth * 18;
      const isBranch = n.children.size > 0;
      if (!isBranch) {
        const { payload, ts } = n.leaf!;
        const age = Math.max(0, Math.round((now - ts) / 1000));
        out.push(`<tr class="leaf"><td class="topic" style="padding-left:${pad}px">` +
          `<span class="tick">·</span> ${escapeHtml(name)}</td>` +
          `<td class="val">${escapeHtml(payload)}</td><td class="age">${age}s</td></tr>`);
        continue;
      }
      const collapsed = foldOverride.get(full) ?? (n.children.size > wide);
      const ownVal = n.leaf ? escapeHtml(n.leaf.payload) : '';
      out.push(`<tr class="branch" data-path="${escapeHtml(full)}">` +
        `<td class="topic" style="padding-left:${pad}px">` +
        `<span class="caret">${collapsed ? '▸' : '▾'}</span> ${escapeHtml(name)}` +
        `<span class="cnt">${leafCount(n)}</span></td>` +
        `<td class="val">${ownVal}</td><td class="age"></td></tr>`);
      if (!collapsed) walk(n, full, depth + 1);
    }
  };
  walk(tree, '', 0);
  return out.join('');
}
