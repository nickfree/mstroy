<script setup lang="ts">
import { computed, watch } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import {
  CellStyleModule,
  ClientSideRowModelApiModule,
  ClientSideRowModelModule,
  LocaleModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type GridApi,
  type GridOptions,
  type GridReadyEvent,
} from 'ag-grid-community';
import type { TreeNode, TreeRow, TreeRowsChange } from '../types';
import {
  treeDefaultColDef,
  treeHeaderHeight,
  treeRowHeight,
  treeThemeParams,
} from '../config/table';

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  ClientSideRowModelApiModule,
  CellStyleModule,
  LocaleModule,
]);

interface Props {
  rows: TreeRow<TreeNode>[]
  columnDefs: ColDef[]
  defaultColDef?: ColDef
  localeText?: Record<string, string>
  themeParams?: Record<string, string | number | boolean>
}

type ThemeParams = Parameters<typeof themeQuartz.withParams>[0];

const props = defineProps<Props>();

const theme = computed(() =>
  themeQuartz.withParams({
    ...treeThemeParams,
    ...props.themeParams,
  } as ThemeParams),
);

const gridOptions = computed<GridOptions<TreeRow<TreeNode>>>(() => ({
  rowHeight: treeRowHeight,
  headerHeight: treeHeaderHeight,
  animateRows: false,
  getRowId: ({ data }) => `${typeof data.id}:${String(data.id)}`,
}));

let gridApi: GridApi<TreeRow<TreeNode>> | undefined;

const onGridReady = (event: GridReadyEvent<TreeRow<TreeNode>>): void => {
  gridApi = event.api;
};

watch(
  () => props.columnDefs,
  (columnDefs) => {
    gridApi?.setGridOption('columnDefs', columnDefs);
  },
);

const applyChanges = (change: TreeRowsChange<TreeNode>): void => {
  gridApi?.applyTransaction({
    add: change.added,
    addIndex: change.addIndex,
    remove: change.removed,
    update: change.updated,
  });
};

defineExpose({ applyChanges });
</script>

<template>
  <AgGridVue
    class="tree-grid"
    :theme="theme"
    :column-defs="props.columnDefs"
    :default-col-def="props.defaultColDef ?? treeDefaultColDef"
    :row-data="props.rows"
    :grid-options="gridOptions"
    :locale-text="props.localeText"
    @grid-ready="onGridReady"
  />
</template>

<style scoped lang="scss">
.tree-grid {
  height: 100%;

  :deep(.ag-header-cell.ag-column-last)::after {
    border-right-color: transparent;
  }

  :deep(.ag-header-cell-resize)::after {
    display: none;
  }

  :deep(.tree-grid__expander) {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    color: #5f6368;
  }

  :deep(.tree-grid__expander-button) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid #1a73e8;
      outline-offset: -2px;
    }
  }

  :deep(.tree-grid__expander--group) {
    cursor: pointer;

    &::before {
      content: '';
      width: 20px;
      height: 20px;
      background-color: currentColor;
      -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M9.29 6.71a1 1 0 0 1 1.42 0l4.58 4.58a1 1 0 0 1 0 1.42l-4.58 4.58a1 1 0 0 1-1.42-1.42L13.17 12 9.29 8.12a1 1 0 0 1 0-1.41Z'/%3E%3C/svg%3E") center / contain no-repeat;
      mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M9.29 6.71a1 1 0 0 1 1.42 0l4.58 4.58a1 1 0 0 1 0 1.42l-4.58 4.58a1 1 0 0 1-1.42-1.42L13.17 12 9.29 8.12a1 1 0 0 1 0-1.41Z'/%3E%3C/svg%3E") center / contain no-repeat;
      transition: transform 150ms ease;
    }

    &:hover {
      background-color: #e8f0fe;
      color: #1a73e8;
    }
  }

  :deep(.tree-grid__expander--expanded)::before {
    transform: rotate(90deg);
  }
}
</style>
