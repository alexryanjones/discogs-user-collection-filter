import fetch from 'node-fetch';
import pLimit from 'p-limit';
const limit = pLimit(5);

const headers = {
  'User-Agent': 'DiscogsCollectionFetcher/1.0',
  Authorization: 'Discogs token=cGNKYHedzKdNpsILQludYQbcsRfFqDtDhxnIJqvG',
};

async function fetchWithRetry(url, headers = {}, retries = 5, delay = 1000) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data;
    } catch (err) {
      const is429 = err.message.includes('429');
      const retryAfter = is429 ? delay * (attempt + 1) : delay;

      console.warn(`Fetch failed (${err.message}). Retrying in ${retryAfter}ms...`);
      await new Promise((resolve) => setTimeout(resolve, retryAfter));
    }
  }

  throw new Error(`Failed to fetch ${url} after ${retries} retries.`);
}

export async function fetchCollection(username, onRecord) {
  const firstUrl = `https://api.discogs.com/users/${username}/collection/folders/0/releases?page=1&per_page=100`;
  const firstPage = await fetchWithRetry(firstUrl, headers);
  const totalPages = firstPage.pagination.pages;

  const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);

  const pageFetches = allPages.map((page) =>
    limit(async () => {
      try {
        const res = await fetchWithRetry(
          `https://api.discogs.com/users/${username}/collection/folders/0/releases?page=${page}&per_page=100`,
          headers
        );

        for (const item of res.releases) {
          const info = item.basic_information;
          const record = {
            id: info.id,
            artist: info.artists?.map((a) => a.name).join(', ') || '',
            title: info.title || '',
            year: info.year || '',
            label: info.labels?.map((l) => l.name).join(', ') || '',
            format: info.formats?.map((f) => f.name).join(', ') || '',
            genre: (info.genres || []).join(', '),
            style: (info.styles || []).join(', '),
            image: info.cover_image || '',
            url: `https://discogs.com/release/${info.id}`,
          };

          onRecord(record);
        }
      } catch (err) {
        console.error(`Failed to fetch page ${page}:`, err.message);
      }
    })
  );

  await Promise.all(pageFetches);
}
