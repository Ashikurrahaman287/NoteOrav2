
import { google } from 'googleapis';
import { getAuthClient, getFirstSheetName } from '../utils/sheets-helper.js';

const SHEET_1_ID = "1riG_XlCSB5gZlWzU2wc8zebBS5KEN37n7fc3m4q6_rc";

function parseDate(dateStr) {
  if (!dateStr) return null;
  
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/,
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0]) {
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      } else {
        return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
      }
    }
  }
  
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
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

async function getFollowUpRecords() {
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
    const followUpRecords = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      const contactPerson = (row[5] || '').trim();
      const lastContactDate = row[7] || '';
      
      const isValidPerson = contactPerson.toLowerCase() === 'ash' || contactPerson.toLowerCase() === 'yvonne';
      
      if (!isValidPerson) {
        continue;
      }
      
      const daysSince = getDaysSince(lastContactDate);
      
      if (daysSince === 12) {
        const record = {};
        headers.forEach((header, index) => {
          record[header] = row[index] || '';
        });
        followUpRecords.push(record);
      }
    }

    const csv = convertToCSV(followUpRecords, headers);
    
    return {
      success: true,
      csv: csv,
      count: followUpRecords.length,
      message: `Found ${followUpRecords.length} record(s) from ASH/Yvonne contacted exactly 12 days ago`
    };
  } catch (error) {
    console.error('Error finding follow-up records:', error);
    return { success: false, message: error.message };
  }
}

export { getFollowUpRecords };
