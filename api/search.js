import { google } from 'googleapis';
import { getAuthClient, getFirstSheetName } from '../utils/sheets-helper.js';

const SHEET_1_ID = "1riG_XlCSB5gZlWzU2wc8zebBS5KEN37n7fc3m4q6_rc";

async function searchRecords(query) {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const worksheetName = await getFirstSheetName(SHEET_1_ID);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_1_ID,
      range: `${worksheetName}!A:H`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return { success: true, data: [], message: 'No data found' };
    }

    const headers = rows[0];
    const searchLower = query.toLowerCase();
    
    const matchingRows = rows.slice(1).filter(row => {
      const ticker = (row[0] || '').toLowerCase();
      const projectName = (row[1] || '').toLowerCase();
      const xHandle = (row[2] || '').toLowerCase();
      return ticker.includes(searchLower) || projectName.includes(searchLower) || xHandle.includes(searchLower);
    });

    const results = matchingRows.map(row => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = row[index] || '';
      });
      return record;
    });

    return {
      success: true,
      data: results,
      message: `Found ${results.length} matching record(s)`
    };
  } catch (error) {
    console.error('Error searching records:', error);
    return { success: false, data: [], message: error.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const query = req.query.query || '';
  const result = await searchRecords(query);
  res.status(200).json(result);
}

export { searchRecords };
