require("dotenv").config();
const cloudinary = require("cloudinary").v2;


// Configure Cloudinary (make sure .env has correct values)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use a local image for testing
const filePath = "./controller/IMG_8332.png"; // Place a small PNG image in your project root

cloudinary.uploader.upload(filePath, { folder: "uploads" }, (error, result) => {
  if (error) {
    console.error("Cloudinary upload error:", error);
  } else {
    console.log("Cloudinary upload success:", result.secure_url);
  }
});