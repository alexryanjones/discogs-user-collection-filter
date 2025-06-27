import express from 'express';
import bodyParser from 'body-parser';
import { fetchCollection } from './discogs.js';

const app = express();
const PORT = 3000;

const TASKS_STATUS = {};
const RESULTS = {};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.post('/', (req, res) => {
  const username = req.body.user_input?.trim();
  if (!username)
    return res.json({ success: false, message: 'Enter a username' });

  const key = username.toLowerCase();
  RESULTS[key] = [];
  TASKS_STATUS[key] = { completed: false, partial: false, items: 0 };

  fetchCollection(
    username,
    (record) => RESULTS[key].push(record),
    () => TASKS_STATUS[key].partial = true,
    (pages) => TASKS_STATUS[key].items = pages.items
  ).then(() => {
    TASKS_STATUS[key].completed = true;
  });

  res.json({
    success: true,
    message: 'Fetching user collection...',
    unique_id: key,
  });
});

app.get('/table/:username', (req, res) => {
  res.sendFile(process.cwd() + '/public/table.html');
});

app.get('/task_status/:username', (req, res) => {
  const username = req.params.username.toLowerCase();
  const status = TASKS_STATUS[username];
  if (!status) return res.status(404).json({ error: 'Invalid task ID' });
  res.json({
    completed: status.completed,
    error: status.error,
    items: status.items,
  });
});

app.get('/table_data/:username', (req, res) => {
  const username = req.params.username;
  const fromIndex = parseInt(req.query.from || '0', 10);
  const limit = parseInt(req.query.limit || '50', 10);

  const records = RESULTS[username];
  if (!records) return res.status(404).json({ error: 'Data not found' });

  const headers = Object.keys(records[0] || {});
  const data = records.slice(fromIndex, fromIndex + limit).map((r) => Object.values(r));

  res.json({ headers, data, username });
});

app.get('/records_since/:username/:index', (req, res) => {
  const username = req.params.username.toLowerCase();
  const from = parseInt(req.params.index, 10) || 0;

  const all = RESULTS[username];
  if (!all) return res.json({ records: [] });

  const newRecords = all.slice(from);
  res.json({ records: newRecords });
});

app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
