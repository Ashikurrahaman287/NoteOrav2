import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import { addRecord } from './api/add.js';
import { searchRecords } from './api/search.js';
import { findInactiveProjects } from './api/inactive.js';
import { validateCode } from './api/validate-code.js';
import { getFollowUpRecords } from './api/followup.js';
import { getTodayEntries } from './api/today-entries.js';
import { getNewEntries } from './api/new-entry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

const SESSION_DURATION_MS = 200 * 60 * 1000;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

function createSessionToken() {
  const payload = {
    exp: Date.now() + SESSION_DURATION_MS,
    iat: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex')
  };
  const payloadStr = JSON.stringify(payload);
  const encrypted = CryptoJS.AES.encrypt(payloadStr, SESSION_SECRET).toString();
  return encrypted;
}

function validateSessionToken(token) {
  if (!token) return false;
  try {
    const decrypted = CryptoJS.AES.decrypt(token, SESSION_SECRET);
    const payloadStr = decrypted.toString(CryptoJS.enc.Utf8);
    if (!payloadStr) return false;
    const payload = JSON.parse(payloadStr);
    if (Date.now() > payload.exp) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

function checkSameOrigin(req) {
  const origin = req.get('Origin');
  const referer = req.get('Referer');
  const host = req.get('Host');
  
  if (!origin && !referer) {
    return true;
  }
  
  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.host === host) return true;
    } catch (e) {
      return false;
    }
  }
  
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.host === host) return true;
    } catch (e) {
      return false;
    }
  }
  
  return false;
}

function requireAuth(req, res, next) {
  if (!checkSameOrigin(req)) {
    return res.status(403).json({ success: false, message: 'Cross-origin request not allowed' });
  }
  
  const sessionToken = req.cookies.noteora_session;
  if (!validateSessionToken(sessionToken)) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  next();
}

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/validate-code', async (req, res) => {
  try {
    const { code } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
    
    if (!code) {
      return res.status(400).json({ success: false, message: 'Access code is required' });
    }
    
    const result = await validateCode(code, clientIp);
    
    if (result.success) {
      const sessionToken = createSessionToken();
      res.cookie('noteora_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_DURATION_MS,
        path: '/'
      });
    }
    
    const status = result.success ? 200 : (result.locked ? 429 : 401);
    res.status(status).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/check-session', (req, res) => {
  const sessionToken = req.cookies.noteora_session;
  const isValid = validateSessionToken(sessionToken);
  res.json({ authenticated: isValid });
});

app.post('/api/add', requireAuth, async (req, res) => {
  try {
    const result = await addRecord(req.body);
    const status = result.success ? 200 : 500;
    res.status(status).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/search', requireAuth, async (req, res) => {
  try {
    const query = req.query.query || '';
    const result = await searchRecords(query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/inactive', requireAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 14;
    const result = await findInactiveProjects(days);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/followup', requireAuth, async (req, res) => {
  try {
    const format = req.query.format || 'csv';
    const days = parseInt(req.query.days) || 12;
    const result = await getFollowUpRecords(days);
    
    if (result.success) {
      if (format === 'csv' && result.csv) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=followup-${days}days.csv`);
        res.send(result.csv);
      } else {
        res.json(result);
      }
    } else {
      res.status(500).json({ success: false, message: result.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/today-entries', requireAuth, async (req, res) => {
  try {
    const result = await getTodayEntries();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ success: false, message: result.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/new-entry', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const result = await getNewEntries(limit);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ success: false, message: result.message });
    }
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
