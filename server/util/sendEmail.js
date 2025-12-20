const nodemailer=require("nodemailer");

exports.sendEmail = async (to, subject, text, html) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Parking System" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html: html || text,
  });
};


