# Scrappy — Cloud Deployment Guide

This guide provides three zero-friction paths to deploy **Scrappy** to production cloud hosting.

---

## 🚀 Option 1: 1-Click Render.com Blueprint (Recommended)
This repository includes a [`render.yaml`](file:///e:/projects/scrappy/render.yaml) blueprint that automatically provisions the PostgreSQL database, FastAPI backend, and React frontend with proper environment variables.

### Steps:
1. Push your latest code to GitHub:
   ```bash
   git add .
   git commit -m "chore: add cloud deployment configurations"
   git push origin main
   ```
2. Log in to [Render.com](https://dashboard.render.com).
3. Click **New +** $\rightarrow$ **Blueprint**.
4. Connect your GitHub repository: `Harshsadgir2007/scrappy`.
5. Render will automatically detect [`render.yaml`](file:///e:/projects/scrappy/render.yaml) and deploy:
   * **`scrappy-db`**: Free Managed PostgreSQL database
   * **`scrappy-api`**: FastAPI Web Service with uvicorn
   * **`scrappy-web`**: React Static Site with SPA routing and automatic `VITE_API_URL` linkage.
6. Click **Apply**. Within ~3 minutes, your live production URLs will be active!

---

## ⚡ Option 2: Split Cloud (Vercel Frontend + Render Backend)
Best for maximum global frontend speed and free-tier performance.

### Step 1: Deploy Backend on Render
1. In [Render Dashboard](https://dashboard.render.com), click **New +** $\rightarrow$ **Web Service**.
2. Connect `Harshsadgir2007/scrappy`.
3. Configure settings:
   * **Root Directory**: `backend`
   * **Runtime**: `Python 3`
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add Environment Variables:
   * `ENCRYPTION_KEY`: `6kfjYKM-PWu6aYvF_T6ijEdKUphdcLxIrSHe6ZN3Cnw=`
   * `JWT_SECRET_KEY`: `(click generate)`
5. Click **Deploy Web Service**. Copy the assigned URL (e.g., `https://scrappy-api.onrender.com`).

### Step 2: Deploy Frontend on Vercel
1. Log in to [Vercel.com](https://vercel.com) $\rightarrow$ **Add New Project**.
2. Import `Harshsadgir2007/scrappy`.
3. Configure settings:
   * **Framework Preset**: `Vite`
   * **Root Directory**: `frontend`
4. Add Environment Variable:
   * **Key**: `VITE_API_URL`
   * **Value**: `https://scrappy-api.onrender.com` *(your backend URL from Step 1)*
5. Click **Deploy**. Vercel will build and assign an instant production URL (e.g. `https://scrappy.vercel.app`).

---

## 🐳 Option 3: Full-Stack Docker Deployment
You can deploy to any Linux VPS (AWS EC2, DigitalOcean, Hetzner, GCP Compute Engine) in a single command.

```bash
# Clone the repository on your server
git clone https://github.com/Harshsadgir2007/scrappy.git
cd scrappy

# Start PostgreSQL, FastAPI backend, and Nginx React frontend
docker compose up -d --build
```

Services exposed:
* **Frontend**: `http://<your-server-ip>:80`
* **Backend API Docs**: `http://<your-server-ip>:8000/docs`
* **PostgreSQL**: `localhost:5432`

---

## 🔑 Production Verification
Once deployed, verify the cloud endpoints:
1. **Health Check**: `GET https://<backend-url>/` $\rightarrow$ `{"status":"ok"}`
2. **Swagger Docs**: `https://<backend-url>/docs`
3. **Demo Accounts**:
   * `seller@greensteel.com` / `seller123` (Pune Steel)
   * `buyer@ecobuild.com` / `buyer123` (Ahmedabad Construction)
   * `ops@textech.com` / `textech123` (Surat Textile)
   * `admin@scrappy.com` / `admin123` (Super Admin)
