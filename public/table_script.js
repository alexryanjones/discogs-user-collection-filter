const parts = window.location.pathname.split('/');
const username = parts[parts.length - 1];

let filteredItems = [];
let allItems = [];
let allItemsCount = 0;
let openIndex = 0;
let lastSeenIndex = 0;
let error = false;

const collectionTitle = document.getElementById('collectionTitle');
const grid = document.getElementById('grid');
const checkboxesContainer = document.getElementById('styleCheckboxes');
const filterMode = document.getElementById('filterMode');
const openButton = document.getElementById('open10');
const loadedCount = document.getElementById('loadedCount');
const totalCount = document.getElementById('totalCount');
const progress = document.getElementById('progress-bar');

collectionTitle.textContent = `${username}'s Collection`;

function transform(headers, rows) {
  return rows.map((row) =>
    Object.fromEntries(headers.map((h, i) => [h, row[i]]))
  );
}

function updateTotal() {
  totalCount.textContent = `${allItemsCount} records`;
}

function updateProgress() {
  loadedCount.textContent = `Loaded ${allItems.length} of `;
  const percent = Math.min((allItems.length / allItemsCount) * 100, 100);
  progress.style.width = `${percent}%`;
}

function updateFilter() {
  const selected = [
    ...checkboxesContainer.querySelectorAll('input:checked'),
  ].map((cb) => cb.value.toLowerCase());
  const isAnd = filterMode.checked;

  filteredItems = allItems.filter((item) => {
    const itemStyles = (item.style || '')
      .toLowerCase()
      .split(',')
      .map((s) => s.trim());
    if (selected.length === 0) return true;

    return isAnd
      ? selected.every((style) => itemStyles.includes(style))
      : selected.some((style) => itemStyles.includes(style));
  });

  openIndex = 0;
  grid.innerHTML = '';
  renderNewItems(filteredItems);
  openButton.disabled = filteredItems.length === 0;
}

function renderNewItems(newItems) {
  const fragment = document.createDocumentFragment();

  newItems.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'card';
    div.setAttribute('data-object-type', 'release');
    div.setAttribute('data-object-id', item.id);
    div.innerHTML = `
      <img src="${item.image}" alt="${item.title}" />
      <h3>${item.title}</h3>
      <p>${item.artist}</p>
      <a href="${item.url}" target="_blank">View on Discogs</a>
    `;
    fragment.appendChild(div);
  });

  grid.appendChild(fragment);
}

function next10() {
  const batch = filteredItems.slice(openIndex, openIndex + 10);
  batch.forEach((item) => window.open(item.url, '_blank'));
  openIndex += 10;
  openButton.disabled = openIndex >= filteredItems.length;
}

function updateStyleFilters() {
  const selectedValues = new Set(
    [...checkboxesContainer.querySelectorAll('input:checked')].map(
      (cb) => cb.value
    )
  );

  const allStyles = new Set();
  allItems.forEach((item) => {
    (item.style || '')
      .split(',')
      .map((s) => s.trim())
      .forEach((s) => {
        if (s) allStyles.add(s);
      });
  });

  checkboxesContainer.innerHTML = '';
  [...allStyles]
    .sort((a, b) => a.localeCompare(b))
    .forEach((style) => {
      const label = document.createElement('label');
      label.innerHTML = `<input type="checkbox" value="${style}" ${
        selectedValues.has(style) ? 'checked' : ''
      } /> ${style}`;
      checkboxesContainer.appendChild(label);
    });

  [...checkboxesContainer.querySelectorAll('input')].forEach((input) =>
    input.addEventListener('change', updateFilter)
  );
}

async function poll() {
  const res = await fetch(`/table_data/${username}?from=${lastSeenIndex}&limit=50`);
  const { headers, data } = await res.json();

  const newItems = transform(headers, data);
  if (newItems.length > 0) {
    lastSeenIndex += newItems.length;
    allItems.push(...newItems);

    const selected = [
      ...checkboxesContainer.querySelectorAll('input:checked'),
    ].map((cb) => cb.value.toLowerCase());
    const isAnd = filterMode.checked;

    const newFiltered = newItems.filter((item) => {
      const itemStyles = (item.style || '')
        .toLowerCase()
        .split(',')
        .map((s) => s.trim());
      if (selected.length === 0) return true;
      return isAnd
        ? selected.every((style) => itemStyles.includes(style))
        : selected.some((style) => itemStyles.includes(style));
    });

    filteredItems.push(...newFiltered);
    renderNewItems(newFiltered);
  }
  updateStyleFilters();
  updateProgress();
  openButton.disabled = filteredItems.length === 0;

  const status = await fetch(`/task_status/${username}`).then((r) => r.json());
  if (status.items !== allItemsCount) {
    allItemsCount = status.items;
    updateTotal();
  };
  if (!status.completed) poll();
  if (!status.error) error = true;
}

checkboxesContainer.addEventListener('change', updateFilter);
filterMode.addEventListener('change', updateFilter);
openButton.addEventListener('click', next10);

poll();