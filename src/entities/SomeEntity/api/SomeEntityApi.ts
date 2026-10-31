import { BaseApi } from '@/shared';
import { itemsRequestDelayMs } from '../config';
import type { SomeEntityItem } from '../types';

const delay = (ms: number, signal?: AbortSignal): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const onAbort = (): void => {
      clearTimeout(timeoutId);
      reject(new DOMException('Aborted', 'AbortError'));
    };

    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    signal?.addEventListener('abort', onAbort, { once: true });
  });
};

export class SomeEntityApi extends BaseApi {
  async fetchItems(signal?: AbortSignal): Promise<SomeEntityItem[]> {
    await delay(itemsRequestDelayMs, signal);
    return this.get<SomeEntityItem[]>('/items', { signal });
  }
}
