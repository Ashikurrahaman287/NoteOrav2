
# Vercel Deployment with Secrets

This guide shows you how to deploy to Vercel using environment variables instead of committing credential files.

## Step 1: Prepare Your Credentials

You need to set up **one** of these authentication methods:

### Option A: Service Account (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select your project
3. Enable Google Sheets API
4. Create a Service Account
5. Download the JSON key file
6. Share your Google Sheets with the service account email

### Option B: OAuth2 Credentials

1. Get your OAuth2 credentials from Google Cloud Console
2. Generate a refresh token using the OAuth playground

## Step 2: Set Environment Variables in Vercel

1. Go to your project on [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on **Settings** → **Environment Variables**
3. Add the following based on your auth method:

**For Service Account:**
- Variable name: `GOOGLE_SERVICE_ACCOUNT_KEY`
- Value: Paste the entire contents of your service account JSON file

**For OAuth2:**
- `GOOGLE_CLIENT_ID` - Your OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Your OAuth client secret
- `GOOGLE_REFRESH_TOKEN` - Your refresh token

**Access Code (Required):**
- `ACCESS_CODE` - Your secret access code for the app (e.g., "mySecretCode123")

## Step 3: Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

## Step 4: Verify Deployment

After deployment, visit your URL and test:
1. Enter your access code
2. Try searching for a record
3. Test the inactive projects CSV export buttons

## Troubleshooting

**Authentication Error:**
- Verify environment variables are set correctly
- Check that the service account has access to your sheets
- Ensure the JSON is properly formatted (no extra spaces)

**Access Code Issues:**
- Make sure `ACCESS_CODE` is set in Vercel environment variables
- It should match what you use to log in

## Local Development

For local development, create a `.env` file:

```
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
ACCESS_CODE=yourLocalAccessCode
```

Never commit this file to Git!
