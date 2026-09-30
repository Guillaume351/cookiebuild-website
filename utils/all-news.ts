const NEWS_PAGE_SIZE = 50;
const MAX_NEWS_PAGES = 40;

/**
 * Reads every published post through the paginated public news API
 * (the API caps one page at 50 posts).
 */
export async function fetchAllNews<T>(query: Record<string, string> = {}): Promise<T[]> {
  const posts: T[] = [];
  for (let page = 0; page < MAX_NEWS_PAGES; page += 1) {
    const response = await $fetch<{ data: T[] }>("/api/mobile/v1/news", {
      query: { ...query, limit: NEWS_PAGE_SIZE, offset: page * NEWS_PAGE_SIZE },
    });
    posts.push(...response.data);
    if (response.data.length < NEWS_PAGE_SIZE) break;
  }
  return posts;
}
