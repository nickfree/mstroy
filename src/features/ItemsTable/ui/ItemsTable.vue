<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
} from 'vue';
import {
  SomeEntityApi,
  TreeStore,
  type ItemId,
  type SomeEntityItem,
} from '@/entities/SomeEntity';
import { type RowsChange, VisibleRowsModel } from '../model/rows';
import type { ItemsTableRow } from '../types';

type GridApi = {
  applyChanges?: (change: RowsChange) => void
}

const tableGridComponent = defineAsyncComponent(() => import('./ItemsTableGrid.vue'));

const store = shallowRef(new TreeStore());
const gridRows = shallowRef<ItemsTableRow[]>([]);
const gridRef = ref<GridApi | null>(null);

const api = new SomeEntityApi();
const isLoading = ref(true);
const error = ref('');

let activeController: AbortController | undefined;
let rowsModel: VisibleRowsModel | undefined;

const totalCount = computed(() => store.value.getAll().length);

const setItems = (items: SomeEntityItem[]): void => {
  const tree = new TreeStore(items);
  store.value = tree;
  rowsModel = new VisibleRowsModel(tree);
  gridRows.value = rowsModel.getRows().slice();
};

const toggle = (id: ItemId): void => {
  const change = rowsModel?.toggle(id);
  if (change) {
    gridRef.value?.applyChanges?.(change);
  }
};

const loadItems = async (): Promise<void> => {
  activeController?.abort();
  const controller = new AbortController();
  activeController = controller;

  isLoading.value = true;
  error.value = '';

  try {
    const items = await api.fetchItems(controller.signal);
    if (controller.signal.aborted) return;
    setItems(items);
  } catch (cause) {
    if (controller.signal.aborted) return;
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить элементы';
  } finally {
    if (activeController === controller) {
      isLoading.value = false;
    }
  }
};

onMounted(loadItems);

onBeforeUnmount(() => {
  activeController?.abort();
});
</script>

<template>
  <div class="items-table">
    <header class="items-table__header">
      <div>
        <h1 class="items-table__title">
          Элементы хранилища
        </h1>
        <p class="items-table__subtitle">
          Дерево элементов из json-server
        </p>
      </div>
      <span
        v-if="!isLoading && !error"
        class="items-table__count"
      >
        Всего: {{ totalCount.toLocaleString('ru-RU') }}
      </span>
    </header>

    <p
      v-if="isLoading"
      class="items-table__status"
      role="status"
      aria-live="polite"
    >
      Загрузка элементов…
    </p>
    <div
      v-else-if="error"
      class="items-table__status items-table__status--error"
      role="alert"
    >
      <p class="items-table__error">
        {{ error }}
      </p>
      <button
        type="button"
        class="items-table__retry"
        @click="loadItems"
      >
        Повторить
      </button>
    </div>
    <div
      v-else
      class="items-table__grid"
    >
      <component
        :is="tableGridComponent"
        ref="gridRef"
        :rows="gridRows"
        :handle-toggle="toggle"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.items-table {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 24px;

  &__header {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }

  &__title {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
  }

  &__subtitle {
    margin: 4px 0 0;
    color: #5f6368;
    font-size: 14px;
  }

  &__count {
    padding: 6px 12px;
    border-radius: 999px;
    background: #e8f0fe;
    color: #1a73e8;
    font-size: 14px;
    font-weight: 600;
  }

  &__status {
    padding: 48px 0;
    color: #5f6368;
    text-align: center;

    &--error {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      color: #d93025;
    }
  }

  &__error {
    margin: 0;
  }

  &__retry {
    padding: 8px 16px;
    border: 0;
    border-radius: 8px;
    background: #1a73e8;
    color: #fff;
    cursor: pointer;
    font: inherit;

    &:hover {
      background: #1765cc;
    }

    &:focus-visible {
      outline: 2px solid #174ea6;
      outline-offset: 2px;
    }
  }

  &__grid {
    flex: 1;
    min-height: 0;
  }
}
</style>
