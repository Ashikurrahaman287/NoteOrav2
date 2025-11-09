import { google } from 'googleapis';
import { getAuthClient, getFirstSheetName, getSheetId } from '../utils/sheets-helper.js';

const SHEET_1_ID = "1riG_XlCSB5gZlWzU2wc8zebBS5KEN37n7fc3m4q6_rc";
const SHEET_2_ID = "1SzTC61GLJgO3_RPRSn8AGYwUF6O4-4uGyvG4EerTztI";

async function insertRowAtIndex3(spreadsheetId, recordData) {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const worksheetName = await getFirstSheetName(spreadsheetId);
  const sheetId = await getSheetId(spreadsheetId, worksheetName);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetId,
    resource: {
      requests: [
        {
          insertDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: 2,
              endIndex: 3
            }
          }
        }
      ]
    }
  });

  const values = [[
    recordData.ticker,
    recordData.projectName,
    recordData.xHandle,
    recordData.twitterOutreach,
    recordData.lockStatus,
    recordData.contactPerson,
    recordData.initialRecordingDate,
    recordData.discussionDate
  ]];

  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId,
    range: `${worksheetName}!A3:H3`,
    valueInputOption: 'USER_ENTERED',
    resource: { values }
  });
}

async function addRecord(recordData) {
  try {
    await insertRowAtIndex3(SHEET_1_ID, recordData);
    await insertRowAtIndex3(SHEET_2_ID, recordData);
    return { success: true, message: 'Record added successfully to both sheets' };
  } catch (error) {
    console.error('Error adding record:', error);
    return { success: false, message: error.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const result = await addRecord(req.body);
  const status = result.success ? 200 : 500;
  res.status(status).json(result);
}

export { addRecord };
