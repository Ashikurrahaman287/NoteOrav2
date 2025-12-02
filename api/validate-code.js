const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 60000;

const attemptTracker = new Map();

function cleanupOldAttempts() {
  const now = Date.now();
  for (const [ip, data] of attemptTracker.entries()) {
    if (now - data.lastAttempt > COOLDOWN_MS * 2) {
      attemptTracker.delete(ip);
    }
  }
}

async function validateCode(code, clientIp) {
  cleanupOldAttempts();
  
  const now = Date.now();
  let attemptData = attemptTracker.get(clientIp) || { attempts: 0, lastAttempt: 0, lockedUntil: 0 };
  
  if (attemptData.lockedUntil > now) {
    const remainingSeconds = Math.ceil((attemptData.lockedUntil - now) / 1000);
    return {
      success: false,
      message: `Too many failed attempts. Please wait ${remainingSeconds} seconds before trying again.`,
      locked: true,
      remainingSeconds
    };
  }
  
  const secretCode = process.env.APP_SECRET_CODE;
  
  if (!secretCode) {
    console.error('APP_SECRET_CODE environment variable is not set');
    return {
      success: false,
      message: 'Server configuration error. Please contact administrator.',
      locked: false
    };
  }
  
  if (code === secretCode) {
    attemptTracker.delete(clientIp);
    return {
      success: true,
      message: 'Access granted'
    };
  }
  
  attemptData.attempts += 1;
  attemptData.lastAttempt = now;
  
  if (attemptData.attempts >= MAX_ATTEMPTS) {
    attemptData.lockedUntil = now + COOLDOWN_MS;
    attemptData.attempts = 0;
    attemptTracker.set(clientIp, attemptData);
    return {
      success: false,
      message: `Too many failed attempts. Please wait 60 seconds before trying again.`,
      locked: true,
      remainingSeconds: 60
    };
  }
  
  attemptTracker.set(clientIp, attemptData);
  const remainingAttempts = MAX_ATTEMPTS - attemptData.attempts;
  
  return {
    success: false,
    message: `Invalid access code. ${remainingAttempts} attempt(s) remaining.`,
    locked: false,
    remainingAttempts
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { code } = req.body;
  const clientIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
  
  if (!code) {
    return res.status(400).json({ success: false, message: 'Access code is required' });
  }

  const result = await validateCode(code, clientIp);
  const status = result.success ? 200 : (result.locked ? 429 : 401);
  res.status(status).json(result);
}

export { validateCode };
