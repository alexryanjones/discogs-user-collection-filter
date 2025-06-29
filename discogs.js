import fetch from 'node-fetch';

const headers = {
  'User-Agent': 'DiscogsCollectionFetcher/1.0',
  Authorization: 'Discogs token=cGNKYHedzKdNpsILQludYQbcsRfFqDtDhxnIJqvG',
};

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function fetchWithRateLimit(url) {
  const res = await fetch(url, { headers });

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '5', 10);
    console.warn(`429 received. Retrying after ${retryAfter}s...`);
    await sleep(retryAfter * 1000);
    return fetchWithRateLimit(url);
  }

  if (res.status === 403) {
    const error = new Error('User collection is private.');
    error.status = 403;
    throw error;
  }

  if (!res.ok) {
    const error = new Error(res.statusText);
    error.status = res.status;
    throw error;
  }

  const remaining = parseInt(
    res.headers.get('X-Discogs-Ratelimit-Remaining') || '0',
    10
  );
  const used = parseInt(
    res.headers.get('X-Discogs-Ratelimit-Used') || '0',
    10
  );
  const limit = parseInt(res.headers.get('X-Discogs-Ratelimit') || '60', 10);

  if (remaining <= 1) {
    const waitTime = 2000;
    console.log(
      `Nearing rate limit (${used}/${limit}). Pausing for ${
        waitTime / 1000
      }s...`
    );
    await sleep(waitTime);
  }

  const text = await res.text();
  if (!text) throw new Error('Empty response body');

  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error('Invalid JSON in response');
  }

  return data;
}

export async function fetchCollection(
  username,
  onRecord,
  markPartialError,
  onPages
) {
  const firstUrl = `https://api.discogs.com/users/${username}/collection/folders/0/releases?page=1&per_page=100`;

  let firstPage;
  try {
    firstPage = await fetchWithRateLimit(firstUrl);
  } catch (err) {
    markPartialError?.();
    if (err.status === 403) onPages?.({ private: true })
    return;
  }

  onPages?.(firstPage.pagination);
  const totalPages = firstPage.pagination.pages;

  for (let page = 2; page <= totalPages; page++) {
    const url = `https://api.discogs.com/users/${username}/collection/folders/0/releases?page=${page}&per_page=100`;

    try {
      const pageData = await fetchWithRateLimit(url);
      if (!pageData?.releases?.length) continue;

      for (const item of pageData.releases) {
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
      console.error(`Error fetching page ${page}:`, err.message);
      markPartialError?.();
    }
  }

  console.log(`Finished fetching all ${totalPages} pages`);
}
