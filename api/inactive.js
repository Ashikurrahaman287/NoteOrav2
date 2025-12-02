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

function isInDiscussionWithExtension(discussionValue) {
  if (!discussionValue) return false;
  const lower = discussionValue.toLowerCase();
  return lower.includes('in discussion') && lower.includes('month extension');
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

async function findInactiveProjects(dayThreshold) {
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
    
    const inactiveProjects = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      const discussionValue = row[7] || '';
      
      if (isInDiscussionWithExtension(discussionValue)) {
        continue;
      }
      
      const lastContactDate = row[7] || row[6] || '';
      const daysSince = getDaysSince(lastContactDate);
      
      if (daysSince !== null && daysSince >= dayThreshold) {
        const record = {};
        headers.forEach((header, index) => {
          record[header] = row[index] || '';
        });
        record['Days Inactive'] = daysSince;
        inactiveProjects.push(record);
      }
    }
    
    inactiveProjects.sort((a, b) => b['Days Inactive'] - a['Days Inactive']);

    return {
      success: true,
      data: inactiveProjects,
      message: `Found ${inactiveProjects.length} project(s) inactive for ${dayThreshold}+ days`
    };
  } catch (error) {
    console.error('Error finding inactive projects:', error);
    return { success: false, data: [], message: error.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const days = parseInt(req.query.days) || 14;
  const result = await findInactiveProjects(days);
  res.status(200).json(result);
}

export { findInactiveProjects };
