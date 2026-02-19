// src/services/notifications/birthdayNotificationService.js
const notificationService = require('./notificationService');
const db = require('../../models');
const { Promotion } = db;

class BirthdayNotificationService {
    /**
     * Generate unique coupon code for birthday
     */
    generateCouponCode(customer, daysUntilBirthday) {
        const prefix = daysUntilBirthday === 0 ? 'BDAY20' : 'BDAY15';
        const customerId = customer.id.toString().padStart(4, '0');
        const timestamp = Date.now().toString().slice(-6); // 6 digits for more uniqueness
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${prefix}-${customerId}-${timestamp}${random}`;
    }

    /**
     * Create birthday promotion/coupon in database
     */
    async createBirthdayCoupon(customer, daysUntilBirthday, couponCode) {
        try {
            // Check if coupon already exists for this customer
            const existingCoupon = await Promotion.findOne({
                where: {
                    couponCode: couponCode
                }
            });

            if (existingCoupon) {
                console.log(`⚠️ Coupon ${couponCode} already exists, using it instead`);
                return existingCoupon;
            }

            const discountPercentage = daysUntilBirthday === 0 ? 20 : 15;
            const validDays = daysUntilBirthday === 0 ? 30 : 14; // Birthday month vs 2 weeks
            
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + validDays);

            const promotion = await Promotion.create({
                promotionType: 'BILL',
                title: `Birthday ${discountPercentage}% OFF - ${customer.customerName}`,
                description: `Special birthday discount for customer ${customer.customerName}`,
                discountPercentage: discountPercentage,
                couponCode: couponCode,
                startDate: startDate,
                endDate: endDate,
                isActive: true,
                minBillAmount: 0,
                maxDiscountAmount: daysUntilBirthday === 0 ? 5000 : 2000, // Higher limit on birthday
                usageLimit: 1,
                usageCount: 0,
                branchId: customer.branchId,
                createdBy: 1 // System generated
            });

            return promotion;
        } catch (error) {
            console.error('Error creating birthday coupon:', error);
            throw error;
        }
    }

    /**
     * Generate birthday notification content based on days until birthday
     */
    generateBirthdayContent(customer, daysUntilBirthday, couponCode) {
        const firstName = customer.customerName.split(' ')[0];
        const companyName = process.env.COMPANY_NAME || 'POS System';
        const companyEmail = process.env.COMPANY_EMAIL || 'support@possystem.com';
        const storeUrl = process.env.STORE_URL || 'http://localhost:3000';
        
        let emailSubject, emailBody, smsMessage, discountPercentage, validDays, headerColor, accentColor;
        
        if (daysUntilBirthday === 7) {
            // 7 days before
            discountPercentage = 15;
            validDays = 14;
            headerColor = '#4CAF50';
            accentColor = '#45a049';
            emailSubject = `${firstName}, Your Special Day is Coming! 🎂`;
            smsMessage = `Hi ${firstName}! Your birthday is in 7 days! 🎉 Get ${discountPercentage}% OFF with code ${couponCode}. Valid ${validDays} days.`;
            
        } else if (daysUntilBirthday === 3) {
            // 3 days before
            discountPercentage = 15;
            validDays = 14;
            headerColor = '#FF9800';
            accentColor = '#F57C00';
            emailSubject = `${firstName}, It's Almost Your Birthday! 🎁`;
            smsMessage = `Hi ${firstName}! 3 days till your birthday! 🎈 Your ${discountPercentage}% OFF (${couponCode}) is waiting. Treat yourself!`;
            
        } else if (daysUntilBirthday === 0) {
            // Birthday day
            discountPercentage = 20;
            validDays = 30;
            headerColor = '#9C27B0';
            accentColor = '#7B1FA2';
            emailSubject = `🎉 Happy Birthday ${firstName}! 🎂`;
            smsMessage = `🎂 Happy Birthday ${firstName}! Enjoy ${discountPercentage}% OFF with code ${couponCode} - valid all month!`;
        }
        
