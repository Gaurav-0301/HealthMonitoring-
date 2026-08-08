const twilio = require('twilio');

const normalizePhone = (phone) => {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[\s\-\(\)]/g, '');
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return '+91' + cleaned;
  }
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    return '+' + cleaned;
  }
  if (!cleaned.startsWith('+')) {
    return '+' + cleaned;
  }
  return cleaned;
};

const getTwilioClient = () => {
  const sid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const token = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  if (sid && token && sid !== 'mock_twilio_account_sid' && sid.startsWith('AC')) {
    try {
      return twilio(sid, token);
    } catch (err) {
      console.warn('[NotificationService] Twilio client init error:', err.message);
    }
  }
  return null;
};

const getFromPhone = () => {
  const num = (process.env.TWILIO_PHONE_NUMBER || '+15203144742').trim();
  return normalizePhone(num);
};

// Send SMS
const sendSMS = async (toPhone, messageBody) => {
  const formattedTo = normalizePhone(toPhone);
  const fromPhone = getFromPhone();
  const twilioClient = getTwilioClient();

  console.log(`[SMS OUTBOUND] From: ${fromPhone} | To: ${formattedTo} | Message: ${messageBody}`);
  if (twilioClient) {
    try {
      const result = await twilioClient.messages.create({
        body: messageBody,
        from: fromPhone,
        to: formattedTo
      });
      console.log(`[SMS SUCCESS 🔥] Sent to ${formattedTo}! Twilio Message SID: ${result.sid}`);
      return { success: true, sid: result.sid };
    } catch (error) {
      console.error(`[SMS ERROR ❌] Failed sending to ${formattedTo}:`, error.message, error.code ? `(Code: ${error.code})` : '');
      return { success: false, error: error.message, simulated: true };
    }
  }
  return { success: true, simulated: true, note: 'Twilio running in mock simulation mode' };
};

// Make IVR Voice Call
const makeIVRCall = async (toPhone, ivrMessage) => {
  const formattedTo = normalizePhone(toPhone);
  const fromPhone = getFromPhone();
  const twilioClient = getTwilioClient();

  console.log(`[VOICE IVR CALL OUTBOUND] From: ${fromPhone} | Calling: ${formattedTo} | Script: "${ivrMessage}"`);
  if (twilioClient) {
    try {
      const call = await twilioClient.calls.create({
        twiml: `<Response><Say voice="alice">${ivrMessage}</Say><Gather numDigits="1" timeout="10"><Say>Press 1 if you are okay, or press 2 if you need help.</Say></Gather></Response>`,
        to: formattedTo,
        from: fromPhone
      });
      console.log(`[VOICE IVR SUCCESS 🔥] Calling ${formattedTo}! Twilio Call SID: ${call.sid}`);
      return { success: true, sid: call.sid };
    } catch (error) {
      console.error(`[VOICE IVR ERROR ❌] Failed calling ${formattedTo}:`, error.message, error.code ? `(Code: ${error.code})` : '');
      return { success: false, error: error.message, simulated: true };
    }
  }
  return { success: true, simulated: true, note: 'Twilio Voice running in mock simulation mode' };
};

// Send Push Notification (Firebase Cloud Messaging)
const sendPushNotification = async (deviceToken, title, body, dataPayload = {}) => {
  console.log(`[PUSH NOTIFICATION OUTBOUND] Title: ${title} | Body: ${body} | Payload:`, dataPayload);
  return { success: true, simulated: true, note: 'Firebase FCM running in mock simulation mode' };
};

module.exports = {
  sendSMS,
  makeIVRCall,
  sendPushNotification
};
