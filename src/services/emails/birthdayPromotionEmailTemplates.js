/**
 * Birthday Promotion Email Templates
 * Three-stage email templates for birthday promotions
 */

const { SystemSettings } = require("../../models");

/**
 * Stage 1: Early Warning Email (7 days before)
 */
function getEarlyWarningEmail(customer) {
    const firstName = customer.customerName.split(' ')[0];
    
    return {
        subject: `${firstName}, Something Special is Coming! 🎉`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%); padding: 20px; }
                    .container { max-width: 650px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8); }
                    .header { background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); color: white; padding: 50px 30px; text-align: center; position: relative; overflow: hidden; }
                    .header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 255, 255, 0.03) 10px, rgba(255, 255, 255, 0.03) 20px); }
                    .content { background: white; padding: 40px 30px; }
                    .emoji { font-size: 80px; margin-bottom: 15px; position: relative; z-index: 1; animation: bounce 2s infinite; }
                    @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
                    .header h1 { position: relative; z-index: 1; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5); margin: 0; }
                    .highlight { color: #000; font-weight: bold; }
                    .footer { text-align: center; background: #f9f9f9; padding: 30px; color: #999; font-size: 13px; }
                    .countdown-box { background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%); color: white; padding: 35px 25px; border-radius: 20px; text-align: center; margin: 30px 0; box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4); border: 2px solid #333; }
                    .countdown-title { font-size: 18px; font-weight: 600; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.95; }
                    .countdown-timer { display: flex; justify-content: center; align-items: center; gap: 15px; margin: 20px 0; flex-wrap: wrap; }
                    .time-unit { background: rgba(255, 255, 255, 0.1); padding: 20px 15px; border-radius: 15px; min-width: 90px; backdrop-filter: blur(10px); box-shadow: 0 8px 20px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.2); }
                    .time-number { font-size: 48px; font-weight: bold; display: block; font-family: 'Courier New', monospace; line-height: 1; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
                    .time-label { font-size: 11px; opacity: 0.85; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px; display: block; }
                    .time-separator { font-size: 36px; font-weight: bold; opacity: 0.6; animation: blink 1s infinite; }
                    @keyframes blink { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.2; } }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="emoji">🎁</div>
                        <h1>Something Special is Coming!</h1>
                    </div>
                    <div class="content">
                        <p>Dear <strong>${customer.customerName}</strong>,</p>
                        <p>We have something <span class="highlight">extra special</span> planned for you!</p>
                        <p>Your birthday is coming up in just <strong>7 days</strong>, and we're preparing an exclusive surprise just for you. 🎂</p>
                        <p>Stay tuned for more details in the coming days!</p>
                        <p style="margin-top: 20px;">With love,<br><strong>Your Friends at ${customer.companyName || 'Our Store'}</strong></p>
                    </div>
                    <div class="footer">
                        <p>This is an automated birthday notification. We're excited to celebrate with you!</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };
}

/**
 * Stage 2: Reminder Email (3 days before)
 */
