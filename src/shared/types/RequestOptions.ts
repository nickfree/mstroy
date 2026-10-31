import type { QueryParams } from './QueryParams';

export type RequestOptions<TBody = BodyInit | null> = Omit<
  RequestInit,
  'method' | 'body'
> & {
  query?: QueryParams
  timeout?: number
  body?: TBody
}
