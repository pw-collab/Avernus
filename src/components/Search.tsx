import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getSearchProvider,
  emptyFacets,
  FACET_KEYS,
  FACET_LABELS,
  type FacetKey,
  type SearchFacets,
  type SearchResponse,
} from '../lib/search';
import './faceted.css';

/**
 * Faceted full-text search island. All engine specifics live behind
 * getSearchProvider() → SearchProvider; this component only knows the
 * backend-agnostic types. Swapping Pagefind for Meilisearch/Typesense later
 * does not touch this file.
 */

const DEBOUNCE_MS = 140;

export default function Search() {
  const provider = useMemo(() => getSearchProvider(), []);
  const [query, setQuery] = useState('');
  const [facets, setFacets] = useState<SearchFacets>(emptyFacets);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Seed query from ?q= and focus the box on mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) setQuery(q);
    inputRef.current?.focus();
    provider
      .init()
      .then(() => setReady(true))
      .catch((e) => setError(String(e)));
  }, [provider]);

  // Debounced search on any query/facet change once ready.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const t = setTimeout(() => {
      provider
        .search(query, facets)
        .then((r) => {
          if (!cancelled) setResponse(r);
        })
        .catch((e) => {
          if (!cancelled) setError(String(e));
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [ready, provider, query, facets]);

  // Keep the URL shareable.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    window.history.replaceState(null, '', url);
  }, [query]);

  const toggleFacet = (key: FacetKey, value: string) => {
    setFacets((prev) => {
      const has = prev[key].includes(value);
      return {
        ...prev,
        [key]: has ? prev[key].filter((v) => v !== value) : [...prev[key], value],
      };
    });
  };

  const activeFacetCount = FACET_KEYS.reduce((n, k) => n + facets[k].length, 0);
  const clearFacets = () => setFacets(emptyFacets());

  return (
    <div className="faceted">
      <aside className="facet-panel" aria-label="Search facets">
        {FACET_KEYS.map((key) => {
          const counts = response?.facetCounts[key] ?? {};
          const values = Object.keys(counts).sort((a, b) => a.localeCompare(b));
          if (!values.length) return null;
          return (
            <fieldset className="facet-group" key={key}>
              <legend className="facet-legend">{FACET_LABELS[key]}</legend>
              <ul>
                {values.map((value) => (
                  <li key={value}>
                    <label className="facet-option">
                      <input
                        type="checkbox"
                        checked={facets[key].includes(value)}
                        onChange={() => toggleFacet(key, value)}
                      />
                      <span className="facet-value">{value}</span>
                      <span className="facet-count">{counts[value]}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          );
        })}
        {activeFacetCount > 0 && (
          <button type="button" className="btn facet-clear" onClick={clearFacets}>
            Clear facets
          </button>
        )}
      </aside>

      <div className="facet-results">
        <div className="search-box">
          <label htmlFor="search-q" className="visually-hidden">
            Search the archive
          </label>
          <input
            id="search-q"
            ref={inputRef}
            type="search"
            placeholder="Search domains, darklords, characters, places…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>

        {error && (
          <p className="search-count-line" role="alert">
            Search is unavailable in this environment. It works on the built
            site (<code>npm run build &amp;&amp; npm run preview</code>).
          </p>
        )}

        {!error && response && (
          <p className="search-count-line" role="status" aria-live="polite">
            {response.total} {response.total === 1 ? 'result' : 'results'}
            {query ? ` for “${query}”` : ''}
            {response.corrected && (
              <>
                {' '}
                — showing matches for <strong>“{response.corrected}”</strong>
              </>
            )}
          </p>
        )}

        {!error && response && response.items.length > 0 && (
          <ul className="search-cards">
            {response.items.map((item) => (
              <li key={item.url}>
                <a className="card" href={item.url}>
                  <span className="card-kicker">
                    {item.entityType}
                    {item.domain ? ` · ${item.domain}` : ''}
                  </span>
                  <span className="card-title">{item.title}</span>
                  <span
                    className="card-summary"
                    // Excerpt is engine-generated HTML with <mark> highlights.
                    dangerouslySetInnerHTML={{ __html: item.excerpt }}
                  />
                </a>
              </li>
            ))}
          </ul>
        )}

        {!error && response && response.items.length === 0 && query && (
          <p className="facet-empty muted">
            No results. Try fewer or different terms.
          </p>
        )}
      </div>
    </div>
  );
}
