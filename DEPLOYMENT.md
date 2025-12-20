# Backend Vercel Deployment Guide

## ⚠️ Important Notes for Serverless Deployment

Vercel uses **serverless functions**, which means:

- ✅ Your Express API will work
- ⚠️ **Cron jobs won't work** (use Vercel Cron or external service)
- ⚠️ Long-running processes are limited (10s for Hobby, 60s for Pro)
- ✅ MongoDB connections are supported but need connection pooling

## Prerequisites

- Vercel account
- MongoDB Atlas database (or any cloud MongoDB)
- GitHub repository
- All environment variables ready

## Deployment Steps

### 1. Prepare Environment Variables

You'll need to set these in Vercel dashboard:

| Variable                  | Example                                          | Description                           |
| ------------------------- | ------------------------------------------------ | ------------------------------------- |
| `MONGO_URI`               | `mongodb+srv://user:pass@cluster.mongodb.net/db` | MongoDB connection string             |
| `JWT_SECRET`              | `your-super-secret-jwt-key-min-32-chars`         | JWT signing secret                    |
| `JWT_EXPIRE`              | `7d`                                             | JWT expiration time                   |
| `TELEGRAM_BOT_TOKEN`      | `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`          | Optional: Telegram bot token          |
| `TELEGRAM_ADMIN_CHAT_IDS` | `123456789,987654321`                            | Optional: Telegram chat IDs           |
| `CLIENT_URL`              | `https://your-app.vercel.app`                    | Your frontend URL                     |
| `NODE_ENV`                | `production`                                     | Environment mode                      |
| `PORT`                    | `4000`                                           | Not needed for Vercel (auto-assigned) |

### 2. Deploy Using Vercel Dashboard (Recommended)

1. **Push to GitHub**

   ```bash
   cd server
   git add .
   git commit -m "Add Vercel deployment config"
   git push origin main
   ```

2. **Import to Vercel**

   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Set **Root Directory** to `server`
   - Framework Preset: **Other**

3. **Configure Environment Variables**

   - In project settings, go to "Environment Variables"
   - Add all variables from the table above
   - Make sure to select "Production" environment

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Your API will be at `https://your-backend.vercel.app`

### 3. Deploy Using Vercel CLI

```bash
cd server

# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to production
vercel --prod

# You'll be prompted to set environment variables
# Or add them via the dashboard after deployment
```

### 4. Update Frontend Environment

After backend deployment, update your frontend's environment variable:

**In `client/.env.production`:**

```env
VITE_API_URL=https://your-backend.vercel.app/api
```

Or set in Vercel dashboard for the frontend project.

### 5. Test the Deployment

```bash
# Test health endpoint
curl https://your-backend.vercel.app/api/health

# Expected response:
# {"success":true,"message":"mSana Backend API is running","timestamp":"...","dbConnected":true}
```

## Handling Cron Jobs on Vercel

Your app uses cron jobs for stock monitoring. On Vercel, you have 2 options:

### Option 1: Vercel Cron (Recommended)

Create `vercel.json` with cron configuration:

```json
{
  "crons": [
    {
      "path": "/api/cron/stock-check",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

Then create a cron endpoint:

```javascript
// routes/cron.js
export const stockCheckCron = async (req, res) => {
  // Verify request is from Vercel Cron
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Run stock check logic
  await checkLowStock();
  res.json({ success: true });
};
```

### Option 2: External Cron Service

Use services like:

- **Cron-job.org** (free)
- **EasyCron** (free tier available)
- **GitHub Actions** (free for public repos)

Set them to call your endpoint every 30 minutes:

```
GET https://your-backend.vercel.app/api/cron/stock-check
```

## MongoDB Connection Optimization

For serverless, optimize MongoDB connections:

```javascript
// config/db.js
let cachedDb = null;

const connectDB = async () => {
  if (cachedDb) {
    return cachedDb;
  }

  const conn = await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  cachedDb = conn;
  return conn;
};
```

## Performance Considerations

| Plan             | Max Duration | Memory  | Bandwidth    |
| ---------------- | ------------ | ------- | ------------ |
| **Hobby (Free)** | 10 seconds   | 1024 MB | 100 GB/month |
| **Pro**          | 60 seconds   | 3008 MB | 1 TB/month   |

Most billing API operations should complete within 10 seconds.

## Troubleshooting

### Issue: MongoDB connection timeout

**Solution:**

- Check MongoDB Atlas allows connections from anywhere (0.0.0.0/0)
- Increase `serverSelectionTimeoutMS` in connection options
- Ensure MongoDB URI is correct in environment variables

### Issue: CORS errors

**Solution:**
Update `server.js` CORS configuration:

```javascript
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://your-frontend.vercel.app",
      process.env.CLIENT_URL,
    ].filter(Boolean),
    credentials: true,
  })
);
```

### Issue: Environment variables not found

**Solution:**

- Verify variables are set in Vercel dashboard
- Redeploy after adding variables
- Check variable names match exactly (case-sensitive)

### Issue: Function timeout

**Solution:**

- Optimize database queries
- Add indexes to MongoDB collections
- Upgrade to Pro plan if needed
- Consider splitting long operations

### Issue: Cron jobs not working

**Solution:**

- Remember: Built-in cron jobs don't work in serverless
- Use Vercel Cron (Pro plan) or external cron service
- See "Handling Cron Jobs" section above

## File Structure

```
server/
├── vercel.json           # Vercel configuration
├── .vercelignore         # Files to exclude
├── server.js             # Main entry point
├── config/
├── controllers/
├── models/
├── routes/
└── middleware/
```

## Environment Variables Checklist

Before deploying, ensure you have:

- [ ] `MONGO_URI` (required)
- [ ] `JWT_SECRET` (required)
- [ ] `CLIENT_URL` (required)
- [ ] `JWT_EXPIRE` (optional, defaults to 7d)
- [ ] `TELEGRAM_BOT_TOKEN` (optional)
- [ ] `TELEGRAM_ADMIN_CHAT_IDS` (optional)

## Monitoring & Logs

- **View Logs:** Vercel Dashboard → Your Project → Deployments → Click deployment
- **Real-time Logs:** Available during and after deployment
- **Error Tracking:** Consider integrating Sentry

## Deployment Checklist

- [ ] Push code to GitHub
- [ ] Create Vercel project
- [ ] Set root directory to `server`
- [ ] Add all environment variables
- [ ] Deploy
- [ ] Test API health endpoint
- [ ] Update frontend with backend URL
- [ ] Test login and key features
- [ ] Set up cron alternative (if needed)
- [ ] Configure custom domain (optional)

## Post-Deployment

1. **Test all endpoints:**

   ```bash
   # Test health
   curl https://your-backend.vercel.app/api/health

   # Test login
   curl -X POST https://your-backend.vercel.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@msana.com","password":"admin123"}'
   ```

2. **Update frontend deployment:**

   - Redeploy frontend with updated `VITE_API_URL`

3. **Monitor first 24 hours:**
   - Check logs for errors
   - Monitor function execution times
   - Track database connection issues

## Alternative: Railway or Render (Better for This App)

If you encounter limitations with Vercel's serverless functions (especially cron jobs), consider:

- **Railway.app** - Better for long-running Node.js apps, built-in cron support
- **Render.com** - Free tier, traditional server deployment, easier for Express apps

## Support

- [Vercel Node.js Docs](https://vercel.com/docs/runtimes#official-runtimes/node-js)
- [Vercel Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
