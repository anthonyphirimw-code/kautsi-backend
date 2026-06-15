const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.json');

const defaultData = {
  users: [{ id: 1, username: 'admin', password_hash: null }],
  profile: {
    id: 1, name: 'Angel Takondwa Kautsi',
    tagline: 'Writer. Storyteller. Poet.',
    bio: 'Angel Takondwa Kautsi is a writer who weaves stories and poetry that explore the depths of human experience.',
    photo_url: null, email: 'angel@kautsi.com'
  },
  works: [],
  social_links: [],
  sections: {},
  gallery: [],
  nextId: { works: 1, social_links: 1, gallery: 1 }
};

let data = null;

function reload() {
  try {
    data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    data = JSON.parse(JSON.stringify(defaultData));
  }
  return data;
}

function load() {
  if (data) return data;
  return reload();
}

function save() {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function init() {
  load();
  if (!data.users[0].password_hash || data.users[0].password_hash === '$2a$10$dummy') {
    const bcrypt = require('bcryptjs');
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    data.users[0].username = process.env.ADMIN_USERNAME || 'admin';
    data.users[0].password_hash = bcrypt.hashSync(adminPassword, 10);
    save();
    console.log(`Admin user auto-initialized with username: ${data.users[0].username}`);
  }
}

function importData(newData) {
  data = newData;
  save();
}

function getProfile() { return load().profile; }
function updateProfile(fields) { Object.assign(load().profile, fields); save(); }
function getWorks() { return load().works; }
function getWork(id) { return load().works.find(w => w.id === id) || null; }

function saveWork(work) {
  const d = load();
  if (work.id) {
    const idx = d.works.findIndex(w => w.id === work.id);
    if (idx >= 0) d.works[idx] = { ...d.works[idx], ...work, updated_at: new Date().toISOString() };
  } else {
    work.id = d.nextId.works++;
    work.created_at = new Date().toISOString();
    work.updated_at = work.created_at;
    d.works.push(work);
  }
  save(); return work;
}

function deleteWork(id) { const d = load(); d.works = d.works.filter(w => w.id !== id); save(); }
function getSocialLinks() { return load().social_links; }

function saveSocialLink(link) {
  const d = load();
  if (link.id) {
    const idx = d.social_links.findIndex(l => l.id === link.id);
    if (idx >= 0) d.social_links[idx] = { ...d.social_links[idx], ...link };
  } else { link.id = d.nextId.social_links++; d.social_links.push(link); }
  save(); return link;
}

function deleteSocialLink(id) { const d = load(); d.social_links = d.social_links.filter(l => l.id !== id); save(); }
function getSections() { return load().sections; }
function getSection(key) { return load().sections[key] || null; }
function saveSection(key, title, content) { const d = load(); d.sections[key] = { key, title, content, updated_at: new Date().toISOString() }; save(); }
function deleteSection(key) { const d = load(); delete d.sections[key]; save(); }
function getUser(username) { return load().users.find(u => u.username === username) || null; }
function getUserById(id) { return load().users.find(u => u.id === id) || null; }
function updatePassword(userId, hash) { const d = load(); const u = d.users.find(u => u.id === userId); if (u) u.password_hash = hash; save(); }
function updateUsername(userId, username) { const d = load(); const u = d.users.find(u => u.id === userId); if (u) u.username = username; save(); }
function getUserCount() { return load().users.length; }
function getGallery() { return load().gallery; }
function addGalleryImage(url) { const d = load(); const item = { id: d.nextId.gallery++, url, uploaded_at: new Date().toISOString() }; d.gallery.push(item); save(); return item; }
function deleteGalleryImage(id) { const d = load(); d.gallery = d.gallery.filter(g => g.id !== id); save(); }

module.exports = {
  init, load, reload, save, getProfile, updateProfile,
  getWorks, getWork, saveWork, deleteWork,
  getSocialLinks, saveSocialLink, deleteSocialLink,
  getSections, getSection, saveSection, deleteSection,
  getUser, getUserById, updatePassword, updateUsername, getUserCount,
  getGallery, addGalleryImage, deleteGalleryImage, importData
};
