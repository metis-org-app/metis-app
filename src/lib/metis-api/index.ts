/*
 * Entry point of the typed API client layer. App code depends only on IMetisApi and gets its
 * implementation from createMetisApi().
 *
 * The implementation is chosen by NEXT_PUBLIC_IS_PROD (the Next.js prefix is required for the flag to
 * reach the browser): "true" uses the real API (HttpMetisApi), anything else uses the offline demo
 * (LocalMetisApi, IndexedDB).
 */

import type { IMetisApi } from './client';
import { HttpMetisApi } from './http';
import { LocalMetisApi } from './local';

export * from './client';
export * from './constants';
export * from './errors';
export * from './types';

export function createMetisApi(): IMetisApi {
  return process.env.NEXT_PUBLIC_IS_PROD === 'true' ? new HttpMetisApi() : new LocalMetisApi();
}
