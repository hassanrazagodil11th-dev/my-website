const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error('Database error: ', err.message);
});

db.run(`CREATE TABLE IF NOT EXISTS content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    filename TEXT,
    filetype TEXT
)`);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './public/uploads';
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.post('/api/upload-content', upload.single('mediaFile'), (req, res) => {
    const { title, description } = req.body;
    const filename = req.file ? req.file.filename : null;
    const filetype = req.file ? req.file.mimetype : null;

    db.run(`INSERT INTO content (title, description, filename, filetype) VALUES (?, ?, ?, ?)`, 
        [title, description, filename, filetype], (err) => {
        if (err) return res.status(500).send('Database error.');
        res.redirect('/admin-dashboard.html?success=true');
    });
});

app.get('/api/get-content', (req, res) => {
    db.all(`SELECT * FROM content ORDER BY id DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/delete/:id', (req, res) => {
    const itemId = req.params.id;
    db.get(`SELECT filename FROM content WHERE id = ?`, [itemId], (err, row) => {
        if (row && row.filename) {
            const filePath = path.join(__dirname, 'public', 'uploads', row.filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        db.run(`DELETE FROM content WHERE id = ?`, [itemId], (err) => {
            if (err) return res.status(500).json({ error: 'Failed to delete' });
            res.json({ success: true });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});