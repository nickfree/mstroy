// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { SomeEntityApi, type SomeEntityItem } from '@/entities/SomeEntity';
import ItemsTable from '../ItemsTable.vue';
import type { ItemsTableRow } from '../../types';
import {
  itemsTableColumnDefs,
  itemsTableExpanderLabels,
  itemsTableLocaleText,
} from '../../config';

vi.mock('@/shared/ui/TreeTable', async () => {
  const { defineComponent, h } = await import('vue');

  return {
    TreeTable: defineComponent({
      name: 'TreeTable',
      props: {
        items: { type: Array, required: true },
        columnDefs: { type: Array, required: true },
        getRowLabel: { type: Function, required: true },
        expanderLabels: { type: Object, default: undefined },
        localeText: { type: Object, default: undefined },
      },
      setup(props) {
        return () =>
          h('div', { class: 'tree-table-stub' }, String((props.items as unknown[]).length));
      },
    }),
  };
});

const items: SomeEntityItem[] = [
  { id: 1, parent: null, label: 'root' },
  { id: 2, parent: 1, label: 'group' },
  { id: 3, parent: 1, label: 'leaf' },
  { id: 4, parent: 2, label: 'nested' },
];

const settle = async (): Promise<void> => {
  await flushPromises();
  await nextTick();
  await flushPromises();
};

const rowIds = (rows: SomeEntityItem[]): Array<SomeEntityItem['id']> => {
  return rows.map((row) => row.id);
};

describe('ItemsTable', () => {
  it('shows loading, then passes loaded items to the tree', async () => {
    let resolveFetch: (value: SomeEntityItem[]) => void = () => undefined;
    const fetchItems = vi
      .spyOn(SomeEntityApi.prototype, 'fetchItems')
      .mockImplementation(
        () =>
          new Promise<SomeEntityItem[]>((resolve) => {
            resolveFetch = resolve;
          }),
      );
    const wrapper = mount(ItemsTable);

    expect(wrapper.classes()).toContain('items-table');
    expect(fetchItems).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('Загрузка элементов…');

    resolveFetch(items);
    await settle();

    const tree = wrapper.findComponent({ name: 'TreeTable' });

    expect(tree.exists()).toBe(true);
    expect(rowIds(tree.props('items') as SomeEntityItem[])).toEqual([1, 2, 3, 4]);
    expect(wrapper.text()).toContain('Всего: 4');
  });

  it('passes column config and labels to the tree', async () => {
    vi.spyOn(SomeEntityApi.prototype, 'fetchItems').mockResolvedValue(items);
    const wrapper = mount(ItemsTable);

    await settle();

    const tree = wrapper.findComponent({ name: 'TreeTable' });
    const getRowLabel = tree.props('getRowLabel') as (row: ItemsTableRow) => string;

    const row: ItemsTableRow = {
      ...items[0],
      hasChildren: false,
      expanded: false,
      level: 0,
    };

    expect(tree.props('columnDefs')).toBe(itemsTableColumnDefs);
    expect(tree.props('expanderLabels')).toEqual(itemsTableExpanderLabels);
    expect(tree.props('localeText')).toEqual(itemsTableLocaleText);
    expect(getRowLabel(row)).toBe('root');
  });

  it('retries a failed request', async () => {
    vi.spyOn(SomeEntityApi.prototype, 'fetchItems')
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(items);
    const wrapper = mount(ItemsTable);

    await settle();

    expect(wrapper.text()).toContain('network down');
    expect(wrapper.findComponent({ name: 'TreeTable' }).exists()).toBe(false);

    await wrapper.get('button').trigger('click');
    await settle();

    expect(wrapper.text()).not.toContain('network down');
    expect(wrapper.text()).toContain('Всего: 4');
    expect(wrapper.findComponent({ name: 'TreeTable' }).exists()).toBe(true);
  });

  it('aborts the request when unmounted', async () => {
    let signal: AbortSignal | undefined;
    vi.spyOn(SomeEntityApi.prototype, 'fetchItems').mockImplementation(
      (value?: AbortSignal) => {
        signal = value;
        return new Promise<SomeEntityItem[]>(() => undefined);
      },
    );
    const wrapper = mount(ItemsTable);

    await nextTick();
    expect(signal).toBeDefined();

    wrapper.unmount();

    expect(signal?.aborted).toBe(true);
  });
});
