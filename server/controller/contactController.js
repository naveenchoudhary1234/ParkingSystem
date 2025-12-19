const { sendEmail } = require("../util/sendEmail");

// Send contact form email
exports.sendContactEmail = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address"
      });
    }

    // Email content for admin
    const adminEmailContent = `
New Contact Form Submission

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

This message was sent from the Parking System contact form.
    `;

    // Email content for user (auto-reply)
    const userEmailContent = `
Dear ${name},

Thank you for contacting us! We have received your message and will get back to you as soon as possible.

Your Message Details:
Subject: ${subject}
Message: ${message}

We typically respond within 24-48 hours during business days.

Best regards,
Parking System Team
    `;

    try {
      // Send email to admin
      await sendEmail(
        process.env.EMAIL_USER, // Admin email
        `Contact Form: ${subject}`,
        adminEmailContent
      );

      // Send auto-reply to user
      await sendEmail(
        email,
        "Thank you for contacting us - Parking System",
        userEmailContent
      );

      console.log(`📧 Contact form email sent successfully from ${email}`);

      res.status(200).json({
        success: true,
        message: "Your message has been sent successfully! We'll get back to you soon."
      });

    } catch (emailError) {
      console.error("❌ Error sending contact email:", emailError);
      
      // Even if email fails, we don't want to show a generic error to user
      res.status(500).json({
        success: false,
        message: "There was an issue sending your message. Please try again later or contact us directly."
      });
    }

  } catch (error) {
    console.error("❌ Error in sendContactEmail:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};