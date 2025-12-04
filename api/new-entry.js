
import { google } from 'googleapis';
import { getAuthClient, getFirstSheetName } from '../utils/sheets-helper.js';

const SHEET_1_ID = "1riG_XlCSB5gZlWzU2wc8zebBS5KEN37n7fc3m4q6_rc";

function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // ISO format: YYYY-MM-DD
  const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]));
  }
  
  // MM/DD/YYYY format
  const mmddyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const month = parseInt(mmddyyyy[1]);
    const day = parseInt(mmddyyyy[2]);
    const year = parseInt(mmddyyyy[3]);
    return new Date(year, month - 1, day);
  }
  
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  return null;
}

function getMinutesAgo(dateStr) {
  const date = parseDate(dateStr);
  if (!date) return null;
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  return diffMinutes;
}

function isToday(dateStr) {
  const date = parseDate(dateStr);
  if (!date) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  return date.getTime() === today.getTime();
}

async function getNewEntries(limit = 50) {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const worksheetName = await getFirstSheetName(SHEET_1_ID);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_1_ID,
      range: `${worksheetName}!A:J`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return { success: true, data: [], message: 'No data found' };
    }

    const headers = rows[0];
    const newEntries = [];
    
    const recentRows = rows.slice(1, Math.min(limit + 1, rows.length));
    
    for (let i = 0; i < recentRows.length; i++) {
      const row = recentRows[i];
      
      const initialRecordingDate = row[6] || '';
      
      if (isToday(initialRecordingDate)) {
        const record = {};
        headers.forEach((header, index) => {
          record[header] = row[index] || '';
        });
        record['_position'] = i;
        record['_rowIndex'] = i + 2;
        newEntries.push(record);
      }
    }

    return {
      success: true,
      data: newEntries,
      count: newEntries.length,
      limit: limit,
      message: `Found ${newEntries.length} entries from today (checking top ${limit} rows)`
    };
  } catch (error) {
    console.error('Error finding new entries:', error);
    return { success: false, message: error.message };
  }
}

export { getNewEntries };

export default async function handler(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const result = await getNewEntries(limit);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json({ success: false, message: result.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
