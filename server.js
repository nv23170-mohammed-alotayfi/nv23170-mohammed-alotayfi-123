const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const db = new sqlite3.Database('./todo.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      due_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

// Routes
app.get('/tasks', (req, res) => {
  const { q, status, priority, sort_by = 'created_at', sort_order = 'desc' } = req.query;
  let query = 'SELECT * FROM tasks';
  let params = [];
  let conditions = [];

  if (q) {
    conditions.push('(title LIKE ? OR description LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  if (priority) {
    conditions.push('priority = ?');
    params.push(priority);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  const validSortBy = ['created_at', 'due_date', 'priority'];
  const validOrder = ['asc', 'desc'];
  const sort = validSortBy.includes(sort_by) ? sort_by : 'created_at';
  const order = validOrder.includes(sort_order) ? sort_order : 'desc';

  query += ` ORDER BY ${sort} ${order.toUpperCase()}`;

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/tasks', (req, res) => {
  const { title, description, status, priority, due_date } = req.body;
  db.run(`INSERT INTO tasks (title, description, status, priority, due_date) VALUES (?, ?, ?, ?, ?)`,
    [title, description || '', status || 'pending', priority || 'medium', due_date],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    });
});

app.put('/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, status, priority, due_date } = req.body;
  db.run(`UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [title, description, status, priority, due_date, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ changes: this.changes });
    });
});

app.delete('/tasks/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM tasks WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});