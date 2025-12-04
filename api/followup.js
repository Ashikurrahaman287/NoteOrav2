
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
  
  // MM/DD/YYYY format (American - used in your sheet based on 11/21/2025)
  const mmddyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const month = parseInt(mmddyyyy[1]);
    const day = parseInt(mmddyyyy[2]);
    const year = parseInt(mmddyyyy[3]);
    return new Date(year, month - 1, day);
  }
  
  // MM-DD-YYYY format
  const mmddyyyyDash = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (mmddyyyyDash) {
    return new Date(parseInt(mmddyyyyDash[3]), parseInt(mmddyyyyDash[1]) - 1, parseInt(mmddyyyyDash[2]));
  }
  
  // Try native parsing as fallback
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  console.log(`  ⚠ Could not parse date: "${dateStr}"`);
  return null;
}

function getDaysSince(dateStr) {
  const date = parseDate(dateStr);
  if (!date) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  const diffTime = today.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

function convertToCSV(data, headers) {
  const csvRows = [];
  csvRows.push(headers.join(','));
  
  data.forEach(record => {
    const values = headers.map(header => {
      const value = String(record[header] || '');
      return value.includes(',') || value.includes('"') ? `"${value.replace(/"/g, '""')}"` : value;
    });
    csvRows.push(values.join(','));
  });
  
  return csvRows.join('\n');
}

async function getFollowUpRecords(targetDays = 12) {
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
    const followUpRecords = [];
    
    console.log(`\n=== Follow-Up Search ===`);
    console.log(`Total rows: ${rows.length - 1}`);
    console.log(`Headers:`, headers);
    console.log(`Looking for Contact Person (column 6): ASH or Yvonne`);
    console.log(`Looking for Initial Recording Date (column 7): ${targetDays} days ago (±1 day tolerance)\n`);
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      const contactPerson = (row[5] || '').trim();
      const initialRecordingDate = row[6] || '';
      
      const isValidPerson = contactPerson.toLowerCase() === 'ash' || contactPerson.toLowerCase() === 'yvonne';
      
      if (!isValidPerson) {
        continue;
      }
      
      const daysSince = getDaysSince(initialRecordingDate);
      
      // Allow ±1 day tolerance since dates can vary
      if (daysSince >= targetDays - 1 && daysSince <= targetDays + 1) {
        const record = {};
        headers.forEach((header, index) => {
          record[header] = row[index] || '';
        });
        followUpRecords.push(record);
        console.log(`Row ${i}: Person=${contactPerson}, Date=${initialRecordingDate}, DaysSince=${daysSince} ✓ MATCHED`);
      }
    }
    
    console.log(`\nTotal matches found: ${followUpRecords.length}`);

    const csv = convertToCSV(followUpRecords, headers);
    
    return {
      success: true,
      csv: csv,
      data: followUpRecords,
      count: followUpRecords.length,
      message: `Found ${followUpRecords.length} record(s) from ASH/Yvonne contacted ${targetDays} days ago (±1 day)`
    };
  } catch (error) {
    console.error('Error finding follow-up records:', error);
    return { success: false, message: error.message };
  }
}

export { getFollowUpRecords };

export default async function handler(req, res) {
  try {
    const format = req.query.format || 'csv';
    const days = parseInt(req.query.days) || 12;
    const result = await getFollowUpRecords(days);
    
    if (result.success) {
      if (format === 'csv' && result.csv) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=followup-${days}days.csv`);
        res.status(200).send(result.csv);
      } else {
        res.status(200).json(result);
      }
    } else {
      res.status(500).json({ success: false, message: result.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