function getReminderEmail(customer) {
    const firstName = customer.customerName.split(' ')[0];
    
    return {
        subject: `${firstName}, Your Birthday Surprise is Almost Ready! 🎊`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%); padding: 20px; }
                    .container { max-width: 650px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8); }
                    .header { background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); color: white; padding: 50px 30px; text-align: center; position: relative; overflow: hidden; }
                    .header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 255, 255, 0.03) 10px, rgba(255, 255, 255, 0.03) 20px); }
                    .content { background: white; padding: 40px 30px; }
                    .emoji { font-size: 80px; margin-bottom: 15px; position: relative; z-index: 1; animation: bounce 2s infinite; }
                    @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
                    .header h1 { position: relative; z-index: 1; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5); margin: 0; }
                    .highlight { color: #000; font-weight: bold; }
                    .footer { text-align: center; background: #f9f9f9; padding: 30px; color: #999; font-size: 13px; }
                    .countdown-box { background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%); color: white; padding: 35px 25px; border-radius: 20px; text-align: center; margin: 30px 0; box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4); border: 2px solid #333; }
                    .countdown-title { font-size: 18px; font-weight: 600; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.95; }
                    .countdown-timer { display: flex; justify-content: center; align-items: center; gap: 15px; margin: 20px 0; flex-wrap: wrap; }
                    .time-unit { background: rgba(255, 255, 255, 0.1); padding: 20px 15px; border-radius: 15px; min-width: 90px; backdrop-filter: blur(10px); box-shadow: 0 8px 20px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.2); }
                    .time-number { font-size: 48px; font-weight: bold; display: block; font-family: 'Courier New', monospace; line-height: 1; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
                    .time-label { font-size: 11px; opacity: 0.85; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px; display: block; }
                    .time-separator { font-size: 36px; font-weight: bold; opacity: 0.6; animation: blink 1s infinite; }
                    @keyframes blink { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.2; } }
                </style>
                <script>
                    function startCountdown() {
                        const expireDate = new Date(new Date().getTime() + (48 * 60 * 60 * 1000));
                        function updateTimer() {
                            const now = new Date().getTime();
                            const distance = expireDate.getTime() - now;
                            if (distance < 0) {
                                document.getElementById('countdown').innerHTML = '<div style="font-size: 32px; padding: 30px;">⏰ EXPIRED</div>';
                                return;
                            }
                            const hours = Math.floor(distance / (1000 * 60 * 60));
                            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                            document.getElementById('countdown').innerHTML = '<div class="time-unit"><span class="time-number">' + String(hours).padStart(2, '0') + '</span><span class="time-label">Hours</span></div><span class="time-separator">:</span><div class="time-unit"><span class="time-number">' + String(minutes).padStart(2, '0') + '</span><span class="time-label">Minutes</span></div><span class="time-separator">:</span><div class="time-unit"><span class="time-number">' + String(seconds).padStart(2, '0') + '</span><span class="time-label">Seconds</span></div>';
                        }
                        updateTimer();
                        setInterval(updateTimer, 1000);
                    }
                    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', startCountdown); } else { startCountdown(); }
                </script>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="emoji">🎉</div>
                        <h1>Your Special Day is Almost Here!</h1>
                    </div>
                    <div class="content">
                        <p>Dear <strong>${customer.customerName}</strong>,</p>
                        <p style="margin-bottom: 10px;">Only <strong>3 days</strong> until your birthday! 🎂</p>
                        <p>We're putting the <span class="highlight">finishing touches</span> on your exclusive birthday gift! 🎁</p>
                        <p>On your special day, you'll receive an <strong>exclusive promotion code</strong> with amazing benefits just for you.</p>
                        <p>Get ready to celebrate! 🎊</p>
                        <p style="margin-top: 20px;">Best wishes,<br><strong>Your Friends at ${customer.companyName || 'Our Store'}</strong></p>
                    </div>
                    <div class="footer">
                        <p>Mark your calendar! Your surprise arrives on your birthday.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };
}

/**
 * Stage 3: Birthday Email with Promotion Code (on birthday)
 */
