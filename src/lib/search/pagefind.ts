import type {
  FacetCounts,
  FacetKey,
  SearchFacets,
  SearchProvider,
  SearchResponse,
  SearchResultItem,
} from './types';
import { emptyFacets } from './types';

/**
 * Pagefind implementation of SearchProvider.
 *
 * Pagefind indexes the *built* static HTML (run as a postbuild step) and ships
 * a tiny WASM-backed runtime under `/pagefind/`. There is no server. Facets map
 * to Pagefind "filters" declared in the HTML via `data-pagefind-filter`
 * attributes; result metadata comes from `data-pagefind-meta`.
 *
 * Two Pagefind quirks are handled here so callers never see them:
 *  1. Filter data loads lazily — per-search `.filters` stay empty until
 *     `filters()` has been called once, so we preload it in `init()`.
 *  2. Native typo tolerance only covers prefixes and trailing characters. For
 *     mid-word misspellings we correct the query against the real indexed
 *     vocabulary (from `/search-index.json`) and re-search — see `fuzzySearch`.
 *
 * This is the ONLY file that knows Pagefind exists.
 */

const FILTER_NAME: Record<FacetKey, string> = {
  entityType: 'type',
  domain: 'domain',
  edition: 'edition',
  source: 'source',
};

const MAX_RESULTS = 50;
const MAX_EDIT_DISTANCE = 2;

interface PagefindResultData {
  url: string;
  excerpt: string;
  meta: Record<string, string>;
  filters: Record<string, string[]>;
}
interface PagefindSearchResult {
  id: string;
  data: () => Promise<PagefindResultData>;
}
interface PagefindResponse {
  results: PagefindSearchResult[];
  filters: Record<string, Record<string, number>>;
  unfilteredResultCount: number;
}
interface PagefindApi {
  options?: (opts: Record<string, unknown>) => Promise<void>;
  filters?: () => Promise<Record<string, Record<string, number>>>;
  search: (
    term: string | null,
    opts?: { filters?: Record<string, string[]> },
  ) => Promise<PagefindResponse>;
}

function toPagefindFilters(facets: SearchFacets): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const key of Object.keys(FILTER_NAME) as FacetKey[]) {
    if (facets[key].length) out[FILTER_NAME[key]] = facets[key];
  }
  return out;
}

function emptyFacetCounts(): FacetCounts {
  return { entityType: {}, domain: {}, edition: {}, source: {} };
}

function fromPagefindFilters(
  filters: Record<string, Record<string, number>>,
): FacetCounts {
  const counts = emptyFacetCounts();
  for (const key of Object.keys(FILTER_NAME) as FacetKey[]) {
    counts[key] = filters[FILTER_NAME[key]] ?? {};
  }
  return counts;
}

/** Levenshtein distance with an early-exit cap. Returns > cap if exceeded. */
function boundedLevenshtein(a: string, b: string, cap: number): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > cap) return cap + 1;
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

export class PagefindProvider implements SearchProvider {
  private api: PagefindApi | null = null;
  private initPromise: Promise<void> | null = null;
  private vocab: string[] = [];
  private vocabSet = new Set<string>();

  async init(): Promise<void> {
    if (this.api) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      const base = import.meta.env.BASE_URL;
      const mod = (await import(
        /* @vite-ignore */ `${base}pagefind/pagefind.js`
      )) as PagefindApi;
      if (mod.options) await mod.options({ excerptLength: 24 });
      if (mod.filters) {
        try {
          await mod.filters(); // preload so per-search facet counts populate
        } catch {
          /* no filters indexed — fine */
        }
      }
      this.api = mod;
      await this.loadVocab(base);
    })();
    return this.initPromise;
  }

  private async loadVocab(base: string): Promise<void> {
    try {
      const res = await fetch(`${base}search-index.json`);
      if (!res.ok) return;
      const records: { title: string; text: string }[] = await res.json();
      const set = new Set<string>();
      for (const r of records) {
        for (const w of `${r.title} ${r.text}`.toLowerCase().match(/[a-z]{3,}/g) ?? []) {
          set.add(w);
        }
      }
      this.vocabSet = set;
      this.vocab = [...set];
    } catch {
      /* vocabulary is a nicety; search still works without it */
    }
  }

  /** Nearest real indexed word to `word`, or null if none within the cap. */
  private correctWord(word: string): string | null {
    const w = word.toLowerCase();
    if (w.length < 3 || this.vocabSet.has(w)) return null;
    let best: string | null = null;
    let bestDist = MAX_EDIT_DISTANCE + 1;
    for (const cand of this.vocab) {
      const dist = boundedLevenshtein(w, cand, MAX_EDIT_DISTANCE);
      if (dist < bestDist) {
        bestDist = dist;
        best = cand;
        if (dist === 1) break; // can't do better meaningfully
      } else if (dist === bestDist && best) {
        // Prefer a candidate matching the original length (fewer structural edits).
        if (Math.abs(cand.length - w.length) < Math.abs(best.length - w.length)) {
          best = cand;
        }
      }
    }
    return best;
  }

  private async toResponse(
    response: PagefindResponse,
    corrected?: string,
  ): Promise<SearchResponse> {
    const top = response.results.slice(0, MAX_RESULTS);
    const datas = await Promise.all(top.map((r) => r.data()));
    const items: SearchResultItem[] = datas.map((d) => ({
      url: d.url,
      title: d.meta.title ?? d.url,
      entityType: d.meta.type ?? '',
      domain: d.meta.domain,
      excerpt: d.excerpt,
    }));
    return {
      items,
      total: response.results.length,
      facetCounts: fromPagefindFilters(response.filters ?? {}),
      corrected,
    };
  }

  async search(query: string, facets: SearchFacets): Promise<SearchResponse> {
    await this.init();
    if (!this.api) {
      return { items: [], total: 0, facetCounts: emptyFacetCounts() };
    }

    const pfFilters = toPagefindFilters(facets);
    const trimmed = query.trim();
    const term = trimmed.length ? trimmed : null;

    const primary = await this.api.search(term, { filters: pfFilters });
    if (primary.results.length > 0 || term === null) {
      return this.toResponse(primary);
    }

    const corrected = await this.fuzzySearch(trimmed, pfFilters);
    return corrected ?? this.toResponse(primary);
  }

  /**
   * Correct the longest (most significant) query word against the real indexed
   * vocabulary and re-search. Returns null if no correction helps.
   */
  private async fuzzySearch(
    query: string,
    pfFilters: Record<string, string[]>,
  ): Promise<SearchResponse | null> {
    if (!this.api || this.vocab.length === 0) return null;
    const words = query.split(/\s+/);
    let idx = 0;
    for (let i = 1; i < words.length; i++) {
      if (words[i].length > words[idx].length) idx = i;
    }
    const fix = this.correctWord(words[idx]);
    if (!fix || fix === words[idx].toLowerCase()) return null;

    const corrected = words.map((w, i) => (i === idx ? fix : w)).join(' ');
    const res = await this.api.search(corrected, { filters: pfFilters });
    if (res.results.length === 0) return null;
    return this.toResponse(res, corrected);
  }
}

export function createPagefindProvider(): SearchProvider {
  return new PagefindProvider();
}

export { emptyFacets };
