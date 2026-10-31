import { apiBaseUrl, apiRequestTimeoutMs } from '../config';
import type { QueryParams, RequestOptions } from '../types';

const serializeJsonBody = (body: unknown): string | undefined =>
  body === undefined ? undefined : JSON.stringify(body);

export class BaseApi {
  protected readonly baseUrl: string;
  protected readonly requestTimeout: number;

  constructor(baseUrl: string = apiBaseUrl, requestTimeout: number = apiRequestTimeoutMs) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.requestTimeout = requestTimeout;
  }

  protected get<T>(path: string, options: RequestOptions<never> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  protected post<TResponse, TBody = unknown>(
    path: string,
    options: RequestOptions<TBody> = {},
  ): Promise<TResponse> {
    return this.send<TResponse, TBody>('POST', path, options);
  }

  protected put<TResponse, TBody = unknown>(
    path: string,
    options: RequestOptions<TBody> = {},
  ): Promise<TResponse> {
    return this.send<TResponse, TBody>('PUT', path, options);
  }

  protected patch<TResponse, TBody = unknown>(
    path: string,
    options: RequestOptions<TBody> = {},
  ): Promise<TResponse> {
    return this.send<TResponse, TBody>('PATCH', path, options);
  }

  protected delete<T>(path: string, options: RequestOptions<never> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  private send<TResponse, TBody>(
    method: string,
    path: string,
    options: RequestOptions<TBody>,
  ): Promise<TResponse> {
    return this.request<TResponse>(path, {
      ...options,
      method,
      body: serializeJsonBody(options.body),
    });
  }

  protected async request<T>(
    path: string,
    options: RequestOptions & { method: string },
  ): Promise<T> {
    const { query, headers, timeout = this.requestTimeout, signal, ...init } = options;
    const url = this.buildUrl(path, query);
    const requestHeaders = new Headers(headers);
    const controller = new AbortController();

    if (!requestHeaders.has('Accept')) {
      requestHeaders.set('Accept', 'application/json');
    }

    if (init.body !== undefined && !requestHeaders.has('Content-Type')) {
      requestHeaders.set('Content-Type', 'application/json');
    }

    let timedOut = false;
    const timeoutId =
      timeout > 0
        ? setTimeout(() => {
            timedOut = true;
            controller.abort();
          }, timeout)
        : undefined;
    const abortFromSignal = (): void => controller.abort(signal?.reason);

    if (signal?.aborted) {
      controller.abort(signal.reason);
    } else {
      signal?.addEventListener('abort', abortFromSignal);
    }

    try {
      const response = await fetch(url, {
        ...init,
        headers: requestHeaders,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText} (${url})`);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (cause) {
      if (timedOut) {
        throw new Error(`Request timed out after ${timeout} ms (${url})`);
      }
      throw cause;
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      signal?.removeEventListener('abort', abortFromSignal);
    }
  }

  private buildUrl(path: string, query?: QueryParams): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const rawUrl = `${this.baseUrl}${normalizedPath}`;
    const isAbsoluteUrl = /^[a-z][a-z\d+\-.]*:\/\//i.test(rawUrl);
    const url = new URL(rawUrl, 'http://localhost');

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return isAbsoluteUrl ? url.toString() : `${url.pathname}${url.search}`;
  }
}
