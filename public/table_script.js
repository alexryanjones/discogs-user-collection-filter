const parts = window.location.pathname.split('/');
const username = parts[parts.length - 1];

let filteredItems = [];
let allItems = [];
let totalItemsExpected = 0;
let openIndex = 0;
let lastSeenIndex = 0;
let error = false;
let collectionShown = false;
let firstRender = true;

let currentPage = 0;
const pageSize = 250;

const collection = document.getElementById('collection');
const collectionTitle = document.getElementById('collection-title');
const grid = document.getElementById('grid');
const checkboxesContainer = document.getElementById('style-checkboxes');
const filterMode = document.getElementById('filterMode');
const openButton = document.getElementById('open10');
const loadedCount = document.getElementById('loaded-count');
const totalCount = document.getElementById('total-count');
const progress = document.getElementById('progress-bar');
const empty = document.getElementById('empty-collection');
const private = document.getElementById('private-collection');
const prevPage = document.getElementById('prev-page');
const nextPage = document.getElementById('next-page');

collectionTitle.textContent = `${username}'s Collection`;

function transform(headers, rows) {
  return rows.map((row) =>
    Object.fromEntries(headers.map((h, i) => [h, row[i]]))
  );
}

function updateTotal(newTotal) {
  totalItemsExpected = newTotal;
  totalCount.textContent = `${newTotal} records`;
}

function updateProgress() {
  loadedCount.textContent = `Loaded ${allItems.length} of `;
  const percent = Math.min((allItems.length / totalItemsExpected) * 100, 100);
  progress.style.width = `${percent}%`;
}

function showCollection() {
  collection.style.display = 'block';
  collectionShown = true;
}

function showEmptyCollection() {
  empty.style.display = 'flex';
}

function showPrivateCollection() {
  private.style.display = 'flex';
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
  currentPage = 0;
  renderCurrentPage();
  openButton.disabled = filteredItems.length === 0;
}

function next10() {
  const start = currentPage * pageSize + openIndex;
  const batch = filteredItems.slice(start, start + 10);
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
  if (newItems.length > 0) handleNewRecords(newItems);

  const status = await fetch(`/task_status/${username}`).then((r) => r.json());

  if (status.private) {
    showPrivateCollection();
    return;
  };
  
  if (status.empty) {
    showEmptyCollection();
    return;
  };

  if (status.totalItems > 0 && !collectionShown) showCollection();

  if (totalItemsExpected !== status.totalItems) updateTotal(status.totalItems);

  if (!status.error) error = true;

  if (status.fetching) {
    poll();
    return;
  }

  const moreOnBackend = status.currentCount > allItems.length;

  if (moreOnBackend) {
    if (status.completed) setTimeout(() => poll(), 250);
    if (!status.completed) poll();
  }
}

function handleNewRecords(records) {
  lastSeenIndex += records.length;

  allItems.push(...records);

  const selected = [
    ...checkboxesContainer.querySelectorAll('input:checked'),
  ].map((cb) => cb.value.toLowerCase());

  const isAnd = filterMode.checked;

  const newFiltered = records.filter((item) => {
    const elementStyles = (item.style || '')
      .toLowerCase()
      .split(',')
      .map((s) => s.trim());
    if (selected.length === 0) return true;

    return isAnd
      ? selected.every((style) => elementStyles.includes(style))
      : selected.some((style) => elementStyles.includes(style));
  });

  filteredItems.push(...newFiltered);
  if (filteredItems.length === newFiltered.length) updateStyleFilters();
  updateProgress();
  if (firstRender) {
    renderCurrentPage();
    firstRender = false;
  }
  openButton.disabled = filteredItems.length === 0;
}

function renderCurrentPage() {
  const start = currentPage * pageSize;
  const end = start + pageSize;
  const items = filteredItems.slice(start, end);

  grid.innerHTML = '';
  const fragment = document.createDocumentFragment();

  items.forEach((item) => {
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
  document.getElementById('page-indicator').textContent = `Page ${
    currentPage + 1
  }`;
}

checkboxesContainer.addEventListener('change', updateFilter);
filterMode.addEventListener('change', updateFilter);
openButton.addEventListener('click', next10);
nextPage.addEventListener('click', () => {
  const maxPage = Math.floor(filteredItems.length / pageSize);
  if (currentPage < maxPage) {
    currentPage++;
    renderCurrentPage();
  }
});

prevPage.addEventListener('click', () => {
  if (currentPage > 0) {
    currentPage--;
    renderCurrentPage();
  }
});

poll();