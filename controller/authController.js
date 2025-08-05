// controllers/authController.js
const dayjs = require("dayjs");
const User = require("../models/User");
const generateResetToken = require("../utils/generateResetToken");
const sendEmail = require("../utils/sendEmail");
require('dotenv').config();

exports.forgotPassword = async (req, res) => {
  

  try {
    const user = await User.findOne({ where: { role: "admin" } });
    if (!user) {
      return res.status(404).json({ message: "No user found" });
    }

    const { resetToken, hashedToken } = generateResetToken();

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = dayjs().add(1, "minute").toDate(); // 1-minute expiry
    await user.save();

    const message = `
      <p>You requested a password reset.</p>
      <p>Your verification code is:</p>
      <h2>${resetToken}</h2>
      <p>This code will expire in 1 minute.</p>
    `;

    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: "Password Reset Code",
      html: message,
    });

    res.status(200).json({ message: "Reset code sent to email." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
