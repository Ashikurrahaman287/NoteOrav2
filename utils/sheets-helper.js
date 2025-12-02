import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function getAuthClient() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    return auth.getClient();
  }

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'urn:ietf:wg:oauth:2.0:oob'
    );
    oAuth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });
    return oAuth2Client;
  }

  try {
    const credentialsPath = path.join(__dirname, '..', 'credentials.json');
    const tokenPath = path.join(__dirname, '..', 'token.json');
    
    if (fs.existsSync(credentialsPath) && fs.existsSync(tokenPath)) {
      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));

      const { client_id, client_secret, redirect_uris } = credentials.installed;
      const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      oAuth2Client.setCredentials(token);
      return oAuth2Client;
    }
  } catch (error) {
    console.error('File-based auth failed:', error.message);
  }

  throw new Error('Google API credentials not configured. Please set GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REFRESH_TOKEN environment variables.');
}

export async function getFirstSheetName(spreadsheetId) {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId
    });
    
    if (response.data.sheets && response.data.sheets.length > 0) {
      return response.data.sheets[0].properties.title;
    }
    
    return 'Sheet1';
  } catch (error) {
    console.error('Error getting sheet name:', error.message);
    return 'Sheet1';
  }
}

export async function getSheetId(spreadsheetId, worksheetName) {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId
    });
    
    const sheet = response.data.sheets.find(
      s => s.properties.title === worksheetName
    );
    
    if (!sheet) {
      throw new Error(`Worksheet "${worksheetName}" not found. Available sheets: ${response.data.sheets.map(s => s.properties.title).join(', ')}`);
    }
    
    return sheet.properties.sheetId;
  } catch (error) {
    throw new Error(`Failed to get sheet ID: ${error.message}`);
  }
}
