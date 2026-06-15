const bcrypt = require('bcryptjs');
const db = require('./db');
db.init();

const hash = bcrypt.hashSync('admin123', 10);
const d = db.load();
d.users[0].password_hash = hash;
d.profile = {
  id: 1, name: 'Angel Takondwa Kautsi',
  tagline: 'Writer. Storyteller. Poet.',
  bio: 'Angel Takondwa Kautsi is a writer who weaves stories and poetry that explore the depths of human experience.',
  photo_url: null, email: 'angel@kautsi.com'
};
d.works = [{
  id: d.nextId.works++, title: 'Whispers of the Tulip', type: 'book',
  description: "A captivating collection of stories and poems that explore love, loss, and the quiet strength found in nature's most delicate blooms.",
  cover_url: null, purchase_url: 'https://example.com/buy-whispers-of-the-tulip',
  featured: 1, published_date: '2025-01-15',
  created_at: new Date().toISOString(), updated_at: new Date().toISOString()
}];
d.social_links = [
  { id: d.nextId.social_links++, platform: 'Instagram', url: 'https://instagram.com/angeltakondwa', icon: 'instagram', sort_order: 1 },
  { id: d.nextId.social_links++, platform: 'TikTok', url: 'https://tiktok.com/@angeltakondwa', icon: 'tiktok', sort_order: 2 },
  { id: d.nextId.social_links++, platform: 'Twitter', url: 'https://twitter.com/angeltakondwa', icon: 'twitter', sort_order: 3 },
  { id: d.nextId.social_links++, platform: 'Wattpad', url: 'https://wattpad.com/user/angeltakondwa', icon: 'book', sort_order: 4 }
];
d.sections = {
  hero_subtitle: { key: 'hero_subtitle', title: 'Hero Subtitle', content: 'Discover the beauty of words through stories and poetry that touch the soul.', updated_at: new Date().toISOString() },
  hero_about_text: { key: 'hero_about_text', title: 'About Text', content: 'Angel Takondwa Kautsi is a writer from Malawi, passionate about storytelling in all its forms.', updated_at: new Date().toISOString() }
};
d.gallery = [];
d.nextId = { works: 20, social_links: 20, gallery: 20 };
db.save();
console.log('Seeded! Login: admin / admin123');
