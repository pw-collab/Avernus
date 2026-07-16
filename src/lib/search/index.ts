import type { SearchProvider } from './types';
import { createPagefindProvider } from './pagefind';

/**
 * The single switch-point for the search backend.
 *
 * To move off Pagefind (see PRD.md §13), implement `SearchProvider` in a new
 * file (e.g. `./meilisearch.ts`) and return it here. No page or component code
 * references a concrete provider — they all import `getSearchProvider()`.
 */
let _provider: SearchProvider | null = null;

export function getSearchProvider(): SearchProvider {
  if (!_provider) {
    _provider = createPagefindProvider();
  }
  return _provider;
}

export * from './types';
