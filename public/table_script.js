const parts = window.location.pathname.split('/');
const username = parts[parts.length - 1];

let filteredItems = [];
let openIndex = 0;

const collectionTitle = document.getElementById('collectionTitle');

fetch(`/table_data/${username}`)
  .then((res) => res.json())
  .then(({ headers, data, username }) => {
    collectionTitle.textContent = `${username}'s Collection`;
    const keys = headers;
    const items = data.map((row) =>
      Object.fromEntries(keys.map((k, i) => [k, row[i]]))
    );

    filteredItems = items;

    const grid = document.getElementById('grid');
    const checkboxesContainer = document.getElementById('styleCheckboxes');
    const filterMode = document.getElementById('filterMode');

    const allStyles = new Set();
    items.forEach((item) => {
      (item.style || '')
        .split(',')
        .map((s) => s.trim())
        .forEach((s) => {
          if (s) allStyles.add(s);
        });
    });

    [...allStyles].sort().forEach((style) => {
      const label = document.createElement('label');
      label.innerHTML = `
              <input type="checkbox" value="${style}" />
              ${style}
            `;
      checkboxesContainer.appendChild(label);
    });

    function updateFilter() {
      const selected = [
        ...checkboxesContainer.querySelectorAll('input:checked'),
      ].map((cb) => cb.value.toLowerCase());
      const isAndMode = filterMode.checked;

      const filtered = items.filter((item) => {
        const itemStyles = (item.style || '')
          .toLowerCase()
          .split(',')
          .map((s) => s.trim());
        if (selected.length === 0) return true;

        if (isAndMode) {
          return selected.every((style) => itemStyles.includes(style));
        } else {
          return selected.some((style) => itemStyles.includes(style));
        }
      });

      filteredItems = filtered;
      openIndex = 0;
      renderGrid(filtered);
    }

    function renderGrid(list) {
      grid.innerHTML = '';
      openIndex = 0;

      list.forEach((item) => {
        const releaseId = item.id.toString();

        const div = document.createElement('div');
        div.className = 'card';
        div.setAttribute('data-object-type', 'release');
        div.setAttribute('data-object-id', releaseId);

        div.innerHTML = `
                <img src="${item.image}" alt="${item.title}" />
                <h3>${item.title}</h3>
                <p>${item.artist}</p>
                <a href="${item.url}" target="_blank">View on Discogs</a>
              `;

        grid.appendChild(div);
      });
    }

    checkboxesContainer.addEventListener('change', updateFilter);
    filterMode.addEventListener('change', updateFilter);
    renderGrid(items);

    document.getElementById('open10').addEventListener('click', () => {
      const nextBatch = filteredItems.slice(openIndex, openIndex + 10);

      nextBatch.forEach((item) => {
        window.open(item.url, '_blank');
      });
      openIndex += 10;

      if (openIndex >= filteredItems.length) {
        document.getElementById('open10').disabled = true;
      }
    });
  });
