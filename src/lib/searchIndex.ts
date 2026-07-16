import { getCollection } from 'astro:content';
import { resolveRef, resolveRefs } from './refs';
import {
  BROWSABLE_COLLECTIONS,
  entityName,
  entityUrl,
} from './entities';

/**
 * Build-time search index (PRD.md §7.3, build prompt Step 4).
 *
 * Emitted as `/search-index.json` from all collection frontmatter + body text.
 * Two consumers:
 *  1. The Pagefind provider loads it to build a vocabulary for typo correction
 *     against real indexed words.
 *  2. It is the drop-in payload a future Meilisearch/Typesense provider would
 *     ingest — so switching engines needs no new data pipeline.
 */
export interface SearchIndexRecord {
  url: string;
  title: string;
  entityType: string;
  domain?: string;
  editions: string[];
  sources: string[];
  excerpt: string;
  /** Title + summary + body, stripped to plain text, for indexing/vocabulary. */
  text: string;
}

/** Strip MDX/Markdown markup down to readable words. */
function stripMarkup(input: string): string {
  return input
    .replace(/^import .*$/gm, ' ') // MDX imports
    .replace(/<[^>]+>/g, ' ') // JSX/HTML tags
    .replace(/```[\s\S]*?```/g, ' ') // fenced code
    .replace(/`[^`]*`/g, ' ') // inline code
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // links/images → link text
    .replace(/[#>*_~|-]+/g, ' ') // markdown punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

export async function buildSearchIndex(): Promise<SearchIndexRecord[]> {
  const records: SearchIndexRecord[] = [];

  for (const meta of BROWSABLE_COLLECTIONS) {
    const entries = (await getCollection(meta.key as any)) as {
      id: string;
      data: Record<string, any>;
      body?: string;
    }[];
    for (const entry of entries) {
      const d = entry.data as Record<string, any>;
      const slug = String(entry.id);
      const title = entityName({ collection: meta.key, data: d, id: slug } as any);
      const domainRef = d.domain ? await resolveRef(d.domain) : null;
      const sourceRefs =
        meta.key === 'sources' ? [] : await resolveRefs(d.sources ?? []);

      const summary = typeof d.summary === 'string' ? d.summary : '';
      const body = stripMarkup((entry as { body?: string }).body ?? '');
      const excerpt = summary || `${body.slice(0, 155)}…`;

      records.push({
        url: entityUrl(meta.key, slug),
        title,
        entityType: meta.singular,
        domain: domainRef?.name,
        editions: (d.editions ?? []) as string[],
        sources: sourceRefs.map((s) => s.name),
        excerpt,
        text: [title, summary, body].filter(Boolean).join(' '),
      });
    }
  }

  return records.sort((a, b) => a.title.localeCompare(b.title));
}
