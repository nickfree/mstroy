import { describe, expect, it } from 'vitest';
import { treeRootParentId } from '../../config';
import { TreeStore } from '../TreeStore';
import type { SomeEntityItem } from '../../types';

const items: SomeEntityItem[] = [
  { id: 1, parent: null, label: 'root' },
  { id: 2, parent: 1, label: 'child-a' },
  { id: 3, parent: 1, label: 'child-b' },
  { id: '2.1', parent: 2, label: 'grandchild' },
  { id: 5, parent: 3, label: 'child-b-1' },
];

const createStore = (): TreeStore => {
  return new TreeStore(items);
};

const ids = (values: readonly SomeEntityItem[]): Array<SomeEntityItem['id']> => {
  return values.map((item) => item.id);
};

describe('TreeStore', () => {
  describe('reading', () => {
    it('returns all items in the original order', () => {
      const store = createStore();

      expect(store.getAll()).toHaveLength(items.length);
      expect(ids(store.getAll())).toEqual([1, 2, 3, '2.1', 5]);
    });

    it('finds an item by id and returns undefined for unknown ids', () => {
      const store = createStore();

      expect(store.getItem(2)).toMatchObject({ id: 2, parent: 1, label: 'child-a' });
      expect(store.getItem(999)).toBeUndefined();
    });

    it('returns direct children in insertion order', () => {
      const store = createStore();

      expect(ids(store.getChildren(treeRootParentId))).toEqual([1]);
      expect(ids(store.getChildren(1))).toEqual([2, 3]);
      expect(ids(store.getChildren(3))).toEqual([5]);
      expect(store.getChildren('2.1')).toEqual([]);
      expect(store.getChildren(999)).toEqual([]);
    });

    it('returns all descendants in depth-first order without the item itself', () => {
      const store = createStore();

      expect(ids(store.getAllChildren(1))).toEqual([2, '2.1', 3, 5]);
      expect(ids(store.getAllChildren(2))).toEqual(['2.1']);
      expect(store.getAllChildren(5)).toEqual([]);
      expect(store.getAllChildren(999)).toEqual([]);
    });

    it('returns the item and its ancestors from the item up to the root child', () => {
      const store = createStore();

      expect(ids(store.getAllParents(5))).toEqual([5, 3, 1]);
      expect(ids(store.getAllParents('2.1'))).toEqual(['2.1', 2, 1]);
      expect(ids(store.getAllParents(1))).toEqual([1]);
      expect(store.getAllParents(999)).toEqual([]);
    });

    it('keeps numeric and string ids distinct', () => {
      const store = new TreeStore([
        { id: 1, parent: null, label: 'number' },
        { id: '1', parent: null, label: 'string' },
      ]);

      expect(store.getItem(1)?.label).toBe('number');
      expect(store.getItem('1')?.label).toBe('string');
      expect(ids(store.getChildren(treeRootParentId))).toEqual([1, '1']);
    });
  });

  describe('setItems', () => {
    it('replaces existing data', () => {
      const store = createStore();
      const nextItems = [{ id: 10, parent: null, label: 'new-root' }];

      store.setItems(nextItems);

      expect(ids(store.getAll())).toEqual([10]);
      expect(store.getItem(1)).toBeUndefined();
      expect(ids(store.getChildren(treeRootParentId))).toEqual([10]);
    });

    it('rejects duplicate ids without changing the current tree', () => {
      const store = createStore();
      const duplicateItems = [...items, { id: 2, parent: 1, label: 'duplicate' }];

      expect(() => store.setItems(duplicateItems)).toThrow(
        'Item with id "2" already exists',
      );
      expect(ids(store.getAll())).toEqual([1, 2, 3, '2.1', 5]);
      expect(ids(store.getChildren(1))).toEqual([2, 3]);
    });

    it('rejects duplicate ids in the constructor', () => {
      expect(
        () =>
          new TreeStore([
            { id: 1, parent: null, label: 'first' },
            { id: 1, parent: null, label: 'second' },
          ]),
      ).toThrow('Item with id "1" already exists');
    });
  });

  describe('addItem', () => {
    it('adds an item to the flat list and to its parent children', () => {
      const store = createStore();

      store.addItem({ id: 6, parent: 3, label: 'child-b-2' });

      expect(store.getAll()).toHaveLength(6);
      expect(store.getItem(6)).toMatchObject({ id: 6, parent: 3 });
      expect(ids(store.getChildren(3))).toEqual([5, 6]);
      expect(ids(store.getAllChildren(1))).toEqual([2, '2.1', 3, 5, 6]);
    });

    it('rejects a duplicate id', () => {
      const store = createStore();

      expect(() => store.addItem({ id: 2, parent: 1, label: 'duplicate' })).toThrow(
        'Item with id "2" already exists',
      );
      expect(store.getAll()).toHaveLength(5);
    });

    it('rejects an item that is its own parent', () => {
      const store = createStore();

      expect(() => store.addItem({ id: 7, parent: 7, label: 'self' })).toThrow(
        'Cannot add an item as its own parent',
      );
      expect(store.getItem(7)).toBeUndefined();
    });
  });

  describe('removeItem', () => {
    it('removes the item together with its descendants', () => {
      const store = createStore();

      store.removeItem(2);

      expect(ids(store.getAll())).toEqual([1, 3, 5]);
      expect(store.getItem(2)).toBeUndefined();
      expect(store.getItem('2.1')).toBeUndefined();
      expect(ids(store.getChildren(1))).toEqual([3]);
    });

    it('removes the whole tree when the root is removed', () => {
      const store = createStore();

      store.removeItem(1);

      expect(store.getAll()).toEqual([]);
      expect(store.getChildren(treeRootParentId)).toEqual([]);
    });

    it('ignores an unknown id', () => {
      const store = createStore();

      expect(() => store.removeItem(999)).not.toThrow();
      expect(store.getAll()).toHaveLength(5);
    });
  });

  describe('updateItem', () => {
    it('updates an item without moving it', () => {
      const store = createStore();

      store.updateItem({ id: 2, parent: 1, label: 'renamed' });

      expect(store.getItem(2)).toMatchObject({ parent: 1, label: 'renamed' });
      expect(store.getChildren(1).map((item) => item.label)).toEqual([
        'renamed',
        'child-b',
      ]);
    });

    it('moves an item to another parent', () => {
      const store = createStore();

      store.updateItem({ id: 2, parent: 3, label: 'child-a' });

      expect(ids(store.getChildren(1))).toEqual([3]);
      expect(ids(store.getChildren(3))).toEqual([5, 2]);
      expect(ids(store.getAllParents(2))).toEqual([2, 3, 1]);
      expect(ids(store.getAllChildren(1))).toEqual([3, 5, 2, '2.1']);
    });

    it('rejects moving an item into its own subtree', () => {
      const store = createStore();

      expect(() =>
        store.updateItem({ id: 2, parent: '2.1', label: 'child-a' }),
      ).toThrow('Cannot move an item into its own subtree');
      expect(ids(store.getChildren(1))).toEqual([2, 3]);
    });

    it('rejects moving an item under itself', () => {
      const store = createStore();

      expect(() =>
        store.updateItem({ id: 2, parent: 2, label: 'child-a' }),
      ).toThrow('Cannot move an item into its own subtree');
    });

    it('rejects an unknown id', () => {
      const store = createStore();

      expect(() =>
        store.updateItem({ id: 999, parent: 1, label: 'unknown' }),
      ).toThrow('Item with id "999" not found');
    });
  });

  describe('cycles', () => {
    it('does not include the starting item in its descendants', () => {
      const store = new TreeStore([
        { id: 1, parent: 2, label: 'first' },
        { id: 2, parent: 1, label: 'second' },
      ]);

      expect(ids(store.getAllChildren(1))).toEqual([2]);
      expect(ids(store.getAllParents(1))).toEqual([1, 2]);
    });
  });
});
