# Noteora Sheet Portal

A Node.js web application for managing Google Sheets records with search and add functionality.

## Features

- **Search Records**: Search by ticker or project name from Sheet 1
- **Add New Records**: Insert records at row 3 in both Sheet 1 and Sheet 2
- **Responsive UI**: Clean interface using TailwindCSS
- **Real-time Updates**: AJAX-based operations without page reload
- **Toast Notifications**: User-friendly success/error messages

## Setup Instructions

### 1. Google Sheets Configuration

Before using the application, ensure:

1. **Sheet Access**: Your Google account (in token.json) has edit access to both spreadsheets
2. **Sheet IDs**: Verify the following IDs in `api/add.js` and `api/search.js`:
   - Sheet 1: `1riG_XlCSB5gZlWzU2wc8zebBS5KEN37n7fc3m4q6_rc`
   - Sheet 2: `1SzTC61GLJgO3_RPRSn8AGYwUF6O4-4uGyvG4EerTztI`
3. **Worksheet Name**: The worksheet tab must be named exactly `Sheet1` (case-sensitive)
4. **Headers**: Row 1 should contain column headers (Ticker, Project Name, X Handle, etc.)

### 2. Running the Application

**On Replit:**
```bash
npm install
npm start
```
The app will be available on port 5000.

**On Vercel:**

See the complete deployment guide in [VERCEL_SECRETS_SETUP.md](./VERCEL_SECRETS_SETUP.md)

Quick deployment:
```bash
npm install -g vercel
vercel login
vercel --prod
```

**Important:** Set up environment variables in Vercel dashboard before deploying. See [VERCEL_SECRETS_SETUP.md](./VERCEL_SECRETS_SETUP.md) for details.

### 3. Troubleshooting

**"Unable to parse range" error:**
- Check that the worksheet tab is named `Sheet1` (not "sheet1" or other variations)
- Verify your token.json has valid credentials
- Ensure the Google account has access to both spreadsheets

**Authentication errors:**
- The access token may have expired. You may need to regenerate token.json
- Check that credentials.json contains valid OAuth credentials

## API Endpoints

### POST /api/add
Adds a new record to both sheets at row index 3.

**Request Body:**
```json
{
  "ticker": "AAPL",
  "projectName": "Apple Inc",
  "xHandle": "@apple",
  "twitterOutreach": "Yes",
  "lockStatus": "Unlocked",
  "contactPerson": "John Doe",
  "initialRecordingDate": "2025-11-09",
  "discussionDate": "2025-11-09"
}
```

### GET /api/search?query=...
Searches records from Sheet 1 by ticker or project name.

**Example:**
```
GET /api/search?query=apple
```

## Technical Details

- **Backend**: Node.js with Express
- **Google API**: googleapis library
- **Frontend**: Vanilla JavaScript with TailwindCSS
- **Deployment**: Configured for both Replit and Vercel

## File Structure

```
├── api/
│   ├── add.js       # Serverless function for adding records
│   └── search.js    # Serverless function for searching records
├── public/
│   ├── index.html   # Frontend UI
│   ├── style.css    # Custom styles
│   └── app.js       # Client-side JavaScript
├── server.js        # Express server (Replit)
├── credentials.json # Google OAuth credentials
├── token.json       # Google OAuth token
├── vercel.json      # Vercel deployment config
└── package.json     # Node.js dependencies
```

## Security Notes

- Never commit credentials.json or token.json to public repositories
- The current setup is for development/demo purposes
- For production, use environment variables for sensitive data
