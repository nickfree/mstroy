import { insertionChunkSize } from '../config/rows';
import type { TreeStore } from './TreeStore';
import type {
  TreeNode,
  TreeRow,
  TreeRowCache,
  TreeRowsChange,
} from '../types';

const createRow = <T extends TreeNode>(
  tree: TreeStore<T>,
  item: T,
  level: number,
  expanded: boolean,
  cache?: TreeRowCache<T>,
): TreeRow<T> => {
  const children = tree.getChildren(item.id);
  const hasChildren = children.length > 0;
  const cached = cache?.get(item.id);

  if (
    cached &&
    cached.item === item &&
    cached.row.level === level &&
    cached.row.hasChildren === hasChildren &&
    cached.row.expanded === expanded
  ) {
    return cached.row;
  }

  const row: TreeRow<T> = {
    ...item,
    hasChildren,
    expanded,
    level,
  };

  cache?.set(item.id, { item, row });
  return row;
};

const collectRows = <T extends TreeNode>(
  tree: TreeStore<T>,
  expandedIds: ReadonlySet<T['id']>,
  initialItems: readonly T[],
  initialLevel: number,
  cache?: TreeRowCache<T>,
): TreeRow<T>[] => {
  const result: TreeRow<T>[] = [];
  const stack: T[] = [];
  const levels: number[] = [];
  const seen = new Set<T['id']>();

  for (let i = initialItems.length - 1; i >= 0; i -= 1) {
    stack.push(initialItems[i]);
    levels.push(initialLevel);
  }

  while (stack.length > 0) {
    const item = stack.pop();
    const level = levels.pop();
    if (!item || level === undefined || seen.has(item.id)) continue;

    seen.add(item.id);
    const children = tree.getChildren(item.id);
    const isExpanded = expandedIds.has(item.id);
    result.push(createRow(tree, item, level, isExpanded, cache));

    if (children.length > 0 && isExpanded) {
      for (let i = children.length - 1; i >= 0; i -= 1) {
        stack.push(children[i]);
        levels.push(level + 1);
      }
    }
  }

  return result;
};

export const createExpandedIds = <T extends TreeNode>(
  tree: TreeStore<T>,
): ReadonlySet<T['id']> =>
  new Set(
    tree
      .getChildren(null)
      .filter((item) => tree.getChildren(item.id).length > 0)
      .map((item) => item.id),
  );

export const buildVisibleRows = <T extends TreeNode>(
  tree: TreeStore<T>,
  expandedIds: ReadonlySet<T['id']>,
  cache?: TreeRowCache<T>,
): TreeRow<T>[] => collectRows(tree, expandedIds, tree.getChildren(null), 0, cache);

export class VisibleRowsModel<T extends TreeNode> {
  private readonly tree: TreeStore<T>;
  private readonly expandedIds: Set<T['id']>;
  private readonly cache: TreeRowCache<T> = new Map();
  private readonly rows: TreeRow<T>[];

  constructor(
    tree: TreeStore<T>,
    initiallyExpandedIds: ReadonlySet<T['id']> = createExpandedIds(tree),
  ) {
    this.tree = tree;
    this.expandedIds = new Set(initiallyExpandedIds);
    this.rows = buildVisibleRows(tree, this.expandedIds, this.cache);
  }

  getRows(): TreeRow<T>[] {
    return this.rows;
  }

  toggle(id: T['id']): TreeRowsChange<T> | null {
    const index = this.rows.findIndex((row) => row.id === id);
    if (index === -1) return null;

    const row = this.rows[index];
    if (!row.hasChildren) return null;

    return this.expandedIds.has(id)
      ? this.collapse(index, row)
      : this.expand(index, row);
  }

  private expand(index: number, row: TreeRow<T>): TreeRowsChange<T> {
    this.expandedIds.add(row.id);

    const updated = this.updateExpanded(row, true);
    this.rows[index] = updated;

    const added = collectRows(
      this.tree,
      this.expandedIds,
      this.tree.getChildren(row.id),
      row.level + 1,
      this.cache,
    );
    this.insertRows(index + 1, added);

    return { added, removed: [], updated: [updated], addIndex: index + 1 };
  }

  private collapse(index: number, row: TreeRow<T>): TreeRowsChange<T> {
    this.expandedIds.delete(row.id);

    let end = index + 1;
    while (end < this.rows.length && this.rows[end].level > row.level) {
      end += 1;
    }
    const removed = this.rows.splice(index + 1, end - index - 1);

    const updated = this.updateExpanded(row, false);
    this.rows[index] = updated;

    return { added: [], removed, updated: [updated], addIndex: null };
  }

  private updateExpanded(row: TreeRow<T>, expanded: boolean): TreeRow<T> {
    if (row.expanded === expanded) return row;

    const updated: TreeRow<T> = { ...row, expanded };
    const cached = this.cache.get(row.id);
    if (cached) {
      this.cache.set(row.id, { item: cached.item, row: updated });
    }
    return updated;
  }

  private insertRows(index: number, rows: TreeRow<T>[]): void {
    for (let end = rows.length; end > 0; end -= insertionChunkSize) {
      const start = Math.max(0, end - insertionChunkSize);
      this.rows.splice(index, 0, ...rows.slice(start, end));
    }
  }
}
