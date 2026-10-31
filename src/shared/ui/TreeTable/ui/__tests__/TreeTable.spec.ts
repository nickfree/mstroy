// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ColDef } from 'ag-grid-community';
import TreeTable from '../TreeTable.vue';
import type { TreeNode, TreeRow, TreeRowsChange } from '../../types';
import { treeDefaultColDef } from '../../config/table';

const applyChanges = vi.hoisted(() => vi.fn());

vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue')>();
  const gridStub = actual.defineComponent({
    name: 'TreeGrid',
    props: {
      rows: { type: Array, required: true },
      columnDefs: { type: Array, required: true },
      defaultColDef: { type: Object, default: undefined },
      localeText: { type: Object, default: undefined },
      themeParams: { type: Object, default: undefined },
    },
    setup(_props, { expose }) {
      expose({ applyChanges });

      return () => actual.h('div', { class: 'tree-grid-stub' });
    },
  });

  return {
    ...actual,
    defineAsyncComponent: (() => gridStub) as typeof actual.defineAsyncComponent,
  };
});

const items: TreeNode[] = [
  { id: 1, parent: null },
  { id: 2, parent: 1 },
  { id: 3, parent: 1 },
  { id: 4, parent: 2 },
];

const columnDefs: ColDef<TreeRow<TreeNode>>[] = [
  { colId: 'id', field: 'id' },
];

const rowIds = (rows: TreeRow<TreeNode>[]): Array<TreeNode['id']> => {
  return rows.map((row) => row.id);
};

const mountTable = (source: TreeNode[] = items) =>
  mount(TreeTable, {
    props: {
      items: source,
      columnDefs,
      getRowLabel: (row: TreeRow<TreeNode>) => `item-${row.id}`,
      expanderLabels: {
        expand: 'Развернуть',
        collapse: 'Свернуть',
      },
      localeText: {
        noRowsToShow: 'Нет данных',
      },
    },
  });

describe('TreeTable', () => {
  beforeEach(() => {
    applyChanges.mockClear();
  });

  it('builds visible rows and prepends the expander column', () => {
    const wrapper = mountTable();
    const grid = wrapper.findComponent({ name: 'TreeGrid' });
    const defs = grid.props('columnDefs') as ColDef<TreeRow<TreeNode>>[];

    expect(rowIds(grid.props('rows') as TreeRow<TreeNode>[])).toEqual([1, 2, 3]);
    expect(defs[0].colId).toBe('expander');
    expect(defs[1]).toEqual(columnDefs[0]);
    expect(grid.props('localeText')).toEqual({ noRowsToShow: 'Нет данных' });
  });

  it('toggles a group and applies a transaction through the grid', async () => {
    const wrapper = mountTable();
    const grid = wrapper.findComponent({ name: 'TreeGrid' });
    const rows = grid.props('rows') as TreeRow<TreeNode>[];
    const group = rows.find((row) => row.id === 2);
    const expander = (grid.props('columnDefs') as ColDef<TreeRow<TreeNode>>[])[0];
    const render = expander.cellRenderer as (
      params: { data?: TreeRow<TreeNode> },
    ) => HTMLElement | string;
    const button = render({ data: group }) as HTMLButtonElement;

    expect(button.getAttribute('aria-label')).toBe('Развернуть «item-2»');

    button.click();
    await nextTick();

    const change = applyChanges.mock.calls[0][0] as TreeRowsChange<TreeNode>;

    expect(change.added.map((row) => row.id)).toEqual([4]);
    expect(change.updated[0]).toMatchObject({ id: 2, expanded: true });
    expect(change.addIndex).toBe(2);
  });

  it('rebuilds rows when the items prop changes', async () => {
    const wrapper = mountTable();
    const grid = wrapper.findComponent({ name: 'TreeGrid' });

    await wrapper.setProps({
      items: [{ id: 10, parent: null }],
    });
    await nextTick();

    expect(rowIds(grid.props('rows') as TreeRow<TreeNode>[])).toEqual([10]);
  });

  it('passes the default grid configuration and expander labels', () => {
    const wrapper = mount(TreeTable, {
      props: {
        items,
        columnDefs,
        getRowLabel: (row: TreeRow<TreeNode>) => `item-${row.id}`,
      },
    });
    const grid = wrapper.findComponent({ name: 'TreeGrid' });
    const rows = grid.props('rows') as TreeRow<TreeNode>[];
    const expander = (grid.props('columnDefs') as ColDef<TreeRow<TreeNode>>[])[0];
    const render = expander.cellRenderer as (
      params: { data?: TreeRow<TreeNode> },
    ) => HTMLElement | string;
    const button = render({ data: rows.find((row) => row.id === 2) }) as HTMLButtonElement;

    expect(grid.props('defaultColDef')).toBe(treeDefaultColDef);
    expect(grid.props('localeText')).toBeUndefined();
    expect(grid.props('themeParams')).toBeUndefined();
    expect(button.getAttribute('aria-label')).toBe('Expand «item-2»');
  });

  it('forwards custom column and theme configuration', () => {
    const defaultColDef: ColDef<TreeRow<TreeNode>> = { sortable: true };
    const themeParams = { rowHeight: 50 };
    const wrapper = mount(TreeTable, {
      props: {
        items,
        columnDefs,
        getRowLabel: (row: TreeRow<TreeNode>) => `item-${row.id}`,
        defaultColDef,
        themeParams,
      },
    });
    const grid = wrapper.findComponent({ name: 'TreeGrid' });

    expect(grid.props('defaultColDef')).toEqual(defaultColDef);
    expect(grid.props('themeParams')).toEqual(themeParams);
  });
});
