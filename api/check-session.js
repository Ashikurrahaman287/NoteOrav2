
import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import cookieParser from 'cookie-parser';

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

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

export default async function handler(req, res) {
  const cookies = req.cookies || {};
  const sessionToken = cookies.noteora_session;
  const isValid = validateSessionToken(sessionToken);
  
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ authenticated: isValid });
}
