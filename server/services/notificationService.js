const Notification = require("../model/Notification");
const NotificationPreference = require("../model/NotificationPreference");
const User = require("../model/User");
const webpush = require("web-push");
const nodemailer = require("nodemailer");

// Configure web push (add these to .env)
// VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:' + process.env.NOTIFICATION_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Email transporter (reuse existing from sendEmail.js)
let emailTransporter = null;
try {
  emailTransporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
} catch (error) {
  console.warn("Email transporter not configured:", error.message);
}

/**
 * Send notification via multiple channels based on user preferences
 */
async function sendNotification(userId, notificationData) {
  try {
    console.log("📨 sendNotification called for user:", userId, "type:", notificationData.type);

    // Get user preferences
    const preferences = await NotificationPreference.findOne({ user: userId });
    console.log("📋 User preferences:", preferences ? "Found" : "Not found (using defaults)");

    const user = await User.findById(userId);
    console.log("👤 User found:", user ? user.email : "NOT FOUND");

    if (!user) {
      console.error("❌ User not found:", userId);
      return null;
    }

    // Create in-app notification
    console.log("💾 Creating in-app notification...");
    const notification = await Notification.create({
      user: userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      relatedBooking: notificationData.relatedBooking,
      relatedProperty: notificationData.relatedProperty,
      relatedReview: notificationData.relatedReview,
      actionUrl: notificationData.actionUrl,
      actionText: notificationData.actionText,
      priority: notificationData.priority || 'medium',
      expiresAt: notificationData.expiresAt
    });
    console.log("✅ In-app notification created:", notification._id);

    // Check if we should send via other channels
    if (!preferences) {
      // Default: send all if no preferences set
      console.log("📧 No preferences found - sending to all channels (default)");
      await sendPushNotification(userId, notificationData, preferences);
      await sendEmailNotification(user, notificationData);
      return notification;
    }

    console.log("⚙️ Checking notification channels...");
    console.log("   - Push enabled:", preferences.channels?.push);
    console.log("   - Email enabled:", preferences.channels?.email);
    console.log("   - SMS enabled:", preferences.channels?.sms);

    // Check quiet hours for push notifications
    const isQuietHours = checkQuietHours(preferences.quietHours);
    console.log("🌙 Quiet hours active:", isQuietHours);

    // Send push notification
    if (preferences.channels.push && !isQuietHours) {
      console.log("📲 Sending push notification...");
      await sendPushNotification(userId, notificationData, preferences);
    }

    // Send email notification
    const shouldSendEmail = shouldSendForType(preferences, notificationData.type);
    console.log("📧 Should send email:", shouldSendEmail, "for type:", notificationData.type);

    if (preferences.channels.email && shouldSendEmail) {
      console.log("📧 Sending email notification...");
      await sendEmailNotification(user, notificationData);
    } else {
      console.log("⏭️ Email notification skipped - email disabled or type filtered");
    }

    // Send SMS notification (if enabled and critical)
    if (preferences.channels.sms && notificationData.priority === 'urgent') {
      console.log("📱 Sending SMS notification...");
      await sendSMSNotification(user, notificationData);
    }

    console.log("✅ Notification processing complete");
    return notification;
  } catch (error) {
    console.error("Send Notification Error:", error);
    return null;
  }
}

/**
 * Send browser push notification
 */
async function sendPushNotification(userId, data, preferences) {
  try {
    if (!preferences || !preferences.pushSubscription || !preferences.pushSubscription.endpoint) {
      return; // No push subscription
    }

    const payload = JSON.stringify({
      title: data.title,
      body: data.message,
      icon: '/logo192.png',
      badge: '/badge.png',
      data: {
        url: data.actionUrl || '/notifications',
        notificationType: data.type
      }
    });

    await webpush.sendNotification(preferences.pushSubscription, payload);
    console.log(`✅ Push notification sent to user ${userId}`);
  } catch (error) {
    console.error("Push notification error:", error);
    
    // If subscription is invalid, remove it
    if (error.statusCode === 410) {
      await NotificationPreference.updateOne(
        { user: userId },
        { $unset: { pushSubscription: 1 } }
      );
    }
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(user, data) {
  try {
    console.log("📧 Attempting to send email to:", user.email);
    console.log("📧 Email transporter configured:", !!emailTransporter);

    if (!emailTransporter) {
      console.error("❌ Email transporter not configured!");
      return;
    }

    if (!user.email) {
      console.error("❌ User email not found!");
      return;
    }

    const mailOptions = {
      from: `ParkEasy <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `🅿️ ${data.title}`,
      html: generateEmailHTML(user, data)
    };

    console.log("📧 Sending email with options:", { to: user.email, subject: mailOptions.subject });

    await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${user.email}`);
  } catch (error) {
    console.error("❌ Email notification error:", error.message);
    console.error("Full error:", error);
  }
}

/**
 * Send SMS notification (Twilio integration placeholder)
 */
async function sendSMSNotification(user, data) {
  try {
    // TODO: Integrate with Twilio or other SMS provider
    // const twilio = require('twilio');
    // const client = twilio(accountSid, authToken);
    // await client.messages.create({
    //   body: `${data.title}: ${data.message}`,
    //   from: process.env.TWILIO_PHONE,
    //   to: user.phone
    // });
    
    console.log(`📱 SMS would be sent to ${user.phone}: ${data.title}`);
  } catch (error) {
    console.error("SMS notification error:", error);
  }
}

// Helper: Check if current time is in quiet hours
function checkQuietHours(quietHours) {
  if (!quietHours || !quietHours.enabled) return false;
  
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  return currentTime >= quietHours.startTime || currentTime <= quietHours.endTime;
}

// Helper: Check if notification should be sent based on type
function shouldSendForType(preferences, type) {
  const typeMap = {
    'booking_confirmed': preferences.bookings?.confirmed,
    'booking_ending_soon': preferences.bookings?.endingSoon,
    'booking_cancelled': preferences.bookings?.cancelled,
    'payment_received': preferences.payments?.received,
    'refund_processed': preferences.payments?.refunded,
    'favorite_available': preferences.favorites?.available,
    'price_drop': preferences.favorites?.priceDrop,
    'review_reminder': preferences.reviews?.reminder,
    'new_review': preferences.reviews?.newReview,
    'owner_response': preferences.reviews?.ownerResponse,
    'discount_offer': preferences.promotions?.offers
  };
  
  return typeMap[type] !== false; // Default to true if not specified
}

// Generate email HTML template
function generateEmailHTML(user, data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🅿️ ParkEasy</h1>
          <h2>${data.title}</h2>
        </div>
        <div class="content">
          <p>Hi ${user.name || 'there'},</p>
          <p>${data.message}</p>
          ${data.actionUrl ? `<a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}${data.actionUrl}" class="button">${data.actionText || 'View Details'}</a>` : ''}
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ParkEasy. All rights reserved.</p>
          <p><a href="${process.env.FRONTEND_URL}/profile">Manage notification preferences</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = {
  sendNotification,
  sendPushNotification,
  sendEmailNotification,
  sendSMSNotification
};
