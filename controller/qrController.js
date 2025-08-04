const qrcode = require("qrcode");
const QRCode = require("../models/qrcode");
const { createCanvas, loadImage } = require("canvas");
require("dotenv").config();
const cloudinary = require('../utils/cloudinaryConfig').cloudinary;
const streamifier = require("streamifier");

exports.createQRCode = async (req, res) => {
  try {
    let redirectUrl = req.body.redirectUrl;
    console.log(redirectUrl);
    if (!redirectUrl) {
      return res.status(400).json({ error: "Redirect URL is required" });
    } else {
      const newQRCode = await QRCode.create({
        link: redirectUrl,
      });
      const qrcodeData = await qrcode.toDataURL(
        process.env.QRCODE_LINK + "/" + newQRCode.id,
        {
          type: "image/png",
        }
      );
      const canvasSize = 300;
      const canvas = createCanvas(canvasSize, canvasSize + 40); // Extra space for ID text
      const ctx = canvas.getContext("2d");

      // Draw QR code image
      const qrImage = await loadImage(qrcodeData);
      ctx.drawImage(qrImage, 0, 0, canvasSize, canvasSize);

      // Draw ID text below QR code
      ctx.font = "bold 20px Arial";
      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      ctx.fillText(`ID: ${newQRCode.id}`, canvasSize / 2, canvasSize + 30);

      // Send image
      const buffer = canvas.toBuffer("image/png");

      const uploadFromBuffer = async (buffer) => {
        return new Promise((resolve, reject) => {
          const cld_upload_stream = cloudinary.uploader.upload_stream(
            {
              folder: "uploads",
              resource_type: "image",
              public_id: `qrcode_${newQRCode.id}`,
              format: "png",
            },
            (error, result) => {
              if (error) {
                console.error("Cloudinary error:", error);
                return reject(error);
              }
              resolve(result);
            }
          );

          const readStream = streamifier.createReadStream(buffer);
          readStream.on("error", (err) => {
            console.error("Read stream error:", err);
            reject(err);
          });

          readStream.pipe(cld_upload_stream);
        });
      };

      console.log("About to upload to Cloudinary...");
      const cloudinaryResult = await uploadFromBuffer(buffer);
      console.log("Cloudinary upload finished:", cloudinaryResult);
      newQRCode.image = cloudinaryResult.secure_url;
      await newQRCode.save();
      console.log(cloudinaryResult.secure_url);
      return res.status(200).json({
        message: "QR code created and uploaded to Cloudinary",
        imageUrl: cloudinaryResult.secure_url,
        qrCode: newQRCode,
      });
    }
  } catch (err) {
    console.error("Controller error:", err); // Add this line
    return res.status(500).json({ error: err, message: err.message });
  }
};

exports.redirectQRCode = async (req, res) => {
  const { id } = req.params;
  try {
    const record = await QRCode.findByPk(id);
    if (!record) return res.status(404).send("Not found");
    res.status(200).redirect(record.link);
  } catch (error) {
    res.status(500).send("Server error");
  }
};


exports.updateQRCode = async (req, res) => {
  const { id } = req.params;
  const { link } = req.body;
  try {
    const record = await QRCode.findByPk(id);
    if (!record) return res.status(404).send("Not found");
    record.link = link;
    await record.save();
    res.status(200).json({ message: "QR code updated successfully", record });
  } catch (error) {
    res.status(500).send("Server error");
  }
}


exports.deleteQRCode = async (req, res) => {
  const ids = req.body.selectedIds;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "Invalid or empty 'selectedIds'" });
  }

  try {
    const records = await QRCode.findAll({
      where: { id: ids },
    });

    if (records.length === 0) {
      return res.status(404).json({ error: "QR codes not found" });
    }

    await QRCode.destroy({
      where: { id: ids },
    });

    const newQRCodes = await QRCode.findAll();

    return res.status(200).json({ message: "QR codes deleted successfully" , newQRCodes : newQRCodes });
  } catch (error) {
    console.error("Error deleting QR codes:", error); // optional but helpful
    return res.status(500).json({ error: "Server error" });
  }
};



exports.getQRCode = async (req, res) => {
  const { id } = req.params;
  try {
    const record = await QRCode.findByPk(id);
    if (!record) return res.status(404).send("Not found");
    res.status(200).json(record);
  } catch (error) {
    res.status(500).send("Server error");
  }
}