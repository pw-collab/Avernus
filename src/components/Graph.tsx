import { useEffect, useMemo, useRef, useState } from 'react';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationNodeDatum,
} from 'd3-force';
import type { GraphData, GraphNode } from '../lib/graph';
import {
  ENTITY_COLLECTIONS,
  GRAPH_COLORS,
  type EntityCollectionKey,
} from '../lib/entities';
import './graph.css';

/**
 * Interactive relationship-graph explorer (Phase 5). A React island rendered
 * only on the /graph page, so entity/listing pages keep shipping zero JS.
 *
 * Layout is computed synchronously with d3-force (no animation loop, so it is
 * inherently reduced-motion friendly); pan/zoom and highlighting are hand-rolled
 * over SVG. The data comes from the build-time /graph.json — the same
 * references that drive the textual "Connections" panels.
 */

type SimNode = GraphNode & SimulationNodeDatum;
interface SimEdge {
  source: SimNode;
  target: SimNode;
  label: string;
}

const COLLECTION_KEYS = Object.keys(ENTITY_COLLECTIONS) as EntityCollectionKey[];

function nodeRadius(n: GraphNode): number {
  return 7 + Math.min(Math.sqrt(n.degree) * 3, 16);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export default function Graph({ focus }: { focus?: string }) {
  const [data, setData] = useState<GraphData | null>(null);
  const [error, setError] = useState(false);
  const [hidden, setHidden] = useState<Set<EntityCollectionKey>>(new Set());
  const [edition, setEdition] = useState<string>('');
  // /graph is statically prerendered, so the ?focus= query param isn't available
  // at build time — read it client-side. This island is client:only, so `window`
  // exists on first render.
  const [active, setActive] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('focus');
      if (q) return q;
    }
    return focus ?? null;
  });

  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 800, h: 560 });
  const view = useRef({ tx: 400, ty: 280, scale: 1 });
  const [, forceRender] = useState(0);
  const rerender = () => forceRender((n) => n + 1);

  // Load the build-time graph.
  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    fetch(`${base}graph.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: GraphData) => setData(d))
      .catch(() => setError(true));
  }, []);

  // Track container size.
  useEffect(() => {
    if (!svgRef.current) return;
    const el = svgRef.current;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width && r.height) setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const allEditions = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.nodes.flatMap((n) => n.editions))].sort();
  }, [data]);

  // Visible node/edge set after filters.
  const filtered = useMemo(() => {
    if (!data) return { nodes: [] as GraphNode[], edges: [] as GraphData['edges'] };
    const visible = (n: GraphNode) =>
      !hidden.has(n.collection) && (!edition || n.editions.includes(edition));
    const nodes = data.nodes.filter(visible);
    const ids = new Set(nodes.map((n) => n.id));
    const edges = data.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
    return { nodes, edges };
  }, [data, hidden, edition]);

  // Compute the force layout whenever the visible set changes.
  const layout = useMemo(() => {
    const sims: SimNode[] = filtered.nodes.map((n) => ({ ...n }));
    const byId = new Map(sims.map((n) => [n.id, n]));
    const links: SimEdge[] = filtered.edges
      .map((e) => ({ source: byId.get(e.source)!, target: byId.get(e.target)!, label: e.label }))
      .filter((l) => l.source && l.target);
    if (sims.length) {
      const sim = forceSimulation(sims)
        .force(
          'link',
          // LinkDatum typed loosely: our SimEdge holds resolved node refs, not
          // the string|number|node union d3's SimulationLinkDatum expects.
          forceLink<SimNode, any>(links)
            .id((d) => d.id)
            .distance(95)
            .strength(0.35),
        )
        .force('charge', forceManyBody().strength(-320))
        .force('center', forceCenter(0, 0))
        .force('collide', forceCollide<SimNode>().radius((d) => nodeRadius(d) + 8))
        .stop();
      for (let i = 0; i < 320; i++) sim.tick();
    }
    return { sims, links, byId };
  }, [filtered]);

  // Fit / focus the view when the layout changes.
  useEffect(() => {
    const { sims, byId } = layout;
    if (!sims.length) return;
    const xs = sims.map((n) => n.x ?? 0);
    const ys = sims.map((n) => n.y ?? 0);
    const minX = Math.min(...xs) - 40;
    const maxX = Math.max(...xs) + 40;
    const minY = Math.min(...ys) - 40;
    const maxY = Math.max(...ys) + 40;
    const bw = Math.max(maxX - minX, 1);
    const bh = Math.max(maxY - minY, 1);
    const scale = clamp(Math.min(size.w / bw, size.h / bh) * 0.92, 0.2, 2.5);
    const focusNode = active ? byId.get(active) : undefined;
    const cx = focusNode ? focusNode.x ?? 0 : (minX + maxX) / 2;
    const cy = focusNode ? focusNode.y ?? 0 : (minY + maxY) / 2;
    view.current = { tx: size.w / 2 - scale * cx, ty: size.h / 2 - scale * cy, scale };
    rerender();
    // Re-fit only on structural/size changes, not on every hover.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, size.w, size.h]);

  // Neighbour set for highlight.
  const neighbours = useMemo(() => {
    if (!active) return null;
    const set = new Set<string>([active]);
    for (const e of layout.links) {
      if (e.source.id === active) set.add(e.target.id);
      if (e.target.id === active) set.add(e.source.id);
    }
    return set;
  }, [active, layout]);

  // Pan / zoom handlers.
  const drag = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    view.current.tx += e.clientX - drag.current.x;
    view.current.ty += e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    rerender();
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const v = view.current;
    const next = clamp(v.scale * (1 - e.deltaY * 0.0016), 0.2, 3.5);
    v.tx = cx - (cx - v.tx) * (next / v.scale);
    v.ty = cy - (cy - v.ty) * (next / v.scale);
    v.scale = next;
    rerender();
  };

  const toggleCollection = (key: EntityCollectionKey) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const activeNode = active ? layout.byId.get(active) : undefined;
  const { tx, ty, scale } = view.current;

  if (error) {
    return (
      <p className="graph-error muted">
        The graph could not load. It is generated from the static build — try{' '}
        <code>npm run build &amp;&amp; npm run preview</code>.
      </p>
    );
  }

  return (
    <div className="graph">
      <aside className="graph-controls" aria-label="Graph filters and legend">
        <div className="graph-legend">
          <p className="facet-legend">Entity types</p>
          <ul>
            {COLLECTION_KEYS.map((key) => {
              const count = data?.nodes.filter((n) => n.collection === key).length ?? 0;
              if (!count) return null;
              const on = !hidden.has(key);
              return (
                <li key={key}>
                  <label className="graph-toggle">
                    <input type="checkbox" checked={on} onChange={() => toggleCollection(key)} />
                    <span className="graph-swatch" style={{ background: GRAPH_COLORS[key] }} aria-hidden="true" />
                    <span className="graph-toggle-label">{ENTITY_COLLECTIONS[key].plural}</span>
                    <span className="facet-count">{count}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        {allEditions.length > 0 && (
          <div className="graph-edition">
            <label htmlFor="graph-edition" className="facet-legend">Edition</label>
            <select id="graph-edition" value={edition} onChange={(e) => setEdition(e.target.value)}>
              <option value="">All editions</option>
              {allEditions.map((ed) => (
                <option key={ed} value={ed}>{ed}</option>
              ))}
            </select>
          </div>
        )}

        <div className="graph-selection" aria-live="polite">
          {activeNode ? (
            <>
              <p className="graph-sel-type">{ENTITY_COLLECTIONS[activeNode.collection].singular}</p>
              <p className="graph-sel-name">{activeNode.name}</p>
              <a className="btn btn-primary graph-open" href={activeNode.url}>Open page →</a>
              <button type="button" className="btn graph-clear" onClick={() => setActive(null)}>
                Clear selection
              </button>
            </>
          ) : (
            <p className="muted graph-hint">
              Hover a node to highlight its connections; click to select it and open its page. Drag to pan, scroll to zoom.
            </p>
          )}
        </div>
      </aside>

      <div className="graph-canvas">
        <svg
          ref={svgRef}
          className="graph-svg"
          role="img"
          aria-label={`Relationship graph with ${filtered.nodes.length} entities and ${filtered.edges.length} connections`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onWheel={onWheel}
        >
          <g transform={`translate(${tx} ${ty}) scale(${scale})`}>
            {layout.links.map((e, i) => {
              const dim = neighbours && !(neighbours.has(e.source.id) && neighbours.has(e.target.id));
              return (
                <line
                  key={i}
                  className={`graph-edge${dim ? ' dim' : ''}`}
                  x1={e.source.x} y1={e.source.y}
                  x2={e.target.x} y2={e.target.y}
                />
              );
            })}
            {layout.sims.map((n) => {
              const r = nodeRadius(n);
              const dim = neighbours && !neighbours.has(n.id);
              const isActive = active === n.id;
              return (
                <a
                  key={n.id}
                  href={n.url}
                  className={`graph-node${dim ? ' dim' : ''}${isActive ? ' active' : ''}`}
                  onMouseEnter={() => !drag.current && setActive(n.id)}
                  onFocus={() => setActive(n.id)}
                  aria-label={`${ENTITY_COLLECTIONS[n.collection].singular}: ${n.name}`}
                >
                  <circle
                    cx={n.x} cy={n.y} r={r}
                    fill={GRAPH_COLORS[n.collection]}
                    stroke={isActive ? 'var(--text)' : 'var(--bg)'}
                    strokeWidth={isActive ? 3 : 1.5}
                  />
                  <text x={n.x} y={(n.y ?? 0) + r + 12} textAnchor="middle" className="graph-label">
                    {n.name}
                  </text>
                </a>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
