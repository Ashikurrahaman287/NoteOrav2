# Noteora Sheet Portal

## Overview
A complete Node.js web application that connects to Google Sheets for searching and adding records. Built with Express.js backend and a clean TailwindCSS frontend.

## Recent Changes (December 2, 2025)
- **Fixed authentication for deployment** - Updated sheets-helper.js to support environment variables for Google API authentication (service account or OAuth2 credentials)
- **Added Inactive Projects Check feature** - New 14/28/50/70/100 Days buttons to find projects without follow-up contact
- **Smart exclusion logic** - Automatically excludes projects marked as "In discussion + X Month Extension" from inactive checks
- **Color-coded results** - Inactive projects are highlighted based on severity (yellow 50+, orange 70+, red 100+ days)
- **New API endpoint** - Added /api/inactive endpoint for filtering inactive projects

### Previous Changes (November 9, 2025)
- Initial project setup from GitHub import
- Created complete Node.js application with Express server
- Implemented Google Sheets API integration using googleapis
- Built frontend UI with search and add record functionality
- Configured for both Replit and Vercel deployment
- **Added Twitter Handle search** - Search now works with Ticker, Project Name, or Twitter Handle
- **Added conditional link field** - When "Link" is selected in Twitter Outreach, a URL input field appears
- **Vercel production ready** - Created deployment guide and configuration files for seamless Vercel deployment
- Fixed auto-detection of worksheet names to work with any sheet tab name

## Project Architecture

### Backend (Node.js + Express)
- **server.js**: Main Express server running on port 5000
- **api/add.js**: Handles adding new records to both Sheet 1 and Sheet 2
- **api/search.js**: Searches records from Sheet 1 by ticker or project name

### Frontend
- **public/index.html**: Single-page UI with TailwindCSS
- **public/style.css**: Custom styling and animations
- **public/app.js**: Client-side JavaScript for form handling and API calls

### Configuration
- **credentials.json**: Google OAuth credentials
- **token.json**: Google OAuth token for API access
- **vercel.json**: Vercel deployment configuration
- **package.json**: Node.js dependencies and scripts

## Google Sheets Configuration
- Sheet 1 ID: `1riG_XlCSB5gZlWzU2wc8zebBS5KEN37n7fc3m4q6_rc`
- Sheet 2 ID: `1SzTC61GLJgO3_RPRSn8AGYwUF6O4-4uGyvG4EerTztI`
- Worksheet Name: `Sheet1`

## Features
1. **Search Records**: Search by ticker, project name, or Twitter handle from Sheet 1
2. **Add New Record**: Add records to both Sheet 1 and Sheet 2 at row index 3
3. **Conditional Link Input**: When selecting "Link" for Twitter Outreach, a URL input field appears automatically
4. **Auto-Detection**: Automatically detects worksheet names from your Google Sheets
5. **Responsive UI**: Works on mobile and desktop
6. **Real-time Updates**: No page reload required
7. **Form Validation**: Required fields validation with smart conditional logic
8. **Toast Notifications**: Success/error feedback
9. **Vercel Production Ready**: Complete deployment configuration and guide included

## Important Setup Notes

### Google Sheets Authentication
The application supports multiple authentication methods (in order of priority):

1. **Service Account (Recommended for Vercel)**: Set `GOOGLE_SERVICE_ACCOUNT_KEY` environment variable with the JSON contents of your service account key file
2. **OAuth2 Credentials**: Set all three: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REFRESH_TOKEN`
3. **Local Files (Development)**: Place `credentials.json` and `token.json` in the project root

### Google Sheets Access
For the application to work, ensure:
1. The service account or Google account has edit access to both spreadsheets
2. The worksheet tabs are named exactly "Sheet1" (case-sensitive)
3. Row 1 contains headers for the columns
4. If you see "Unable to parse range" errors, verify the worksheet name and access permissions

## API Endpoints
- `GET /api/search?query=...`: Search records
- `POST /api/add`: Add new record

## Running Locally
```bash
npm install
npm start
```

## Deployment
- Configured for Replit autoscale deployment
- Also Vercel-ready with vercel.json configuration

## Dependencies
- express: Web server framework
- googleapis: Google Sheets API client
- dotenv: Environment variables management
- cors: Cross-origin resource sharing
