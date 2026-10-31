import { afterEach, describe, expect, it, vi } from 'vitest';
import { itemsRequestDelayMs } from '../../config';
import { SomeEntityApi } from '../SomeEntityApi';

const mockFetch = (data: unknown): ReturnType<typeof vi.fn> => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('SomeEntityApi', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('delays the request by 2 s', async () => {
    vi.useFakeTimers();
    const fetchMock = mockFetch([{ id: 1, parent: null, label: 'item' }]);
    const api = new SomeEntityApi('http://api.test');
    const request = api.fetchItems();

    await vi.advanceTimersByTimeAsync(itemsRequestDelayMs - 1);

    expect(fetchMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    await expect(request).resolves.toEqual([{ id: 1, parent: null, label: 'item' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('cancels the delay when the signal is aborted', async () => {
    vi.useFakeTimers();
    const fetchMock = mockFetch([]);
    const api = new SomeEntityApi('http://api.test');
    const controller = new AbortController();
    const request = api.fetchItems(controller.signal);
    const assertion = expect(request).rejects.toMatchObject({ name: 'AbortError' });

    controller.abort();

    await assertion;
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
