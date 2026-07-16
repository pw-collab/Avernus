/**
 * Backend-agnostic search contract.
 *
 * Entity pages, the search island, and the facet UI depend only on these types
 * and the `SearchProvider` interface — never on Pagefind directly. Swapping to
 * Meilisearch/Typesense later means writing one new file that implements
 * `SearchProvider` and changing the single export in `./index.ts`; no page or
 * component code changes. (PRD.md §13, "Search infra decision point".)
 */

/** Facet dimensions exposed in the UI. Values are the selected filters. */
export interface SearchFacets {
  entityType: string[];
  domain: string[];
  edition: string[];
  source: string[];
}

export type FacetKey = keyof SearchFacets;

export const FACET_KEYS: FacetKey[] = ['entityType', 'domain', 'edition', 'source'];

export const FACET_LABELS: Record<FacetKey, string> = {
  entityType: 'Type',
  domain: 'Domain',
  edition: 'Edition',
  source: 'Source',
};

export function emptyFacets(): SearchFacets {
  return { entityType: [], domain: [], edition: [], source: [] };
}

export interface SearchResultItem {
  url: string;
  title: string;
  entityType: string;
  domain?: string;
  /** HTML excerpt with matched terms marked up. */
  excerpt: string;
}

/** Per-facet value → document count, for rendering facet checkboxes. */
export type FacetCounts = Record<FacetKey, Record<string, number>>;

export interface SearchResponse {
  items: SearchResultItem[];
  total: number;
  facetCounts: FacetCounts;
  /**
   * When the typed query matched nothing and a typo-corrected term was used
   * instead, the corrected term is reported here so the UI can say "showing
   * results for …". Undefined when the original query was used as-is.
   */
  corrected?: string;
}

export interface SearchProvider {
  /** Idempotent one-time setup (load the engine / index). */
  init(): Promise<void>;
  /** Run a query with the given facet selection. */
  search(query: string, facets: SearchFacets): Promise<SearchResponse>;
}
