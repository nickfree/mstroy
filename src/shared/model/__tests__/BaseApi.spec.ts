import { afterEach, describe, expect, it, vi } from 'vitest';
import { BaseApi } from '../BaseApi';
import type { QueryParams } from '../../types';

type Item = {
  id: number
  label: string
}

class TestApi extends BaseApi {
  fetchItems(query?: QueryParams, signal?: AbortSignal): Promise<Item[]> {
    return this.get<Item[]>('/items', { query, signal });
  }

  fetchWithHeaders(headers: HeadersInit): Promise<Item[]> {
    return this.get<Item[]>('/items', { headers });
  }

  createItem(body: unknown): Promise<Item> {
    return this.post<Item>('/items', { body });
  }

  createItemWithoutBody(): Promise<Item> {
    return this.post<Item>('/items');
  }

  updateItem(body: unknown): Promise<Item> {
    return this.put<Item>('/items/1', { body });
  }

  patchItem(body: unknown): Promise<Item> {
    return this.patch<Item>('/items/1', { body });
  }

  removeItem(): Promise<void> {
    return this.delete<void>('/items/1');
  }

  fetchWithTimeout(timeout: number): Promise<Item[]> {
    return this.get<Item[]>('/items', { timeout });
  }
}

const jsonResponse = (data: unknown): Response => {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

const mockFetch = (response: Response): ReturnType<typeof vi.fn> => {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const hangingFetch = (): ReturnType<typeof vi.fn> => {
  const fetchMock = vi.fn(
    (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const requestArgs = (fetchMock: ReturnType<typeof vi.fn>): [string, RequestInit] => {
  return fetchMock.mock.calls[0] as [string, RequestInit];
};

const headerValue = (init: RequestInit, name: string): string | null => {
  return new Headers(init.headers).get(name);
};

describe('BaseApi', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('builds a URL with the query and parses the JSON response', async () => {
    const fetchMock = mockFetch(jsonResponse([{ id: 1, label: 'item' }]));
    const api = new TestApi('http://api.test/');

    await expect(
      api.fetchItems({
        status: 'active',
        page: 2,
        zero: 0,
        flag: false,
        skipNull: null,
        skipUndefined: undefined,
      }),
    ).resolves.toEqual([{ id: 1, label: 'item' }]);

    const [url, init] = requestArgs(fetchMock);

    expect(url).toBe(
      'http://api.test/items?status=active&page=2&zero=0&flag=false',
    );
    expect(init.method).toBe('GET');
    expect(headerValue(init, 'Accept')).toBe('application/json');
    expect(headerValue(init, 'Content-Type')).toBeNull();
  });

  it('strips trailing slashes from the base URL', async () => {
    const fetchMock = mockFetch(jsonResponse([]));
    const api = new TestApi('http://api.test///');

    await api.fetchItems();

    const [url] = requestArgs(fetchMock);

    expect(url).toBe('http://api.test/items');
  });

  it('supports a relative base URL', async () => {
    const fetchMock = mockFetch(jsonResponse([]));
    const api = new TestApi('/api');

    await api.fetchItems({ page: 1 });

    const [url] = requestArgs(fetchMock);

    expect(url).toBe('/api/items?page=1');
  });

  it('supports an empty base URL', async () => {
    const fetchMock = mockFetch(jsonResponse([]));
    const api = new TestApi('');

    await api.fetchItems();

    const [url] = requestArgs(fetchMock);

    expect(url).toBe('/items');
  });

  it('serializes the request body and sets JSON content type for POST', async () => {
    const fetchMock = mockFetch(jsonResponse({ id: 1, label: 'item' }));
    const api = new TestApi('http://api.test');

    await expect(api.createItem({ label: 'item' })).resolves.toEqual({
      id: 1,
      label: 'item',
    });

    const [, init] = requestArgs(fetchMock);

    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"label":"item"}');
    expect(headerValue(init, 'Accept')).toBe('application/json');
    expect(headerValue(init, 'Content-Type')).toBe('application/json');
  });

  it('accepts a Headers instance and lets it override defaults', async () => {
    const fetchMock = mockFetch(jsonResponse([]));
    const api = new TestApi('http://api.test');

    await api.fetchWithHeaders(
      new Headers({ Accept: 'text/plain', 'X-Test': 'value' }),
    );

    const [, init] = requestArgs(fetchMock);

    expect(headerValue(init, 'Accept')).toBe('text/plain');
    expect(headerValue(init, 'X-Test')).toBe('value');
  });

  it('returns undefined for a 204 response', async () => {
    mockFetch(new Response(null, { status: 204 }));
    const api = new TestApi('http://api.test');

    await expect(api.fetchItems()).resolves.toBeUndefined();
  });

  it('throws a descriptive error for a non-2xx response', async () => {
    mockFetch(
      new Response('unavailable', {
        status: 503,
        statusText: 'Service Unavailable',
      }),
    );
    const api = new TestApi('http://api.test');

    await expect(api.fetchItems()).rejects.toThrow(
      'Request failed: 503 Service Unavailable (http://api.test/items)',
    );
  });

  it('aborts the request when the caller signal is aborted', async () => {
    const fetchMock = hangingFetch();
    const api = new TestApi('http://api.test');
    const controller = new AbortController();
    const request = api.fetchItems(undefined, controller.signal);
    const assertion = expect(request).rejects.toMatchObject({ name: 'AbortError' });

    controller.abort();

    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects a request that exceeds the timeout', async () => {
    vi.useFakeTimers();
    hangingFetch();
    const api = new TestApi('http://api.test', 10);
    const request = api.fetchItems();
    const assertion = expect(request).rejects.toThrow(
      'Request timed out after 10 ms (http://api.test/items)',
    );

    await vi.advanceTimersByTimeAsync(10);

    await assertion;
  });

  it('uses a per-request timeout override', async () => {
    vi.useFakeTimers();
    hangingFetch();
    const api = new TestApi('http://api.test', 10_000);
    const request = api.fetchWithTimeout(10);
    const assertion = expect(request).rejects.toThrow(
      'Request timed out after 10 ms (http://api.test/items)',
    );

    await vi.advanceTimersByTimeAsync(10);

    await assertion;
  });

  it('sends PUT and PATCH with a serialized body', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: 1, label: 'updated' }))
      .mockResolvedValueOnce(jsonResponse({ id: 1, label: 'patched' }));
    vi.stubGlobal('fetch', fetchMock);
    const api = new TestApi('http://api.test');

    await api.updateItem({ label: 'updated' });
    await api.patchItem({ label: 'patched' });

    const [putUrl, putInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const [patchUrl, patchInit] = fetchMock.mock.calls[1] as [string, RequestInit];

    expect(putUrl).toBe('http://api.test/items/1');
    expect(putInit.method).toBe('PUT');
    expect(putInit.body).toBe('{"label":"updated"}');
    expect(headerValue(putInit, 'Content-Type')).toBe('application/json');

    expect(patchUrl).toBe('http://api.test/items/1');
    expect(patchInit.method).toBe('PATCH');
    expect(patchInit.body).toBe('{"label":"patched"}');
    expect(headerValue(patchInit, 'Content-Type')).toBe('application/json');
  });

  it('sends DELETE without a body or content type', async () => {
    const fetchMock = mockFetch(new Response(null, { status: 204 }));
    const api = new TestApi('http://api.test');

    await expect(api.removeItem()).resolves.toBeUndefined();

    const [url, init] = requestArgs(fetchMock);

    expect(url).toBe('http://api.test/items/1');
    expect(init.method).toBe('DELETE');
    expect(init.body).toBeUndefined();
    expect(headerValue(init, 'Content-Type')).toBeNull();
  });

  it('does not set a content type when the body is missing', async () => {
    const fetchMock = mockFetch(jsonResponse({ id: 1, label: 'item' }));
    const api = new TestApi('http://api.test');

    await api.createItemWithoutBody();

    const [, init] = requestArgs(fetchMock);

    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
    expect(headerValue(init, 'Content-Type')).toBeNull();
  });

  it('aborts before fetch when the caller signal is already aborted', async () => {
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      if (init?.signal?.aborted) {
        return Promise.reject(new DOMException('Aborted', 'AbortError'));
      }

      return Promise.resolve(jsonResponse([]));
    });
    vi.stubGlobal('fetch', fetchMock);
    const api = new TestApi('http://api.test');
    const controller = new AbortController();
    controller.abort();

    await expect(api.fetchItems(undefined, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
