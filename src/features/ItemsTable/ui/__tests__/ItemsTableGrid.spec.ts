// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import ItemsTableGrid from '../ItemsTableGrid.vue';
import type { RowsChange } from '../../model/rows';
import type { ItemsTableRow } from '../../types';

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
        theme: { type: Object, default: undefined },
      },
      emits: ['gridReady'],
      setup() {
        return () => h('div', { class: 'ag-grid-stub' });
      },
    }),
  };
});

describe('ItemsTableGrid', () => {
  it('applies incremental changes through an AG Grid transaction', () => {
    const wrapper = mount(ItemsTableGrid, {
      props: {
        rows: [],
        handleToggle: vi.fn(),
      },
    });
    const grid = wrapper.findComponent({ name: 'AgGridVue' });
    const applyTransaction = vi.fn();

    expect(wrapper.classes()).toContain('items-table-grid');
    const added: ItemsTableRow = {
      id: 2,
      parent: 1,
      label: 'added',
      hasChildren: false,
      expanded: false,
      level: 1,
      category: 'Элемент',
    };
    const removed: ItemsTableRow = {
      id: 3,
      parent: 1,
      label: 'removed',
      hasChildren: false,
      expanded: false,
      level: 1,
      category: 'Элемент',
    };
    const updated: ItemsTableRow = {
      id: 1,
      parent: null,
      label: 'updated',
      hasChildren: true,
      expanded: true,
      level: 0,
      category: 'Группа',
    };
    const change: RowsChange = {
      added: [added],
      removed: [removed],
      updated: [updated],
      addIndex: 2,
    };

    grid.vm.$emit('gridReady', { api: { applyTransaction } });

    const exposed = wrapper.vm as unknown as {
      applyChanges: (rowsChange: RowsChange) => void
    };
    exposed.applyChanges(change);

    expect(applyTransaction).toHaveBeenCalledWith({
      add: [added],
      addIndex: 2,
      remove: [removed],
      update: [updated],
    });
  });
});
