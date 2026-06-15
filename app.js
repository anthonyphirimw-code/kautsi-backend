const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'kautsi-jwt-secret-change-me';
const API_URL = process.env.API_URL || `http://localhost:${PORT}`;

const uploadsDir = process.env.UPLOADS_DIR || (
  fs.existsSync(path.join(__dirname, '..', 'frontend', 'public'))
    ? path.join(__dirname, '..', 'frontend', 'public', 'uploads')
    : path.join(__dirname, 'uploads')
);
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

db.init();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files'));
  }
});

let corsOrigin = process.env.CORS_ORIGIN || '*';
if (typeof corsOrigin === 'string' && corsOrigin.includes(',')) {
  corsOrigin = corsOrigin.split(',').map(o => o.trim());
} else if (corsOrigin === '*') {
  corsOrigin = true; // Reflect origin to allow credentials
}
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

function fileUrl(file) {
  return file ? '/uploads/' + file.filename : null;
}

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Auth
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.getUser(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username } });
});

app.get('/api/auth/me', auth, (req, res) => {
  res.json({ user: { id: req.user.id, username: req.user.username } });
});

app.put('/api/auth/account', auth, (req, res) => {
  const { username, current_password, new_password } = req.body;
  const user = db.getUserById(req.user.id);
  if (!bcrypt.compareSync(current_password, user.password_hash)) return res.status(400).json({ error: 'Current password is incorrect' });

  if (username && username !== user.username) {
    if (db.getUser(username)) return res.status(400).json({ error: 'Username already taken' });
    db.updateUsername(req.user.id, username);
  }
  if (new_password) {
    if (new_password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    db.updatePassword(req.user.id, bcrypt.hashSync(new_password, 10));
  }
  const updated = db.getUserById(req.user.id);
  res.json({ user: { id: updated.id, username: updated.username } });
});

// Profile
app.get('/api/profile', (req, res) => res.json(db.getProfile()));

app.put('/api/profile', auth, upload.single('photo'), (req, res) => {
  const { name, tagline, bio, email } = req.body;
  const fields = { name, tagline, bio, email };
  if (req.file) fields.photo_url = fileUrl(req.file);
  db.updateProfile(fields);
  res.json(db.getProfile());
});

// Works
app.get('/api/works', (req, res) => res.json(db.getWorks()));
app.get('/api/works/:id', (req, res) => {
  const w = db.getWork(parseInt(req.params.id));
  if (!w) return res.status(404).json({ error: 'Not found' });
  res.json(w);
});

app.post('/api/works', auth, upload.single('cover'), (req, res) => {
  const { title, type, description, content, excerpt, purchase_url, featured, published_date } = req.body;
  const cover = req.file ? fileUrl(req.file) : null;
  const work = db.saveWork({ title, type, description, content, excerpt, purchase_url, cover_url: cover, featured: featured ? 1 : 0, published_date });
  res.json(work);
});

app.put('/api/works/:id', auth, upload.single('cover'), (req, res) => {
  const existing = db.getWork(parseInt(req.params.id));
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { title, type, description, content, excerpt, purchase_url, featured, published_date } = req.body;
  const updates = { id: parseInt(req.params.id), title, type, description, content, excerpt, purchase_url, featured: featured ? 1 : 0, published_date };
  if (req.file) updates.cover_url = fileUrl(req.file);
  res.json(db.saveWork(updates));
});

app.delete('/api/works/:id', auth, (req, res) => {
  db.deleteWork(parseInt(req.params.id));
  res.json({ ok: true });
});

// Social
app.get('/api/social-links', (req, res) => res.json(db.getSocialLinks()));

app.post('/api/social-links', auth, (req, res) => {
  const { platform, url, icon, sort_order } = req.body;
  res.json(db.saveSocialLink({ platform, url, icon, sort_order: parseInt(sort_order) || 0 }));
});

app.delete('/api/social-links/:id', auth, (req, res) => {
  db.deleteSocialLink(parseInt(req.params.id));
  res.json({ ok: true });
});

// Sections
app.get('/api/sections', (req, res) => {
  const s = db.getSections();
  res.json(Object.values(s));
});

app.post('/api/sections', auth, (req, res) => {
  const { key, title, content } = req.body;
  db.saveSection(key, title, content);
  res.json({ key, title, content });
});

app.delete('/api/sections/:key', auth, (req, res) => {
  db.deleteSection(req.params.key);
  res.json({ ok: true });
});

// Gallery
app.get('/api/gallery', (req, res) => res.json(db.getGallery()));

app.post('/api/gallery', auth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json(db.addGalleryImage(fileUrl(req.file)));
});

app.delete('/api/gallery/:id', auth, (req, res) => {
  db.deleteGalleryImage(parseInt(req.params.id));
  res.json({ ok: true });
});

// Backup
app.get('/api/backup/export', auth, (req, res) => {
  const backup = JSON.stringify(db.load(), null, 2);
  const filename = 'kautsi-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
  res.setHeader('Content-Type', 'application/json');
  res.send(backup);
});

app.post('/api/backup/import', auth, upload.single('backup'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  try {
    const raw = fs.readFileSync(req.file.path, 'utf-8');
    const restored = JSON.parse(raw);
    if (!restored.users || !restored.works || !restored.profile || !restored.nextId) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Invalid backup format' });
    }
    db.importData(restored);
    fs.unlinkSync(req.file.path);
    res.json({ ok: true, message: 'Data restored' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => console.log(`API running on ${API_URL}`));