        emailBody = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #ffffff;">
                    <tr>
                        <td style="padding: 40px 20px;">
                            <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.5); border: 1px solid #2a2a2a;">
                                
                                <!-- Header with dark gradient -->
                                <tr>
                                    <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); border-bottom: 3px solid #ff6b00;">
                                        <div style="font-size: 48px; margin-bottom: 10px;">💪🏋️🎉</div>
                                        <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ff6b00; text-shadow: 0 0 20px rgba(255, 107, 0, 0.5), 0 2px 4px rgba(0,0,0,0.8); text-transform: uppercase; letter-spacing: 2px;">
                                            ${daysUntilBirthday === 0 ? 'BEAST MODE BIRTHDAY!' : daysUntilBirthday === 7 ? 'BIRTHDAY GAINS INCOMING!' : 'YOUR BIRTHDAY IS NEAR!'}
                                        </h1>
                                        <p style="margin: 10px 0 0 0; font-size: 18px; color: #cccccc; font-weight: 500;">
                                            ${daysUntilBirthday === 0 ? 'Today You Level Up! 🔥' : `Only ${daysUntilBirthday} ${daysUntilBirthday === 1 ? 'day' : 'days'} to beast mode!`}
                                        </p>
                                    </td>
                                </tr>

                                <!-- Main Content -->
                                <tr>
                                    <td style="padding: 40px; background-color: #1a1a1a;">
                                        <h2 style="margin: 0 0 15px 0; font-size: 24px; font-weight: 600; color: #ffffff;">What's Up ${firstName}! 💪</h2>
                                        
                                        <p style="margin: 0 0 20px 0; color: #b0b0b0; font-size: 16px; line-height: 1.6;">
                                            ${daysUntilBirthday === 0 
                                                ? `Another year stronger, another year wiser! 🔥 Time to celebrate YOUR grind and dedication. We've got something MASSIVE for you!`
                                                : daysUntilBirthday === 7
                                                ? `The countdown to your birthday has started! One week until you level up, and we're bringing the FIRE with an exclusive offer for you! 💥`
                                                : `Your birthday is almost here! Time flies when you're crushing goals. Get ready for something EPIC! 🚀`
                                            }
                                        </p>

                                        <!-- Discount Card - Dark Athletic Style -->
                                        <div style="background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%); border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center; box-shadow: 0 0 30px rgba(255, 107, 0, 0.3), inset 0 0 60px rgba(0,0,0,0.5); border: 2px solid #ff6b00;">
                                            <div style="background-color: rgba(255, 107, 0, 0.1); border-radius: 8px; padding: 20px; margin-bottom: 20px; border: 1px solid rgba(255, 107, 0, 0.3);">
                                                <p style="margin: 0 0 10px 0; font-size: 14px; color: #ff6b00; text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">YOUR POWER DISCOUNT</p>
                                                <p style="margin: 0; font-size: 56px; font-weight: 900; color: #ffffff; text-shadow: 0 0 30px rgba(255, 107, 0, 0.8), 0 2px 8px rgba(0,0,0,0.9);">${discountPercentage}% OFF</p>
                                            </div>
                                            
                                            <div style="background: linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%); border-radius: 8px; padding: 20px; margin-bottom: 15px; border: 1px solid #3a3a3a;">
                                                <p style="margin: 0 0 8px 0; font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">COUPON CODE</p>
                                                <p style="margin: 0; font-size: 32px; font-weight: 900; color: #ff6b00; letter-spacing: 3px; font-family: 'Courier New', monospace; text-shadow: 0 0 10px rgba(255, 107, 0, 0.5);">${couponCode}</p>
                                            </div>
                                            
                                            <p style="margin: 0; font-size: 13px; color: #cccccc; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                                ⚡ VALID FOR ${validDays} DAYS ${daysUntilBirthday === 0 ? '(ENTIRE MONTH!)' : 'FROM TODAY'}
                                            </p>
                                        </div>

                                        <p style="margin: 0 0 30px 0; color: #b0b0b0; font-size: 15px; line-height: 1.6; text-align: center;">
                                            ${daysUntilBirthday === 0 
                                                ? `TIME TO FUEL YOUR GAINS! Stock up on your favorite supplements and crush those goals! 💪`
                                                : `GET READY TO DOMINATE! Upgrade your supplement stack and take your training to the next level! 🔥`
                                            }
                                        </p>

                                        <!-- CTA Button - Athletic Style -->
                                        <div style="text-align: center; margin: 30px 0;">
                                            <a href="${storeUrl}" style="display: inline-block; background: linear-gradient(135deg, #ff6b00 0%, #ff8800 100%); color: #ffffff; text-align: center; padding: 18px 45px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 17px; box-shadow: 0 0 25px rgba(255, 107, 0, 0.5), 0 4px 15px rgba(0,0,0,0.6); text-transform: uppercase; letter-spacing: 1px; border: 2px solid #ff9900;">
                                                💪 CLAIM YOUR DISCOUNT
                                            </a>
                                        </div>

                                        <!-- How to Use - Dark Style -->
                                        <div style="background: linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%); border-left: 4px solid #ff6b00; padding: 20px; margin: 30px 0; border-radius: 4px; border: 1px solid #3a3a3a;">
                                            <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 700; color: #ff6b00; text-transform: uppercase; letter-spacing: 1px;">HOW TO ACTIVATE YOUR DISCOUNT:</h3>
                                            <ol style="margin: 0; padding-left: 20px; color: #b0b0b0; font-size: 14px; line-height: 2;">
                                                <li><strong style="color: #fff;">Visit</strong> our warehouse or shop online</li>
                                                <li><strong style="color: #fff;">Load up</strong> your cart with premium supplements</li>
                                                <li><strong style="color: #fff;">Enter code</strong> <strong style="color: #ff6b00;">${couponCode}</strong> at checkout</li>
                                                <li><strong style="color: #fff;">Save</strong> ${discountPercentage}% and dominate! 💪</li>
                                            </ol>
                                        </div>

                                        <!-- Personal Message -->
                                        <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #2a2a2a; text-align: center;">
                                            <p style="margin: 0 0 10px 0; font-size: 16px; color: #cccccc; line-height: 1.6; font-weight: 500;">
                                                ${daysUntilBirthday === 0 
                                                    ? `May this year bring you MASSIVE gains, unstoppable energy, and legendary achievements! 🔥`
                                                    : `We're counting down the days with you! Get ready to celebrate in BEAST MODE! 💥`
                                                }
                                            </p>
                                            <p style="margin: 15px 0 0 0; font-size: 15px; color: #999; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                                Stay Strong,<br/>
                                                <span style="color: #ff6b00; font-weight: 700; font-size: 16px;">The ${companyName} Team</span> 💪
                                            </p>
                                        </div>

                                    </td>
                                </tr>

                                <!-- Footer - Dark Style -->
                                <tr>
                                    <td style="padding: 30px 40px; background-color: #111111; border-top: 1px solid #2a2a2a;">
                                        <p style="margin: 0 0 10px 0; font-size: 12px; color: #666; text-align: center; line-height: 1.5;">
                                            Questions? Contact us at <a href="mailto:${companyEmail}" style="color: #ff6b00; text-decoration: none; font-weight: 600;">${companyEmail}</a>
                                        </p>
                                        <p style="margin: 0 0 5px 0; font-size: 11px; color: #666; text-align: center;">
                                            Coupon code: <strong style="color: #ff6b00;">${couponCode}</strong> | Valid until ${new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #666; text-align: center;">
                                            Automated birthday message from ${companyName}
                                        </p>
                                    </td>
                                </tr>

                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;
        
        return {
            email: {
                subject: emailSubject,
                body: emailBody
            },
            sms: smsMessage
        };
    }

    /**
     * Send birthday notification based on days until birthday
     */
    async sendBirthdayNotification(customer, daysUntilBirthday) {
        const messageTypes = {
            7: 'BIRTHDAY_7_DAYS',
            3: 'BIRTHDAY_3_DAYS',
            0: 'BIRTHDAY_DAY'
        };
        
        const messageType = messageTypes[daysUntilBirthday];
        if (!messageType) {
            throw new Error(`Invalid days until birthday: ${daysUntilBirthday}`);
        }

        try {
            // Generate unique coupon code
            const couponCode = this.generateCouponCode(customer, daysUntilBirthday);
            console.log(`📧 Generated birthday coupon code: ${couponCode} for ${customer.customerName}`);

            // Create coupon in database
            const promotion = await this.createBirthdayCoupon(customer, daysUntilBirthday, couponCode);
            console.log(`✅ Birthday promotion created: ${promotion.id} - ${couponCode}`);

            // Generate email content with the coupon code
            const content = this.generateBirthdayContent(customer, daysUntilBirthday, couponCode);
            
            // Send notification (skip duplicate check for testing - set to false in production)
            const skipDuplicateCheck = process.env.BIRTHDAY_SKIP_DUPLICATE_CHECK === 'true' || false;
            
            const result = await notificationService.sendNotification(
                customer.id,
                'BIRTHDAY',
                content,
                {
                    messageType,
                    branchId: customer.branchId,
                    promotionId: promotion.id,
                    couponCode: couponCode,
                    skipDuplicateCheck: skipDuplicateCheck // Skip duplicate check if enabled
                }
            );

            console.log(`🎉 Birthday notification sent successfully to ${customer.customerName} with coupon ${couponCode}`);
            return result;
            
        } catch (error) {
            console.error(`❌ Error sending birthday notification:`, error);
            throw error;
        }
    }
}

module.exports = new BirthdayNotificationService();
