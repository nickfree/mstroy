import { describe, expect, it } from 'vitest';
import { VisibleRowsModel } from '../rows';
import { TreeStore } from '../TreeStore';
import type { TreeNode, TreeRow } from '../../types';

type TestItem = TreeNode & { label: string };

const items: TestItem[] = [
  { id: 1, parent: null, label: 'root' },
  { id: 2, parent: 1, label: 'group-a' },
  { id: 3, parent: 1, label: 'group-b' },
  { id: 4, parent: 2, label: 'leaf-a' },
  { id: 5, parent: 3, label: 'leaf-b' },
  { id: 6, parent: 3, label: 'leaf-c' },
];

const createModel = (source: TestItem[] = items): VisibleRowsModel<TestItem> =>
  new VisibleRowsModel(new TreeStore(source));

const ids = (rows: TreeRow<TestItem>[]): Array<TestItem['id']> =>
  rows.map((row) => row.id);

describe('VisibleRowsModel', () => {
  it('starts with root groups expanded', () => {
    const model = createModel();

    expect(ids(model.getRows())).toEqual([1, 2, 3]);
    expect(model.getRows().map((row) => row.expanded)).toEqual([true, false, false]);
  });

  it('supports an initial expanded state', () => {
    const model = new VisibleRowsModel(new TreeStore(items), new Set([1, 2]));

    expect(ids(model.getRows())).toEqual([1, 2, 4, 3]);
  });

  it('expands a group by inserting only its subtree', () => {
    const model = createModel();
    const rows = model.getRows();

    const change = model.toggle(2);

    expect(change).not.toBeNull();
    expect(change?.added.map((row) => row.id)).toEqual([4]);
    expect(change?.removed).toEqual([]);
    expect(change?.updated.map((row) => row.id)).toEqual([2]);
    expect(change?.addIndex).toBe(2);
    expect(ids(model.getRows())).toEqual([1, 2, 4, 3]);
    expect(model.getRows()).toBe(rows);
  });

  it('collapses a group by removing its visible descendants', () => {
    const model = createModel();
    model.toggle(2);

    const change = model.toggle(2);

    expect(change?.added).toEqual([]);
    expect(change?.removed.map((row) => row.id)).toEqual([4]);
    expect(change?.updated[0]).toMatchObject({ id: 2, expanded: false });
    expect(change?.addIndex).toBeNull();
    expect(ids(model.getRows())).toEqual([1, 2, 3]);
  });

  it('restores nested expanded state after collapsing and expanding a parent', () => {
    const model = createModel();
    model.toggle(2);

    const collapsed = model.toggle(1);

    expect(collapsed?.removed.map((row) => row.id)).toEqual([2, 4, 3]);
    expect(ids(model.getRows())).toEqual([1]);

    const expanded = model.toggle(1);

    expect(expanded?.added.map((row) => row.id)).toEqual([2, 4, 3]);
    expect(expanded?.addIndex).toBe(1);
    expect(ids(model.getRows())).toEqual([1, 2, 4, 3]);
  });

  it('reuses cached row objects when a subtree is restored', () => {
    const model = createModel();
    model.toggle(2);
    const leaf = model.getRows().find((row) => row.id === 4);

    model.toggle(2);
    model.toggle(2);

    expect(model.getRows().find((row) => row.id === 4)).toBe(leaf);
  });

  it('ignores leaves and unknown or hidden ids', () => {
    const model = createModel();
    model.toggle(2);
    const rows = model.getRows();

    expect(model.toggle(4)).toBeNull();
    expect(model.toggle(999)).toBeNull();
    expect(model.toggle(5)).toBeNull();
    expect(model.getRows()).toBe(rows);
  });

  it('handles insertion chunks larger than the chunk size', () => {
    const source: TestItem[] = [{ id: 1, parent: null, label: 'root' }];
    for (let index = 0; index < 12_000; index += 1) {
      source.push({ id: index + 2, parent: 1, label: `child-${index}` });
    }

    const model = createModel(source);
    model.toggle(1);

    const change = model.toggle(1);

    expect(change?.added).toHaveLength(12_000);
    expect(model.getRows()).toHaveLength(12_001);
    expect(model.getRows()[0].id).toBe(1);
    expect(model.getRows()[1].id).toBe(2);
    expect(model.getRows()[12_000].id).toBe(12_001);
  });
});