function getBirthdayEmail(customer, promotion) {
    const firstName = customer.customerName.split(' ')[0];
    const endDate = new Date(promotion.endDate).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    return {
        subject: `🎂 Happy Birthday ${firstName}! Here's Your Exclusive Gift!`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%); padding: 20px; }
                    .container { max-width: 650px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8); }
                    .header { 
                        background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); 
                        color: white; 
                        padding: 50px 30px; 
                        text-align: center;
                        position: relative;
                        overflow: hidden;
                    }
                    .header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 255, 255, 0.03) 10px, rgba(255, 255, 255, 0.03) 20px); }
                    .content { background: white; padding: 40px 30px; }
                    .emoji { font-size: 80px; margin-bottom: 15px; animation: bounce 2s infinite; position: relative; z-index: 1; }
                    @keyframes bounce {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-20px); }
                    }
                    .header h1 { position: relative; z-index: 1; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5); margin: 0; }
                    .header p { position: relative; z-index: 1; }
                    .coupon-box { 
                        background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);
                        border: 3px solid #333;
                        padding: 35px; 
                        border-radius: 15px; 
                        text-align: center; 
                        margin: 30px 0;
                        box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
                    }
                    .coupon-code { 
                        font-size: 36px; 
                        color: white; 
                        font-weight: bold; 
                        letter-spacing: 4px; 
                        margin: 20px 0; 
                        font-family: 'Courier New', monospace;
                        background: rgba(255,255,255,0.1);
                        padding: 20px;
                        border-radius: 10px;
                        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                        border: 2px solid rgba(255,255,255,0.2);
                    }
                    .discount-badge { 
                        background: linear-gradient(135deg, #000 0%, #333 100%); 
                        color: white; 
                        padding: 15px 35px; 
                        border-radius: 50px; 
                        display: inline-block; 
                        font-size: 26px; 
                        font-weight: bold; 
                        margin: 15px 0;
                        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
                        border: 2px solid rgba(255,255,255,0.3);
                    }
                    .details { background: #f5f5f5; padding: 25px; border-radius: 15px; margin: 25px 0; border-left: 4px solid #000; }
                    .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e0e0e0; }
                    .detail-row:last-child { border-bottom: none; }
                    .detail-label { color: #666; font-size: 14px; }
                    .detail-value { font-weight: bold; color: #000; font-size: 15px; }
                    .highlight { color: #000; font-weight: bold; }
                    .footer { text-align: center; background: #f9f9f9; padding: 30px; color: #999; font-size: 13px; }
                    
                    .countdown-box { 
                        background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%); 
                        color: white; 
                        padding: 35px 25px; 
                        border-radius: 20px; 
                        text-align: center; 
                        margin: 30px 0;
                        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
                        border: 2px solid #333;
                    }
                    .countdown-title { 
                        font-size: 18px; 
                        font-weight: 600; 
                        margin-bottom: 25px; 
                        text-transform: uppercase; 
                        letter-spacing: 2px;
                        opacity: 0.95;
                    }
                    .countdown-timer {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        gap: 15px;
                        margin: 20px auto;
                        flex-wrap: wrap;
                        width: fit-content;
                    }

                    .time-unit { 
                        background: rgba(255, 255, 255, 0.15); 
                        padding: 20px 15px; 
                        border-radius: 15px; 
                        min-width: 90px;
                        backdrop-filter: blur(10px);
                        box-shadow: 0 8px 20px rgba(0,0,0,0.1);
                    }
                    .time-number { 
                        font-size: 48px; 
                        font-weight: bold; 
                        display: block; 
                        font-family: 'Courier New', monospace;
                        line-height: 1;
                        text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
                    }
                    .time-label { 
                        font-size: 11px; 
                        opacity: 0.85; 
                        text-transform: uppercase; 
                        letter-spacing: 1px;
                        margin-top: 8px;
                        display: block;
                    }
                    .time-separator {
                        font-size: 36px;
                        font-weight: bold;
                        opacity: 0.6;
                        animation: blink 1s infinite;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                
                        height: 100%;
                        line-height: 1;
                    }

                    @keyframes blink {
                        0%, 100% { opacity: 0.6; }
                        50% { opacity: 0.2; }
                    }
                    .countdown-label { 
                        font-size: 14px; 
                        opacity: 0.9; 
                        margin-top: 20px;
                        font-weight: 500;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="emoji">🎂🎉🎁</div>
                        <h1>Happy Birthday ${firstName}!</h1>
                        <p style="font-size: 18px; margin: 0;">Wishing you a wonderful day filled with joy!</p>
                    </div>
                    <div class="content">
                        <p>Dear <strong>${customer.customerName}</strong>,</p>
                        
                        <p>🎊 It's your special day, and we have something <span class="highlight">exclusively for you</span>! 🎊</p>
                        
                        <div class="coupon-box">
                            <p style="margin: 0 0 10px 0; color: rgba(255,255,255,0.9); font-size: 14px;">YOUR EXCLUSIVE BIRTHDAY CODE</p>
                            <div class="coupon-code">${promotion.couponCode}</div>
                            ${promotion.discountPercentage ? `
                                <div class="discount-badge">
                                    ${promotion.discountPercentage}% OFF
                                </div>
                            ` : ''}
                            ${promotion.discountValue ? `
                                <div class="discount-badge">
                                    $${promotion.discountValue} OFF
                                </div>
                            ` : ''}
                            <p style="margin: 15px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Present this code at checkout</p>
                        </div>
                        
                        ${promotion.expireDate ? `
                            <div class="countdown-box">
                                <div class="countdown-title">⏰ OFFER EXPIRES IN</div>
                                <div class="countdown-timer" id="countdown">
                                    <div class="time-unit">
                                        <span class="time-number">48</span>
                                        <span class="time-label">Hours</span>
                                    </div>
                                    <span class="time-separator">:</span>
                                    <div class="time-unit">
                                        <span class="time-number">00</span>
                                        <span class="time-label">Minutes</span>
                                    </div>
                                    <span class="time-separator">:</span>
                                    <div class="time-unit">
                                        <span class="time-number">00</span>
                                        <span class="time-label">Seconds</span>
                                    </div>
                                </div>
                                <p class="countdown-label">⏳ Expires: ${new Date(promotion.expireDate).toLocaleString('en-US', { 
                                    weekday: 'short', 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric', 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                })}</p>
                            </div>
                        ` : ''}
                       
                        
                        ${promotion.description ? `
                            <p><strong>Description:</strong><br>${promotion.description}</p>
                        ` : ''}
                        
                        <p>Thank you for being a valued customer. We hope your birthday is as special as you are!</p>
                        
                        <p style="margin-top: 20px;">With warmest wishes,<br><strong>Your Friends at ${customer.companyName || 'Our Store'}</strong></p>
                    </div>
                    <div class="footer">
                        <p>This is a one-time birthday promotion. ${promotion.expireDate ? `Code expires in 48 hours (${new Date(promotion.expireDate).toLocaleString()})` : `Code expires on ${endDate}`}.</p>
                        <p>Questions? Contact us at support@yourstore.com</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };
}

module.exports = {
    getEarlyWarningEmail,
    getReminderEmail,
    getBirthdayEmail
};
