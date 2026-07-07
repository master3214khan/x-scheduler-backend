const express = require('express');
const cron = require('node-cron');
const { TwitterApi } = require('twitter-api-v2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Upload folder banao
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Post queue
let postQueue = [];

// Scheduler - har minute check karo
cron.schedule('* * * * *', async () => {
  const now = new Date();
  const duePosts = postQueue.filter(p => 
    new Date(p.scheduledTime) <= now && !p.posted
  );

  for (const post of duePosts) {
    try {
      const client = new TwitterApi({
        appKey: post.apiKey,
        appSecret: post.apiSecret,
        accessToken: post.accessToken,
        accessSecret: post.accessSecret,
      });

      const fullText = post.caption + '\n\n' + post.tags;

      if (post.imagePath) {
        const mediaId = await client.v1.uploadMedia(post.imagePath);
        await client.v2.tweet({
          text: fullText,
          media: { media_ids: [mediaId] }
        });
      } else {
        await client.v2.tweet({ text: fullText });
      }

      post.posted = true;
      console.log(`✅ Posted: ${post.caption.substring(0, 30)}`);
    } catch (err) {
      console.error('❌ Post failed:', err.message);
    }
  }
});

// Image upload route
app.post('/api/upload', upload.array('images', 200), (req, res) => {
  const files = req.files.map(f => ({
    filename: f.filename,
    path: f.path,
    originalName: f.originalname
  }));
  res.json({ success: true, files });
});

// Schedule route
app.post('/api/schedule', (req, res) => {
  const { posts } = req.body;
  postQueue.push(...posts);
  res.json({ success: true, queued: posts.length });
});

// Queue check route
app.get('/api/queue', (req, res) => {
  res.json(postQueue);
});
app.listen(3001, () => {
  console.log('🚀 Backend running on http://localhost:3001');
});
app.listen(3001, () => {
  console.log('🚀 Backend running on http://localhost:3001');
});
