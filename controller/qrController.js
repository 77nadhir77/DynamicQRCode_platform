const qrcode = require("qrcode");
const QRCode = require("../models/qrcode");
const { createCanvas, loadImage } = require("canvas");
require("dotenv").config();
const cloudinary = require("../utils/cloudinaryConfig").cloudinary;
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
      let svgData = await qrcode.toString(
        `${process.env.QRCODE_LINK}/${newQRCode.id}`,
        { type: "svg"}
      );
      const canvasSize = 900;
      const ctxMargin = 50; // how much inside the QR we draw the ID
      const canvas = createCanvas(canvasSize, canvasSize);
      const ctx = canvas.getContext("2d");

      // Load and draw the QR code image (full size)
      
      // Add required width and height to make it renderable by canvas
      
      if (!svgData.includes("width") && !svgData.includes("height")) {
        svgData = svgData.replace(
          "<svg",
          `<svg width="${canvasSize}" height="${canvasSize}"`
        );
      }
      const svgBase64 = `data:image/svg+xml;base64,${Buffer.from(
        svgData
      ).toString("base64")}`;

      const qrImage = await loadImage(svgBase64);
      ctx.drawImage(qrImage, 0, 0, canvasSize, canvasSize);

      // Format ID (4 digits minimum)
      const idText =
        newQRCode.id < 1000
          ? String(newQRCode.id).padStart(4, "0")
          : String(newQRCode.id);

      // Prepare text style
      ctx.save();
      ctx.font = "bold 36px Arial"; // larger font
      ctx.fillStyle = "black";
      ctx.textAlign = "center";

      // Move origin to slightly inside the right side of QR and center vertically
      ctx.translate(canvasSize - ctxMargin, canvasSize / 2);
      ctx.rotate(Math.PI / 2); // 90° clockwise
      ctx.fillText(`ID: ${idText}`, 0, 0); // draw at new origin
      ctx.restore();

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
};

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

    return res.status(200).json({
      message: "QR codes deleted successfully",
      newQRCodes: newQRCodes,
    });
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
};
