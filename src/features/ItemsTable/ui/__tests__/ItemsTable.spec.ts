// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SomeEntityApi, type SomeEntityItem } from '@/entities/SomeEntity';
import ItemsTable from '../ItemsTable.vue';
import type { RowsChange } from '../../model/rows';
import type { ItemsTableRow } from '../../types';

const applyChanges = vi.hoisted(() => vi.fn());

vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue')>();
  const gridStub = actual.defineComponent({
    name: 'ItemsTableGrid',
    props: {
      rows: { type: Array, required: true },
      handleToggle: { type: Function, required: true },
    },
    setup(props, { expose }) {
      expose({ applyChanges });

      return () =>
        actual.h('div', { class: 'items-table-grid-stub' }, String(props.rows.length));
    },
  });

  return {
    ...actual,
    defineAsyncComponent: (() => gridStub) as typeof actual.defineAsyncComponent,
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

const rowIds = (rows: ItemsTableRow[]): Array<ItemsTableRow['id']> => {
  return rows.map((row) => row.id);
};

describe('ItemsTable', () => {
  beforeEach(() => {
    applyChanges.mockClear();
  });

  it('shows loading, then renders the initially expanded tree', async () => {
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

    const grid = wrapper.findComponent({ name: 'ItemsTableGrid' });
    const rows = grid.props('rows') as ItemsTableRow[];

    expect(grid.exists()).toBe(true);
    expect(rowIds(rows)).toEqual([1, 2, 3]);
    expect(wrapper.text()).toContain('Всего: 4');
  });

  it('expands and collapses a group through the grid callback', async () => {
    vi.spyOn(SomeEntityApi.prototype, 'fetchItems').mockResolvedValue(items);
    const wrapper = mount(ItemsTable);

    await settle();

    const grid = wrapper.findComponent({ name: 'ItemsTableGrid' });
    const handleToggle = grid.props('handleToggle') as (id: number) => void;

    expect(rowIds(grid.props('rows') as ItemsTableRow[])).toEqual([1, 2, 3]);

    handleToggle(2);
    await nextTick();

    const expanded = applyChanges.mock.calls[0][0] as RowsChange;
    expect(expanded.added.map((row) => row.id)).toEqual([4]);
    expect(expanded.updated[0]).toMatchObject({ id: 2, expanded: true });
    expect(expanded.addIndex).toBe(2);

    handleToggle(2);
    await nextTick();

    const collapsed = applyChanges.mock.calls[1][0] as RowsChange;
    expect(collapsed.removed.map((row) => row.id)).toEqual([4]);
    expect(collapsed.updated[0]).toMatchObject({ id: 2, expanded: false });
    expect(collapsed.addIndex).toBeNull();
  });

  it('retries a failed request', async () => {
    vi.spyOn(SomeEntityApi.prototype, 'fetchItems')
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(items);
    const wrapper = mount(ItemsTable);

    await settle();

    expect(wrapper.text()).toContain('network down');
    expect(wrapper.findComponent({ name: 'ItemsTableGrid' }).exists()).toBe(false);

    await wrapper.get('button').trigger('click');
    await settle();

    expect(wrapper.text()).not.toContain('network down');
    expect(wrapper.findComponent({ name: 'ItemsTableGrid' }).exists()).toBe(true);
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
