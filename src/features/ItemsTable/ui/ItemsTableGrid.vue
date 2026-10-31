<script setup lang="ts">
import { AgGridVue } from 'ag-grid-vue3';
import {
  CellStyleModule,
  ClientSideRowModelApiModule,
  ClientSideRowModelModule,
  LocaleModule,
  ModuleRegistry,
  type GridApi,
  type GridReadyEvent,
} from 'ag-grid-community';
import type { ItemId } from '@/entities/SomeEntity';
import {
  createColumnDefs,
  itemsTableTheme,
  tableDefaultColDef,
  tableGridOptions,
} from '../config';
import type { RowsChange } from '../model/rows';
import type { ItemsTableRow } from '../types';

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  ClientSideRowModelApiModule,
  CellStyleModule,
  LocaleModule,
]);

interface Props {
  rows: ItemsTableRow[]
  handleToggle: (id: ItemId) => void
}

const props = defineProps<Props>();

const columnDefs = createColumnDefs(props.handleToggle);

let gridApi: GridApi<ItemsTableRow> | undefined;

const onGridReady = (event: GridReadyEvent<ItemsTableRow>): void => {
  gridApi = event.api;
};

const applyChanges = (change: RowsChange): void => {
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
    class="items-table-grid"
    :theme="itemsTableTheme"
    :column-defs="columnDefs"
    :default-col-def="tableDefaultColDef"
    :row-data="rows"
    :grid-options="tableGridOptions"
    @grid-ready="onGridReady"
  />
</template>

<style scoped lang="scss">
.items-table-grid {
  height: 100%;

  :deep(.ag-header-cell.ag-column-last)::after {
    border-right-color: transparent;
  }

  :deep(.ag-header-cell-resize)::after {
    display: none;
  }

  :deep(.items-table-grid__expander) {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    color: #5f6368;
  }

  :deep(.items-table-grid__expander-button) {
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

  :deep(.items-table-grid__expander--group) {
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

  :deep(.items-table-grid__expander--expanded)::before {
    transform: rotate(90deg);
  }
}
</style>
