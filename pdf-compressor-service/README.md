# Ghostscript PDF Compressor Microservice

A dedicated Node.js + Ghostscript microservice designed to downsample and compress heavy PDF textbooks for in-app reading.

## Features
- **Ghostscript Integration**: Downsamples embedded high-res images to screen/ebook resolution.
- **Verification Engine**: Verifies that page counts match 100% before and after compression to prevent silent file truncation or corruption.
- **Multi-Pass Compression**: Runs standard `/screen` pass and falls back to aggressive `/ebook` pass if necessary.
- **Response Headers**: Returns custom headers (`x-original-size`, `x-compressed-size`, `x-original-pages`, `x-compressed-pages`).

---

## Deploying to Render (Recommended)

Render is the recommended host. The free tier works for testing; the $7/month "Starter" plan is recommended for production to avoid cold-start delays on large uploads.

### Step 1 — Push to GitHub

This `pdf-compressor-service/` folder needs to be in a GitHub repository. You can:
- Push the entire `study-buddy` repo, OR
- Create a separate dedicated repository for just this service folder.

### Step 2 — Create the Render Web Service

1. Go to [https://dashboard.render.com](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `pdf-compressor-service`
   - **Region**: Choose nearest to your users
   - **Branch**: `main`
   - **Root Directory**: `pdf-compressor-service` (if the entire study-buddy repo was pushed)
   - **Runtime**: **Docker**
   - **Instance Type**: `Free` (testing) or `Starter` (production)
5. Click **"Create Web Service"**

Render will automatically detect the `Dockerfile`, build the Alpine Linux container with Ghostscript pre-installed, and deploy it.

### Step 3 — Note the Render Service URL

After deployment completes, Render gives you a URL like:
```
https://pdf-compressor-service.onrender.com
```

### Step 4 — Set VITE_COMPRESSOR_URL in your StudyBuddy project

In `c:/Users/Wizzy 1K/Desktop/study-buddy/.env`:
```env
VITE_COMPRESSOR_URL=https://pdf-compressor-service.onrender.com
```

Then restart the dev server:
```bash
npm run dev
```

---

## Running Locally (for development)

Requires Ghostscript installed on your local machine:
- **Windows**: Download from [https://www.ghostscript.com/download/gsdnld.html](https://www.ghostscript.com/download/gsdnld.html) and add to PATH
- **macOS**: `brew install ghostscript`
- **Ubuntu/Debian**: `sudo apt-get install ghostscript`

Then:
```bash
cd pdf-compressor-service
npm install
npm start
```

Set in `.env`:
```env
VITE_COMPRESSOR_URL=http://localhost:3001
```

---

## Health Check

Once deployed, verify the service is running:
```
GET https://your-service.onrender.com/health
```
Expected response:
```json
{ "status": "ok", "service": "Ghostscript PDF Compressor" }
```
