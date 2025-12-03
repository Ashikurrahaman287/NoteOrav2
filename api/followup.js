
import { google } from 'googleapis';
import { getAuthClient, getFirstSheetName } from '../utils/sheets-helper.js';

const SHEET_1_ID = "1riG_XlCSB5gZlWzU2wc8zebBS5KEN37n7fc3m4q6_rc";

function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // Try YYYY-MM-DD format
  const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]));
  }
  
  // Try MM/DD/YYYY format
  const us = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) {
    return new Date(parseInt(us[3]), parseInt(us[1]) - 1, parseInt(us[2]));
  }
  
  // Try DD/MM/YYYY format
  const eu = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (eu) {
    return new Date(parseInt(eu[3]), parseInt(eu[2]) - 1, parseInt(eu[1]));
  }
  
  // Try native Date parsing
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

async function getFollowUpRecords() {
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
    console.log(`Looking for Contact Person (column 7): ASH or Yvonne`);
    console.log(`Looking for Discussion Date (column 9): exactly 12 days ago\n`);
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Column 7 is Contact Person (index 6)
      // Column 9 is Discussion Date (index 8)
      const contactPerson = (row[6] || '').trim();
      const discussionDate = row[8] || '';
      
      const isValidPerson = contactPerson.toLowerCase() === 'ash' || contactPerson.toLowerCase() === 'yvonne';
      
      if (!isValidPerson) {
        continue;
      }
      
      const daysSince = getDaysSince(discussionDate);
      
      console.log(`Row ${i}: Person=${contactPerson}, Date=${discussionDate}, DaysSince=${daysSince}`);
      
      if (daysSince === 12) {
        const record = {};
        headers.forEach((header, index) => {
          record[header] = row[index] || '';
        });
        followUpRecords.push(record);
        console.log(`  ✓ MATCHED - Adding to results`);
      }
    }
    
    console.log(`\nTotal matches found: ${followUpRecords.length}`);

    const csv = convertToCSV(followUpRecords, headers);
    
    return {
      success: true,
      csv: csv,
      data: followUpRecords,
      count: followUpRecords.length,
      message: `Found ${followUpRecords.length} record(s) from ASH/Yvonne contacted exactly 12 days ago`
    };
  } catch (error) {
    console.error('Error finding follow-up records:', error);
    return { success: false, message: error.message };
  }
}

export { getFollowUpRecords };
