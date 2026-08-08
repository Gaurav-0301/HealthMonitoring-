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

## 🚀 Active Deployed Links & Integration Guide

* **Backend Live API**: `https://healthmonitoring-3cs6.onrender.com/api`
* **Frontend Live Application**: `https://health-monitoring-git-main-gaurav-0301s-projects.vercel.app`

---

### 1. Backend Environment Setup (Render Dashboard)
Configure the following in your [Render Service Environment Settings](https://dashboard.render.com/):
- `FRONTEND_URL` = `https://health-monitoring-git-main-gaurav-0301s-projects.vercel.app`
- `MONGODB_URI` = `mongodb+srv://<username>:<password>@cluster.mongodb.net/healthmonitoring?retryWrites=true&w=majority`
- `JWT_SECRET` = `circleback_super_secret_jwt_key_2026`

### 2. Frontend Environment Setup (Vercel Dashboard)
Configure the following in your [Vercel Project Environment Settings](https://vercel.com/):
- `REACT_APP_API_URL` = `https://healthmonitoring-3cs6.onrender.com/api`
- `DISABLE_ESLINT_PLUGIN` = `true`

