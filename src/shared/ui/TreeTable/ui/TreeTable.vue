<script setup lang="ts" generic="T extends TreeNode">
import {
  computed,
  defineAsyncComponent,
  ref,
  shallowRef,
  watch,
} from 'vue';
import type { ColDef } from 'ag-grid-community';
import { TreeStore } from '../model/TreeStore';
import { VisibleRowsModel } from '../model/rows';
import type {
  ExpanderLabels,
  TreeNode,
  TreeRow,
  TreeRowsChange,
} from '../types';
import {
  createExpanderColumn,
  defaultExpanderLabels,
  treeDefaultColDef,
} from '../config/table';

const treeGridComponent = defineAsyncComponent(() => import('./TreeGrid.vue'));

interface Props {
  items: readonly T[]
  columnDefs: ColDef<TreeRow<T>>[]
  getRowLabel: (row: TreeRow<T>) => string
  expanderLabels?: ExpanderLabels
  defaultColDef?: ColDef<TreeRow<T>>
  localeText?: Record<string, string>
  themeParams?: Record<string, string | number | boolean>
}

type GridRef = {
  applyChanges?: (change: TreeRowsChange<T>) => void
}

const props = defineProps<Props>();

const store = new TreeStore<T>();
const gridRows = shallowRef<TreeRow<T>[]>([]);
const gridRef = ref<GridRef | null>(null);

let rowsModel: VisibleRowsModel<T> | undefined;

const rebuildRows = (): void => {
  rowsModel = new VisibleRowsModel(store);
  gridRows.value = rowsModel.getRows().slice();
};

watch(
  () => props.items,
  (items) => {
    store.setItems(items);
    rebuildRows();
  },
  { immediate: true },
);

const toggle = (id: T['id']): void => {
  const change = rowsModel?.toggle(id);
  if (change) {
    gridRef.value?.applyChanges?.(change);
  }
};

const allColumnDefs = computed<ColDef<TreeRow<T>>[]>(() => {
  const expander = createExpanderColumn<T>(
    toggle,
    props.getRowLabel,
    props.expanderLabels ?? defaultExpanderLabels,
  );

  return [expander, ...props.columnDefs];
});
</script>

<template>
  <component
    :is="treeGridComponent"
    ref="gridRef"
    :rows="gridRows"
    :column-defs="allColumnDefs"
    :default-col-def="props.defaultColDef ?? treeDefaultColDef"
    :locale-text="props.localeText"
    :theme-params="props.themeParams"
  />
</template>
