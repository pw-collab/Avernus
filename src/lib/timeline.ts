import { getCollection } from 'astro:content';
import { resolveRefs } from './refs';
import { entityName, entityUrl } from './entities';

/**
 * Build-time timeline records for the filterable timeline view (PRD.md §7.6).
 * Resolves each event's related entities to display links and sorts by the
 * explicit `order` key (in-world dates are free text and not reliably
 * orderable).
 */

export interface TimelineRef {
  name: string;
  url: string;
}

export interface TimelineEvent {
  slug: string;
  url: string;
  title: string;
  inWorldDate: string;
  realWorldContext?: string;
  order: number;
  summary: string;
  editions: string[];
  /** True when spoilerLevel !== 'none' — the list shows a marker, not the body. */
  spoiler: boolean;
  domains: TimelineRef[];
  characters: TimelineRef[];
  darklords: TimelineRef[];
  sources: TimelineRef[];
}

export async function getTimelineEvents(): Promise<TimelineEvent[]> {
  const entries = await getCollection('timeline');
  const events = await Promise.all(
    entries.map(async (entry) => {
      const d = entry.data as Record<string, any>;
      const slug = String(entry.id);
      const [domains, characters, darklords, sources] = await Promise.all([
        resolveRefs(d.relatedDomains ?? []),
        resolveRefs(d.relatedNpcs ?? []),
        resolveRefs(d.relatedDarklords ?? []),
        resolveRefs(d.sources ?? []),
      ]);
      const strip = (r: { name: string; url: string }): TimelineRef => ({
        name: r.name,
        url: r.url,
      });
      const event: TimelineEvent = {
        slug,
        url: entityUrl('timeline', slug),
        title: entityName({ collection: 'timeline', data: d, id: slug } as any),
        inWorldDate: d.inWorldDate,
        realWorldContext: d.realWorldContext,
        order: typeof d.order === 'number' ? d.order : 0,
        summary: d.summary,
        editions: (d.editions ?? []) as string[],
        spoiler: (d.spoilerLevel ?? 'none') !== 'none',
        domains: domains.map(strip),
        characters: characters.map(strip),
        darklords: darklords.map(strip),
        sources: sources.map(strip),
      };
      return event;
    }),
  );
  return events.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}
