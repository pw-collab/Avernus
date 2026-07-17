import { useMemo, useState } from 'react';
import type { TimelineEvent } from '../lib/timeline';
import './faceted.css';
import './timeline.css';

/**
 * Filterable vertical timeline (Phase 5, PRD.md §7.6). Rendered with client:load
 * so the initial ordered list is server-rendered (SEO / no-JS), then hydrated
 * for filtering by domain, figure, and edition.
 */

type FacetKey = 'domain' | 'figure' | 'edition';

const FACET_LABELS: Record<FacetKey, string> = {
  domain: 'Domain',
  figure: 'Figure',
  edition: 'Edition',
};

function eventValues(e: TimelineEvent, key: FacetKey): string[] {
  if (key === 'domain') return e.domains.map((d) => d.name);
  if (key === 'edition') return e.editions;
  return [...e.darklords, ...e.characters].map((f) => f.name);
}

type Selection = Record<FacetKey, string[]>;
const empty = (): Selection => ({ domain: [], figure: [], edition: [] });

export default function Timeline({ events }: { events: TimelineEvent[] }) {
  const [sel, setSel] = useState<Selection>(empty);
  const keys: FacetKey[] = ['domain', 'figure', 'edition'];

  const matches = (e: TimelineEvent) =>
    keys.every((k) => {
      const chosen = sel[k];
      if (!chosen.length) return true;
      const vals = eventValues(e, k);
      return chosen.some((c) => vals.includes(c));
    });

  const filtered = useMemo(() => events.filter(matches), [events, sel]);

  const options = useMemo(() => {
    const out: Record<FacetKey, { value: string; count: number }[]> = {
      domain: [],
      figure: [],
      edition: [],
    };
    for (const key of keys) {
      const others = keys.filter((k) => k !== key);
      const counts = new Map<string, number>();
      for (const e of events) {
        if (!others.every((k) => !sel[k].length || sel[k].some((c) => eventValues(e, k).includes(c)))) continue;
        for (const v of eventValues(e, key)) counts.set(v, (counts.get(v) ?? 0) + 1);
      }
      out[key] = [...counts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value.localeCompare(b.value));
    }
    return out;
  }, [events, sel]);

  const toggle = (key: FacetKey, value: string) =>
    setSel((prev) => {
      const has = prev[key].includes(value);
      return { ...prev, [key]: has ? prev[key].filter((v) => v !== value) : [...prev[key], value] };
    });

  const activeCount = keys.reduce((n, k) => n + sel[k].length, 0);

  return (
    <div className="faceted">
      <aside className="facet-panel" aria-label="Timeline filters">
        {keys.map((key) => {
          const opts = options[key];
          if (!opts.length) return null;
          return (
            <fieldset className="facet-group" key={key}>
              <legend className="facet-legend">{FACET_LABELS[key]}</legend>
              <ul>
                {opts.map((o) => (
                  <li key={o.value}>
                    <label className="facet-option">
                      <input
                        type="checkbox"
                        checked={sel[key].includes(o.value)}
                        onChange={() => toggle(key, o.value)}
                      />
                      <span className="facet-value">{o.value}</span>
                      <span className="facet-count">{o.count}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          );
        })}
        {activeCount > 0 && (
          <button type="button" className="btn facet-clear" onClick={() => setSel(empty())}>
            Clear filters
          </button>
        )}
      </aside>

      <div className="facet-results">
        <p className="facet-count-line" role="status" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? 'event' : 'events'}
          {activeCount > 0 ? ' (filtered)' : ''}
        </p>

        {filtered.length === 0 ? (
          <p className="facet-empty muted">No events match these filters.</p>
        ) : (
          <ol className="timeline">
            {filtered.map((e) => (
              <li className="timeline-item" key={e.slug}>
                <div className="timeline-marker" aria-hidden="true" />
                <div className="timeline-content">
                  <p className="timeline-date">{e.inWorldDate}</p>
                  <h2 className="timeline-title">
                    <a href={e.url}>{e.title}</a>
                    {e.spoiler && <span className="timeline-spoiler">DM spoiler</span>}
                  </h2>
                  <p className="timeline-summary">{e.summary}</p>
                  {e.realWorldContext && (
                    <p className="timeline-context muted">{e.realWorldContext}</p>
                  )}
                  <div className="timeline-meta">
                    {[...e.darklords, ...e.domains, ...e.characters].map((r) => (
                      <a className="timeline-chip" href={r.url} key={r.url}>
                        {r.name}
                      </a>
                    ))}
                    {e.editions.map((ed) => (
                      <span className="timeline-ed" key={ed}>{ed}</span>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
