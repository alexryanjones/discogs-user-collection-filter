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
  if (!username) return res.json({ success: false, message: 'Enter a username' });

  const key = username.toLowerCase();
  TASKS_STATUS[key] = { completed: false };

  fetchCollection(username)
    .then((records) => {
      RESULTS[key] = records;
      TASKS_STATUS[key].completed = true;
    })
    .catch((err) => {
      TASKS_STATUS[key] = { completed: false, error: true };
    });

  res.json({
    success: true,
    message: 'Fetching user collection...',
    unique_id: key,
  });
});

app.get('/task_status/:username', (req, res) => {
  const username = req.params.username;
  const status = TASKS_STATUS[username];
  if (!status) return res.status(404).json({ error: 'Invalid task ID' });
  res.json({ completed: status.completed });
});

app.get('/table/:username', (req, res) => {
  const username = req.params.username;
  if (!RESULTS[username]) return res.status(404).send('Collection not found.');
  res.sendFile(process.cwd() + '/public/table.html');
});

app.get('/table_data/:username', (req, res) => {
  const username = req.params.username;
  const records = RESULTS[username];
  if (!records) return res.status(404).json({ error: 'Data not found' });

  const headers = Object.keys(records[0] || {});
  const data = records.map((r) => Object.values(r));
  res.json({ headers, data, username });
});

app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
