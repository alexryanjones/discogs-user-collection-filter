import fetch from 'node-fetch';
import pLimit from 'p-limit';
const limit = pLimit(5);

async function fetchWithRetry(url, headers = {}, retries = 5, delay = 1000) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { headers });
      const data = res.json();
      return data;
    } catch (err) {
      const status = err.response?.status;
      const retryAfter =
        parseInt(err.response?.headers['retry-after']) || delay / 1000;

      if (status === 429) {
        console.warn(`Rate limit hit (429). Retrying after ${retryAfter}s...`);
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      } else {
        console.error(`Request failed: ${status} ${err.message}`);
        throw err;
      }
    }
  }

  throw new Error(`Failed to fetch ${url} after ${retries} retries.`);
}

export async function fetchCollection(username) {
  try {
    const headers = {
      'User-Agent': 'DiscogsCollectionFetcher/1.0',
      Authorization: 'Discogs token=cGNKYHedzKdNpsILQludYQbcsRfFqDtDhxnIJqvG',
    };

    const firstUrl = `https://api.discogs.com/users/${username}/collection/folders/0/releases?page=1&per_page=100`;
    const res = await fetch(firstUrl, { headers });
    const data = await res.json();
    const totalPages = data.pagination.pages;
    const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);

    const pageFetches = allPages.map((page) =>
      limit(() =>
        fetchWithRetry(
          `https://api.discogs.com/users/${username}/collection/folders/0/releases?page=${page}&per_page=100`,
          headers
        ).catch((err) => {
          console.error(`Page ${page} failed`, err.message);
          return null;
        })
      )
    );

    const responses = await Promise.all(pageFetches);
    const items = [];

    for (const res of responses) {
      if (!res) continue;
      const releases = res.releases;
      for (const item of releases) {
        const info = item.basic_information;

        items.push({
          artist: info.artists?.map((a) => a.name).join(', ') || '',
          title: info.title || '',
          year: info.year || '',
          label: info.labels?.map((l) => l.name).join(', ') || '',
          format: info.formats?.map((f) => f.name).join(', ') || '',
          genre: (info.genres || []).join(', '),
          style: (info.styles || []).join(', '),
          image: info.cover_image || '',
          url: info.resource_url.replace('api.', '') || '',
        });
      }
    }

    return items;
  } catch (err) {
    console.log(err);
  }
}
