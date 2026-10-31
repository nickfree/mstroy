import {
  treeRootParentId,
  type ItemId,
  type SomeEntityItem,
  type TreeStore,
} from '@/entities/SomeEntity';
import { insertionChunkSize } from '../config';
import type { ItemsTableRow } from '../types';

export type RowsChange = {
  added: ItemsTableRow[]
  removed: ItemsTableRow[]
  updated: ItemsTableRow[]
  addIndex: number | null
}

const createRow = (
  tree: TreeStore,
  item: SomeEntityItem,
  level: number,
  expanded: boolean,
  cache?: Map<ItemId, ItemsTableRow>,
): ItemsTableRow => {
  const children = tree.getChildren(item.id);
  const hasChildren = children.length > 0;
  const category = hasChildren ? 'Группа' : 'Элемент';
  const cached = cache?.get(item.id);

  if (
    cached &&
    cached.parent === item.parent &&
    cached.label === item.label &&
    cached.level === level &&
    cached.hasChildren === hasChildren &&
    cached.expanded === expanded &&
    cached.category === category
  ) {
    return cached;
  }

  const row: ItemsTableRow = {
    ...item,
    hasChildren,
    expanded,
    level,
    category,
  };

  cache?.set(item.id, row);
  return row;
};

const collectRows = (
  tree: TreeStore,
  expandedIds: ReadonlySet<ItemId>,
  initialItems: readonly SomeEntityItem[],
  initialLevel: number,
  cache?: Map<ItemId, ItemsTableRow>,
): ItemsTableRow[] => {
  const result: ItemsTableRow[] = [];
  const stack: SomeEntityItem[] = [];
  const levels: number[] = [];

  for (let i = initialItems.length - 1; i >= 0; i -= 1) {
    stack.push(initialItems[i]);
    levels.push(initialLevel);
  }

  while (stack.length > 0) {
    const item = stack.pop();
    const level = levels.pop();
    if (!item || level === undefined) continue;

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

export const createExpandedIds = (tree: TreeStore): ReadonlySet<ItemId> =>
  new Set(
    tree
      .getChildren(treeRootParentId)
      .filter((item) => tree.getChildren(item.id).length > 0)
      .map((item) => item.id),
  );

export const buildVisibleRows = (
  tree: TreeStore,
  expandedIds: ReadonlySet<ItemId>,
  cache?: Map<ItemId, ItemsTableRow>,
): ItemsTableRow[] =>
  collectRows(
    tree,
    expandedIds,
    tree.getChildren(treeRootParentId),
    0,
    cache,
  );

export class VisibleRowsModel {
  private readonly tree: TreeStore;
  private readonly expandedIds: Set<ItemId>;
  private readonly cache = new Map<ItemId, ItemsTableRow>();
  private readonly rows: ItemsTableRow[];

  constructor(
    tree: TreeStore,
    initiallyExpandedIds: ReadonlySet<ItemId> = createExpandedIds(tree),
  ) {
    this.tree = tree;
    this.expandedIds = new Set(initiallyExpandedIds);
    this.rows = buildVisibleRows(tree, this.expandedIds, this.cache);
  }

  getRows(): ItemsTableRow[] {
    return this.rows;
  }

  toggle(id: ItemId): RowsChange | null {
    const index = this.rows.findIndex((row) => row.id === id);
    if (index === -1) return null;

    const row = this.rows[index];
    if (!row.hasChildren) return null;

    return this.expandedIds.has(id)
      ? this.collapse(index, row)
      : this.expand(index, row);
  }

  private expand(index: number, row: ItemsTableRow): RowsChange {
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

  private collapse(index: number, row: ItemsTableRow): RowsChange {
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

  private updateExpanded(
    row: ItemsTableRow,
    expanded: boolean,
  ): ItemsTableRow {
    if (row.expanded === expanded) return row;

    const updated: ItemsTableRow = { ...row, expanded };
    this.cache.set(row.id, updated);
    return updated;
  }

  private insertRows(index: number, rows: ItemsTableRow[]): void {
    for (let end = rows.length; end > 0; end -= insertionChunkSize) {
      const start = Math.max(0, end - insertionChunkSize);
      this.rows.splice(index, 0, ...rows.slice(start, end));
    }
  }
}
