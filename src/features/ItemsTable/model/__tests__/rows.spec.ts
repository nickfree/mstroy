import { describe, expect, it } from 'vitest';
import { TreeStore, type SomeEntityItem } from '@/entities/SomeEntity';
import { buildVisibleRows, createExpandedIds } from '../rows';
import type { ItemsTableRow } from '../../types';

const items: SomeEntityItem[] = [
  { id: 1, parent: null, label: 'root' },
  { id: 2, parent: 1, label: 'child-a' },
  { id: 3, parent: 1, label: 'child-b' },
  { id: 4, parent: 2, label: 'grandchild' },
  { id: '4.1', parent: 4, label: 'deep-child' },
  { id: 5, parent: 3, label: 'child-b-1' },
  { id: 6, parent: 3, label: 'child-b-2' },
  { id: 7, parent: null, label: 'root-leaf' },
  { id: 8, parent: null, label: 'root-2' },
  { id: 9, parent: 8, label: 'root-2-child' },
];

const createStore = (): TreeStore => {
  return new TreeStore(items);
};

const expanded = (...values: Array<ItemsTableRow['id']>): Set<ItemsTableRow['id']> => {
  return new Set(values);
};

const ids = (rows: ItemsTableRow[]): Array<ItemsTableRow['id']> => {
  return rows.map((row) => row.id);
};

const levels = (rows: ItemsTableRow[]): number[] => {
  return rows.map((row) => row.level);
};

describe('ItemsTable rows', () => {
  describe('createExpandedIds', () => {
    it('expands only root items that have children', () => {
      const store = createStore();

      expect([...createExpandedIds(store)]).toEqual([1, 8]);
    });

    it('returns an empty set when no root has children', () => {
      const store = new TreeStore([{ id: 1, parent: null, label: 'only' }]);

      expect([...createExpandedIds(store)]).toEqual([]);
    });
  });

  describe('buildVisibleRows', () => {
    it('shows only roots when nothing is expanded', () => {
      const store = createStore();

      const rows = buildVisibleRows(store, expanded());

      expect(ids(rows)).toEqual([1, 7, 8]);
      expect(levels(rows)).toEqual([0, 0, 0]);
      expect(rows.map((row) => row.hasChildren)).toEqual([true, false, true]);
      expect(rows.map((row) => row.expanded)).toEqual([false, false, false]);
      expect(rows.map((row) => row.category)).toEqual([
        'Группа',
        'Элемент',
        'Группа',
      ]);
    });

    it('shows children of expanded groups only', () => {
      const store = createStore();

      const rows = buildVisibleRows(store, expanded(1));

      expect(ids(rows)).toEqual([1, 2, 3, 7, 8]);
      expect(levels(rows)).toEqual([0, 1, 1, 0, 0]);
      expect(rows.map((row) => row.expanded)).toEqual([
        true,
        false,
        false,
        false,
        false,
      ]);
    });

    it('walks nested expanded groups in depth-first order', () => {
      const store = createStore();

      const rows = buildVisibleRows(store, expanded(1, 2, 3, 8));

      expect(ids(rows)).toEqual([1, 2, 4, 3, 5, 6, 7, 8, 9]);
      expect(levels(rows)).toEqual([0, 1, 2, 1, 2, 2, 0, 0, 1]);
    });

    it('supports string ids at any depth', () => {
      const store = createStore();

      const rows = buildVisibleRows(store, expanded(1, 2, 4));

      expect(ids(rows)).toEqual([1, 2, 4, '4.1', 3, 7, 8]);
      expect(levels(rows)).toEqual([0, 1, 2, 3, 1, 0, 0]);
      expect(rows[3]).toMatchObject({
        id: '4.1',
        level: 3,
        category: 'Элемент',
        hasChildren: false,
      });
    });

    it('reuses unchanged rows from the cache', () => {
      const store = createStore();
      const cache = new Map<ItemsTableRow['id'], ItemsTableRow>();

      const collapsedRows = buildVisibleRows(store, expanded(1), cache);
      const expandedRows = buildVisibleRows(store, expanded(1, 2), cache);

      expect(expandedRows.find((row) => row.id === 1)).toBe(
        collapsedRows.find((row) => row.id === 1),
      );
      expect(expandedRows.find((row) => row.id === 2)).not.toBe(
        collapsedRows.find((row) => row.id === 2),
      );
      expect(expandedRows.find((row) => row.id === 2)?.expanded).toBe(true);
    });

    it('invalidates a cached row when its source data changes', () => {
      const store = createStore();
      const cache = new Map<ItemsTableRow['id'], ItemsTableRow>();
      const rows = buildVisibleRows(store, expanded(), cache);
      const original = rows.find((row) => row.id === 1);

      store.updateItem({ id: 1, parent: null, label: 'renamed' });
      const updatedRows = buildVisibleRows(store, expanded(), cache);
      const updated = updatedRows.find((row) => row.id === 1);

      expect(updated).not.toBe(original);
      expect(updated?.label).toBe('renamed');
    });

    it('does not render descendants of collapsed leaf ids', () => {
      const store = createStore();

      const rows = buildVisibleRows(store, expanded(1, 7));

      expect(ids(rows)).toEqual([1, 2, 3, 7, 8]);
      expect(rows.find((row) => row.id === 7)).toMatchObject({
        expanded: true,
        hasChildren: false,
        category: 'Элемент',
      });
    });
  });
});
