const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const dataFile = path.join(__dirname, 'data', 'battles.json');

app.use(express.json());
app.use(express.static(__dirname));

app.get('/battles', (req, res) => {
  fs.readFile(dataFile, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Unable to read data' });
    try {
      res.json(JSON.parse(data || '[]'));
    } catch {
      res.json([]);
    }
  });
});

app.post('/battles', (req, res) => {
  fs.readFile(dataFile, 'utf8', (err, data) => {
    let battles = [];

    // Safely parse existing battle data. If the file is missing or contains
    // invalid JSON the server previously crashed which meant the homepage
    // couldn't load any battles.
    if (!err && data) {
      try {
        battles = JSON.parse(data);
      } catch {
        battles = [];
      }
    }

    const battle = { id: Date.now(), ...req.body };
    battles.push(battle);

    fs.writeFile(dataFile, JSON.stringify(battles, null, 2), err2 => {
      if (err2) return res.status(500).json({ error: 'Unable to save data' });
      res.json(battle);
    });
  });
});

app.put('/battles/:id', (req, res) => {
  fs.readFile(dataFile, 'utf8', (err, data) => {
    let battles = [];

    if (err) {
      return res.status(500).json({ error: 'Unable to read data' });
    }

    if (data) {
      try {
        battles = JSON.parse(data);
      } catch {
        return res.status(500).json({ error: 'Unable to parse data' });
      }
    }

    const id = Number(req.params.id);
    const index = battles.findIndex(b => b.id === id);
    if (index === -1) return res.status(404).json({ error: 'Not found' });

    battles[index] = { id, ...req.body };
    fs.writeFile(dataFile, JSON.stringify(battles, null, 2), err2 => {
      if (err2) return res.status(500).json({ error: 'Unable to save data' });
      res.json(battles[index]);
    });
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
