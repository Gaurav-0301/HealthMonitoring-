# CircleBack - Elder Health Monitoring

app for tracking elderly ppl health using fitness bands they already have (noise, boat, mi band etc) and alerting family + volunteers if somthing goes wrong

## stack
mern - mongodb express react node

## features
- connects to google fit / apple health so works with any band
- detects if heart rate is weird or person not moving
- calls elder first then family then volunteer then emergency
- medical history upload
- subscription plans

still building this, more updates soon

## how to run

backend:
```
cd backend
npm install
cp .env.example .env
# fill in your mongo uri n twilio keys in .env
npm run dev
```

frontend:
```
cd frontend
npm install
npm start
```

## todo
- [ ] finish google fit api response parsing (its messy)
- [ ] add twilio voice call integration for step 1 of escalation
- [ ] apple health integration for ios users
- [ ] volunteer app screens
- [ ] payment integration (razorpay probably)
- [ ] medical history checklist ui
- [ ] admin panel for verifying volunteers

---

## 🚀 Deployment Guide

### 1. Backend Deployment (Render)
1. Push repository to GitHub.
2. Log into [Render Dashboard](https://dashboard.render.com/) and click **New + -> Blueprint** (or **Web Service**).
3. Connect your repository. Render will automatically detect `render.yaml`.
4. Configure Environment Variables in Render:
   - `MONGODB_URI`: Your MongoDB Atlas URI.
   - `JWT_SECRET`: Random secret key.
   - `FRONTEND_URL`: Your Vercel frontend URL (e.g. `https://healthmonitoring.vercel.app`).
   - `DISEASE_PREDICTOR_API_KEY`: *(Optional)* API key for external disease predictor.
5. Deploy Web Service. Your backend API will be live at `https://<your-render-service>.onrender.com/api`.

### 2. Frontend Deployment (Vercel)
1. Log into [Vercel Dashboard](https://vercel.com/) and click **Add New -> Project**.
2. Import the GitHub repository.
3. Set **Root Directory** to `frontend`.
4. Add Environment Variable:
   - `REACT_APP_API_URL` = `https://<your-render-service>.onrender.com/api`
5. Click **Deploy**. Vercel will build and serve your SPA with routing pre-configured via `frontend/vercel.json`.

