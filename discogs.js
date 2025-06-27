import fetch from 'node-fetch';

const headers = {
  'User-Agent': 'DiscogsCollectionFetcher/1.0',
  Authorization: 'Discogs token=cGNKYHedzKdNpsILQludYQbcsRfFqDtDhxnIJqvG',
};

export async function fetchCollection(username, onRecord, markPartialError, onPages) {
  const firstUrl = `https://api.discogs.com/users/${username}/collection/folders/0/releases?page=1&per_page=100`;
  const res = await fetch(firstUrl, { headers });
  const json = await res.json();
  const totalPages = json.pagination.pages;
  onPages(json.pagination);


  for (let page = 1; page <= totalPages; page++) {
    const url = `https://api.discogs.com/users/${username}/collection/folders/0/releases?page=${page}&per_page=100`;

    let success = false;
    let attempts = 0;

    while (!success && attempts < 5) {
      attempts++;
      try {
        const res = await fetch(url, { headers });

        if (res.status === 429) {
          const retryAfter = parseInt(
            res.headers.get('Retry-After') || '5',
            10
          );
          console.warn(
            `Rate limited on page ${page}. Retrying in ${retryAfter}s...`
          );
          await new Promise((r) => setTimeout(r, retryAfter * 1000));
          continue;
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();

        for (const item of json.releases) {
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

        success = true;
      } catch (err) {
        console.error(
          `Failed to fetch page ${page} (attempt ${attempts}):`,
          err.message
        );
         markPartialError();
      }
    }
  }

  console.log(`Finished fetching ${totalPages} pages for "${username}".`);
}
