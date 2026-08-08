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
