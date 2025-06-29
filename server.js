import express from 'express';
import bodyParser from 'body-parser';
import { fetchCollection } from './discogs.js';

const app = express();
const PORT = 3000;

const TASKS_STATUS = {};
const RESULTS = {};

let username = '';

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.post('/', (req, res) => {
  username = req.body.user_input?.trim();
  if (!username)
    return res.json({ success: false, message: 'Enter a username' });

  const key = username.toLowerCase();
  RESULTS[key] = [];
  TASKS_STATUS[key] = {
    fetching: true,
    received: false,
    completed: false,
    error: false,
    private: false,
    empty: false,
    totalItems: 0,
    currentCount: 0
  };

  fetchCollection(
    username,
    (record) => {
      RESULTS[key].push(record);
      if (TASKS_STATUS[key].received !== true) TASKS_STATUS[key].received = true;
    },
    () => TASKS_STATUS[key].error = true,
    (pages) => {
      TASKS_STATUS[key].private = pages.private;
      TASKS_STATUS[key].totalItems = pages.items;
      TASKS_STATUS[key].empty = !pages.private && pages.items === 0
    }).then(() => {
      TASKS_STATUS[key].completed = true;
      TASKS_STATUS[key].fetching = false;
      console.log(`Fetched ${RESULTS[key].length} records for "${username}, of ${TASKS_STATUS[key].totalItems} expected"`);
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
  const key = req.params.username.toLowerCase();
  const status = TASKS_STATUS[key];
  if (!status) return res.status(404).json({ error: 'Invalid task ID' });

  res.json({
    fetching: status.fetching,
    received: status.received,
    completed: status.completed,
    error: status.error,
    private: status.private,
    empty: status.empty,
    totalItems: status.totalItems,
    currentCount: RESULTS[key].length,
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

app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
