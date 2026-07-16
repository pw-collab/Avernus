import { useMemo, useState } from 'react';
import type { BrowseItem } from '../lib/browse';
import './faceted.css';

/**
 * Client-side faceted browse over a build-time JSON index. Pure React island,
 * no network calls — the data is embedded by the landing page. Facets are
 * derived from the items themselves; counts respect the other active facets.
 */

type FacetKey = 'edition' | 'domain' | 'subtype';

interface FacetConfig {
  key: FacetKey;
  label: string;
}

interface Props {
  items: BrowseItem[];
  facets: FacetConfig[];
}

/** Values an item exposes for a given facet dimension. */
function itemValues(item: BrowseItem, key: FacetKey): string[] {
  if (key === 'edition') return item.editions;
  if (key === 'domain') return item.domain ? [item.domain] : [];
  return item.subtype ? [item.subtype] : [];
}

type Selection = Record<FacetKey, string[]>;
const emptySelection = (): Selection => ({ edition: [], domain: [], subtype: [] });

function matches(item: BrowseItem, sel: Selection, keys: FacetKey[]): boolean {
  return keys.every((key) => {
    const chosen = sel[key];
    if (!chosen.length) return true;
    const values = itemValues(item, key);
    return chosen.some((c) => values.includes(c));
  });
}

export default function FacetedList({ items, facets }: Props) {
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState<Selection>(emptySelection);
  const facetKeys = facets.map((f) => f.key);

  const queryLc = query.trim().toLowerCase();

  const textMatch = (item: BrowseItem) =>
    !queryLc ||
    item.name.toLowerCase().includes(queryLc) ||
    (item.summary ?? '').toLowerCase().includes(queryLc);

  // Final filtered list: text + all facets.
  const filtered = useMemo(
    () => items.filter((it) => textMatch(it) && matches(it, selection, facetKeys)),
    [items, selection, queryLc, facetKeys.join(',')],
  );

  // Facet option counts: for each facet, count items passing text + every OTHER facet.
  const facetOptions = useMemo(() => {
    const out: Record<FacetKey, { value: string; count: number }[]> = {
      edition: [],
      domain: [],
      subtype: [],
    };
    for (const facet of facets) {
      const others = facetKeys.filter((k) => k !== facet.key);
      const counts = new Map<string, number>();
      for (const item of items) {
        if (!textMatch(item)) continue;
        if (!matches(item, selection, others)) continue;
        for (const v of itemValues(item, facet.key)) {
          counts.set(v, (counts.get(v) ?? 0) + 1);
        }
      }
      out[facet.key] = [...counts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value.localeCompare(b.value));
    }
    return out;
  }, [items, selection, queryLc, facetKeys.join(',')]);

  const toggle = (key: FacetKey, value: string) => {
    setSelection((prev) => {
      const has = prev[key].includes(value);
      return {
        ...prev,
        [key]: has ? prev[key].filter((v) => v !== value) : [...prev[key], value],
      };
    });
  };

  const activeCount =
    selection.edition.length + selection.domain.length + selection.subtype.length;

  const clearAll = () => {
    setSelection(emptySelection());
    setQuery('');
  };

  return (
    <div className="faceted">
      <aside className="facet-panel" aria-label="Filters">
        <div className="facet-search">
          <label htmlFor="facet-q" className="facet-legend">
            Filter by name
          </label>
          <input
            id="facet-q"
            type="search"
            placeholder="Type to filter…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>

        {facets.map((facet) => {
          const options = facetOptions[facet.key];
          if (!options.length) return null;
          return (
            <fieldset className="facet-group" key={facet.key}>
              <legend className="facet-legend">{facet.label}</legend>
              <ul>
                {options.map((opt) => (
                  <li key={opt.value}>
                    <label className="facet-option">
                      <input
                        type="checkbox"
                        checked={selection[facet.key].includes(opt.value)}
                        onChange={() => toggle(facet.key, opt.value)}
                      />
                      <span className="facet-value">{opt.value}</span>
                      <span className="facet-count">{opt.count}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          );
        })}

        {(activeCount > 0 || query) && (
          <button type="button" className="btn facet-clear" onClick={clearAll}>
            Clear filters
          </button>
        )}
      </aside>

      <div className="facet-results">
        <p className="facet-count-line" role="status" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
          {activeCount > 0 || query ? ' (filtered)' : ''}
        </p>
        {filtered.length === 0 ? (
          <p className="facet-empty muted">No entries match these filters.</p>
        ) : (
          <ul className="facet-cards">
            {filtered.map((item) => (
              <li key={item.url}>
                <a className="card" href={item.url}>
                  <span className="card-kicker">
                    {item.subtype ?? item.entityType}
                    {item.domain ? ` · ${item.domain}` : ''}
                  </span>
                  <span className="card-title">{item.name}</span>
                  {item.summary && <span className="card-summary">{item.summary}</span>}
                  {item.editions.length > 0 && (
                    <span className="card-editions">
                      {item.editions.map((e) => (
                        <span className="card-ed" key={e}>
                          {e}
                        </span>
                      ))}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
