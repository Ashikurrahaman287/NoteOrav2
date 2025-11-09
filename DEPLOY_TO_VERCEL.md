# Deploy Noteora Sheet Portal to Vercel

This guide will help you deploy the Noteora Sheet Portal to Vercel for production use.

## Prerequisites

1. A [Vercel account](https://vercel.com/signup) (free tier works)
2. [Vercel CLI](https://vercel.com/cli) installed globally: `npm install -g vercel`
3. Your Google Sheets credentials (credentials.json and token.json)

## Deployment Steps

### Step 1: Prepare Your Project

Make sure you have the following files in your project root:
- `credentials.json` - Your Google OAuth credentials
- `token.json` - Your Google OAuth token
- `vercel.json` - Vercel configuration (already included)
- All API and public files

### Step 2: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 3: Login to Vercel

```bash
vercel login
```

Follow the prompts to authenticate with your Vercel account.

### Step 4: Deploy to Vercel

For the first deployment:

```bash
vercel
```

This will:
1. Ask you to set up the project
2. Link it to your Vercel account
3. Deploy the application

For production deployment:

```bash
vercel --prod
```

### Step 5: Environment Variables (Optional but Recommended)

For better security in production, you can set up environment variables instead of committing credential files:

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add the following:
   - `GOOGLE_CREDENTIALS` - Copy the contents of credentials.json
   - `GOOGLE_TOKEN` - Copy the contents of token.json

Then update your code to read from environment variables:

```javascript
// In utils/sheets-helper.js
const credentials = process.env.GOOGLE_CREDENTIALS 
  ? JSON.parse(process.env.GOOGLE_CREDENTIALS)
  : JSON.parse(fs.readFileSync('credentials.json', 'utf8'));

const token = process.env.GOOGLE_TOKEN
  ? JSON.parse(process.env.GOOGLE_TOKEN)
  : JSON.parse(fs.readFileSync('token.json', 'utf8'));
```

### Step 6: Access Your Deployed Application

After deployment, Vercel will provide you with a URL like:
```
https://your-project-name.vercel.app
```

You can also set up a custom domain in the Vercel dashboard.

## Troubleshooting

### Issue: "Unable to parse range" error

**Solution:** Verify that:
- Your Google account has access to both spreadsheets
- The spreadsheet IDs in the code are correct
- Your token.json hasn't expired

### Issue: API routes not working

**Solution:** Make sure:
- All API files are in the `/api` folder
- They export a default handler function
- The vercel.json routes are configured correctly

### Issue: Static files not loading

**Solution:** Ensure:
- All static files are in the `/public` folder
- The vercel.json has the correct static build configuration

## Updating Your Deployment

To update your deployed application:

```bash
vercel --prod
```

This will create a new deployment and automatically promote it to production.

## Production Considerations

### TailwindCSS CDN
The current implementation uses the TailwindCSS CDN for simplicity. For production, consider:

**Option 1: Keep CDN (Simplest)**
- Works fine for most use cases
- No build step required
- Slight performance impact

**Option 2: Install TailwindCSS (Recommended for high-traffic sites)**
```bash
npm install -D tailwindcss
npx tailwindcss init
```

Then update your build process and remove the CDN link from index.html.

## Monitoring

You can monitor your application's performance and logs in the Vercel dashboard:
1. Go to your project
2. Click on "Deployments" to see all versions
3. Click on "Logs" to see real-time logs
4. Click on "Analytics" to see usage statistics

## Cost

The Vercel Hobby (free) plan includes:
- Unlimited deployments
- 100 GB bandwidth per month
- Serverless function execution
- Custom domains

This should be sufficient for most use cases. Check [Vercel pricing](https://vercel.com/pricing) for more details.

## Support

For issues with:
- Vercel deployment: Check [Vercel documentation](https://vercel.com/docs)
- Google Sheets API: Check the README.md troubleshooting section
