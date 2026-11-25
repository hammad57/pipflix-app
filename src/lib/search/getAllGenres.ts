import {providerManager} from '../services/ProviderManager';
import type {ProviderExtension} from '../storage/extensionStorage';

export interface GenreProviderEntry {
  providerValue: string;
  displayName: string;
  /** The provider's category filter, e.g. "category/movies-by-genres/action". */
  filter: string;
}

export interface GenreChoice {
  title: string;
  /** Per-provider category filters to browse. Empty for synthetic entries. */
  providers: GenreProviderEntry[];
  /**
   * When set, there is no per-provider category filter: browse by searching
   * every provider for this query instead (used for 18+ — no provider
   * declares an adult genre).
   */
  searchQuery?: string;
}

/**
 * The synthetic 18+ entry: no provider in the Nadan-Prinda source declares
 * an "18+" genre, so it is browsed by searching every provider for "18+".
 * Sites that tag adult content that way return it; others return nothing.
 */
export const ADULT_GENRE: GenreChoice = {
  title: '18+',
  providers: [],
  searchQuery: '18+',
};

/**
 * All genres/tags declared by the installed providers, de-duplicated by title.
 * A genre that several providers offer keeps one entry per provider, so
 * browsing it lists that category from every provider that has it. Providers
 * that fail to report genres (no catalog module, bad module) are skipped.
 *
 * Both the provider's `genres` list AND its `catalog` list are merged:
 * several providers (e.g. NetflixMirror) only fill `catalog` — its tags
 * ("Only on Netflix", "Blockbuster Movies", "US TV Shows Dubbed in Hindi")
 * would otherwise never appear in category browsing.
 */
export const getAllGenres = async (
  providers: ProviderExtension[],
): Promise<GenreChoice[]> => {
  const settled = await Promise.allSettled(
    providers.map(async provider => {
      const [genres, catalog] = await Promise.all([
        providerManager.getGenres({
          providerValue: provider.value,
        }),
        providerManager.getCatalog({
          providerValue: provider.value,
        }),
      ]);
      const merged = [...(Array.isArray(genres) ? genres : []), ...(Array.isArray(catalog) ? catalog : [])];
      return {provider, genres: merged};
    }),
  );
  const byTitle = new Map<string, GenreChoice>();
  for (const entry of settled) {
    if (entry.status !== 'fulfilled') {
      continue;
    }
    const {provider, genres} = entry.value;
    for (const genre of genres) {
      const title = (genre.title || '').trim();
      if (!title || !genre.filter) {
        continue;
      }
      const key = title.toLowerCase();
      const item: GenreProviderEntry = {
        providerValue: provider.value,
        displayName: provider.display_name || provider.value,
        filter: genre.filter,
      };
      const existing = byTitle.get(key);
      if (existing) {
        existing.providers.push(item);
      } else {
        byTitle.set(key, {title, providers: [item]});
      }
    }
  }
  const choices = [...byTitle.values()].sort((a, b) =>
    a.title.localeCompare(b.title),
  );
  return [ADULT_GENRE, ...choices];
};
