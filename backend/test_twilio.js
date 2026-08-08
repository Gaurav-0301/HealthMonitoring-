require('dotenv').config();
const { sendSMS, makeIVRCall } = require('./services/notification');

async function runTests() {
  console.log("Testing Twilio SMS...");
  // Use a dummy number or ask user for their number?
  // Let's use a dummy number for now just to see if the Twilio client authenticates or fails.
  const testPhone = '+15005550006'; // Twilio magic number for valid testing or just any number.
  // Actually, wait, if this is a real account, sending to an unverified number might fail if it's a trial account.
  // The user probably wants it to work. I will just test with the env var if possible.

  try {
    const smsResult = await sendSMS('+918999988888', 'Test message from HealthMonitoring system');
    console.log("SMS Result:", smsResult);
    
    console.log("Testing Twilio Call...");
    const callResult = await makeIVRCall('+918999988888', 'This is a test call from the Health Monitoring System.');
    console.log("Call Result:", callResult);
  } catch(e) {
    console.error("Test failed:", e);
  }
}

runTests();
