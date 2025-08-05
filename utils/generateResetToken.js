const crypto = require("crypto");

const generateResetToken = () => {
  const resetToken = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  return { resetToken, hashedToken };
};

module.exports = generateResetToken;
