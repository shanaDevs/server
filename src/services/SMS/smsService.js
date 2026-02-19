// // src/services/SMS/smsService.js
// const twilio = require('twilio');
// require('dotenv').config();

// // Twilio client
// const client = twilio(
//   process.env.TWILIO_ACCOUNT_SID,
//   process.env.TWILIO_AUTH_TOKEN
// );

// // 🧪 TESTING MODE FLAG - Set to true to simulate SMS without sending
// const TESTING_MODE = true;

// // Load verified numbers from .env
// const VERIFIED_NUMBERS = process.env.VERIFIED_NUMBERS
//   ? process.env.VERIFIED_NUMBERS.split(',')
//   : [];

// class SmsService {
//   /**
//    * Send Birthday SMS to a verified recipient
//    * @param {string} phoneNumber - E.164 format phone number
//    */
//   static async sendBirthdaySms(phoneNumber) {
//     try {
//       const messageBody = `
// Happy Birthday! 🎉
// Use code BDAY20 for 20%
// off your next protein tub 💪
// `;

//       console.log(`📨 Preparing SMS for ${phoneNumber}`);
//       console.log(`📝 Message: ${messageBody.trim()}`);

//       // 🧪 TESTING MODE - Simulate without sending
//       if (TESTING_MODE) {
//         console.log('🧪 TESTING MODE: Simulating SMS send (not calling Twilio)');
//         console.log(`✅ Mock SMS sent to ${phoneNumber} - SID: SM_MOCK_${Date.now()}`);
//         return {
//           sid: `SM_MOCK_${Date.now()}`,
//           status: 'sent',
//           to: phoneNumber,
//           from: process.env.TWILIO_PHONE
//         };
//       }

//       // ⚠️ PRODUCTION MODE - Actual Twilio send
//       // Only send to verified numbers in trial accounts
//       if (VERIFIED_NUMBERS.length && !VERIFIED_NUMBERS.includes(phoneNumber)) {
//         console.log(`⚠️ Skipping unverified number: ${phoneNumber}`);
//         return null;
//       }

//       // Send SMS via Twilio
//       const message = await client.messages.create({
//         body: messageBody,
//         from: process.env.TWILIO_PHONE,
//         to: phoneNumber
//       });

//       console.log(`✅ SMS sent to ${phoneNumber} - SID: ${message.sid}`);
//       return message;
//     } catch (err) {
//       console.error(`❌ SMS failed for ${phoneNumber}: ${err.message}`);
//       throw err;
//     }
//   }
// }

// module.exports = SmsService;
