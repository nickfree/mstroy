// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import TreeGrid from '../TreeGrid.vue';
import type { TreeNode, TreeRow, TreeRowsChange } from '../../types';
import {
  treeDefaultColDef,
  treeHeaderHeight,
  treeRowHeight,
} from '../../config/table';

vi.mock('ag-grid-vue3', async () => {
  const { defineComponent, h } = await import('vue');

  return {
    AgGridVue: defineComponent({
      name: 'AgGridVue',
      props: {
        rowData: { type: Array, default: () => [] },
        columnDefs: { type: Array, default: () => [] },
        defaultColDef: { type: Object, default: () => ({}) },
        gridOptions: { type: Object, default: () => ({}) },
        localeText: { type: Object, default: undefined },
        theme: { type: Object, default: undefined },
      },
      emits: ['gridReady'],
      setup() {
        return () => h('div', { class: 'ag-grid-stub' });
      },
    }),
  };
});

const createRow = (
  id: number,
  parent: number | null,
): TreeRow<TreeNode> => ({
  id,
  parent,
  hasChildren: false,
  expanded: false,
  level: parent === null ? 0 : 1,
});

describe('TreeGrid', () => {
  it('applies incremental changes through an AG Grid transaction', () => {
    const wrapper = mount(TreeGrid, {
      props: {
        rows: [],
        columnDefs: [],
      },
    });
    const grid = wrapper.findComponent({ name: 'AgGridVue' });
    const applyTransaction = vi.fn();

    expect(wrapper.classes()).toContain('tree-grid');
    const added = createRow(2, 1);
    const removed = createRow(3, 1);
    const updated = { ...createRow(1, null), hasChildren: true, expanded: true };
    const change: TreeRowsChange<TreeNode> = {
      added: [added],
      removed: [removed],
      updated: [updated],
      addIndex: 2,
    };

    grid.vm.$emit('gridReady', { api: { applyTransaction } });

    const exposed = wrapper.vm as unknown as {
      applyChanges: (rowsChange: TreeRowsChange<TreeNode>) => void
    };
    exposed.applyChanges(change);

    expect(applyTransaction).toHaveBeenCalledWith({
      add: [added],
      addIndex: 2,
      remove: [removed],
      update: [updated],
    });
  });

  it('configures row sizing and stable row ids', () => {
    const wrapper = mount(TreeGrid, {
      props: {
        rows: [],
        columnDefs: [],
      },
    });
    const grid = wrapper.findComponent({ name: 'AgGridVue' });
    const options = grid.props('gridOptions') as {
      rowHeight: number
      headerHeight: number
      getRowId: (params: { data: TreeRow<TreeNode> }) => string
    };

    expect(options.rowHeight).toBe(treeRowHeight);
    expect(options.headerHeight).toBe(treeHeaderHeight);
    expect(options.getRowId({ data: createRow(1, null) })).toBe('number:1');
    expect(options.getRowId({ data: { ...createRow(1, null), id: '1' } })).toBe('string:1');
    expect(grid.props('defaultColDef')).toBe(treeDefaultColDef);
  });

  it('updates column definitions through the grid api', async () => {
    const wrapper = mount(TreeGrid, {
      props: {
        rows: [],
        columnDefs: [],
      },
    });
    const grid = wrapper.findComponent({ name: 'AgGridVue' });
    const setGridOption = vi.fn();
    grid.vm.$emit('gridReady', { api: { applyTransaction: vi.fn(), setGridOption } });

    const columnDefs = [{ colId: 'label' }];
    await wrapper.setProps({ columnDefs });

    expect(setGridOption).toHaveBeenCalledWith('columnDefs', columnDefs);
  });

  it('ignores transactions before the grid is ready', () => {
    const wrapper = mount(TreeGrid, {
      props: {
        rows: [],
        columnDefs: [],
      },
    });
    const exposed = wrapper.vm as unknown as {
      applyChanges: (rowsChange: TreeRowsChange<TreeNode>) => void
    };

    expect(() =>
      exposed.applyChanges({
        added: [],
        removed: [],
        updated: [],
        addIndex: null,
      }),
    ).not.toThrow();
  });
});
