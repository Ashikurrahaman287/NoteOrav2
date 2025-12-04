
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
  
  // Try native parsing as fallback
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  return null;
}

function isToday(dateStr) {
  const date = parseDate(dateStr);
  if (!date) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  return date.getTime() === today.getTime();
}

async function getTodayEntries() {
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
      return { success: true, data: {}, totalCount: 0, message: 'No data found' };
    }

    const headers = rows[0];
    const todayEntries = [];
    const entriesByPerson = {};
    
    console.log(`\n=== Today's Entries Search ===`);
    console.log(`Total rows: ${rows.length - 1}`);
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      const initialRecordingDate = row[6] || '';
      const contactPerson = (row[5] || '').trim();
      
      if (isToday(initialRecordingDate)) {
        const record = {};
        headers.forEach((header, index) => {
          record[header] = row[index] || '';
        });
        todayEntries.push(record);
        
        // Group by contact person
        if (contactPerson) {
          if (!entriesByPerson[contactPerson]) {
            entriesByPerson[contactPerson] = [];
          }
          entriesByPerson[contactPerson].push(record);
        }
        
        console.log(`Row ${i}: Person=${contactPerson}, Date=${initialRecordingDate} ✓ TODAY`);
      }
    }
    
    // Count entries per person
    const personCounts = {};
    Object.keys(entriesByPerson).forEach(person => {
      personCounts[person] = entriesByPerson[person].length;
    });
    
    console.log(`\nTotal today's entries: ${todayEntries.length}`);
    console.log(`Entries by person:`, personCounts);

    return {
      success: true,
      data: todayEntries,
      entriesByPerson: entriesByPerson,
      personCounts: personCounts,
      totalCount: todayEntries.length,
      message: `Found ${todayEntries.length} entries made today`
    };
  } catch (error) {
    console.error('Error finding today\'s entries:', error);
    return { success: false, message: error.message };
  }
}

export { getTodayEntries };

export default async function handler(req, res) {
  try {
    const result = await getTodayEntries();
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json({ success: false, message: result.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
