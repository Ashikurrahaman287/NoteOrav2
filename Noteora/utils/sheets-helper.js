import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function getAuthClient() {
  const credentials = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'credentials.json'), 'utf8')
  );
  const token = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'token.json'), 'utf8')
  );

  const { client_id, client_secret, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  oAuth2Client.setCredentials(token);
  return oAuth2Client;
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
