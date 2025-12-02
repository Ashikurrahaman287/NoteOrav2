import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { addRecord } from './api/add.js';
import { searchRecords } from './api/search.js';
import { findInactiveProjects } from './api/inactive.js';
import { validateCode } from './api/validate-code.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/validate-code', async (req, res) => {
  try {
    const { code } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
    
    if (!code) {
      return res.status(400).json({ success: false, message: 'Access code is required' });
    }
    
    const result = await validateCode(code, clientIp);
    const status = result.success ? 200 : (result.locked ? 429 : 401);
    res.status(status).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/add', async (req, res) => {
  try {
    const result = await addRecord(req.body);
    const status = result.success ? 200 : 500;
    res.status(status).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.query || '';
    const result = await searchRecords(query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/inactive', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 14;
    const result = await findInactiveProjects(days);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;
