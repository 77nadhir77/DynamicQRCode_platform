const qrcode = require("qrcode");
const QRCode = require("../models/qrcode");
const { createCanvas, loadImage } = require("canvas");
require("dotenv").config();
const cloudinary = require("../utils/cloudinaryConfig").cloudinary;
const streamifier = require("streamifier");
const QRCodeSVG = require("qrcode-svg");

exports.createQRCodeID = async (req, res) => {
  try {
    let redirectUrl = req.body.redirectUrl;

    console.log(redirectUrl);
    if (!redirectUrl) {
      return res.status(400).json({ error: "Redirect URL is required" });
    } else {
      const newQRCode = await QRCode.create({
        link: redirectUrl,
      });

      return res.status(200).json({
        message: "QR code created",
        qrCodeId: newQRCode.id,
      });
    }
  } catch (err) {
    console.error("Controller error:", err); // Add this line
    return res.status(500).json({ error: err, message: err.message });
  }
};

exports.createQRCode = async (req, res) => {
  try {
    let id = req.body.qrCodeId;
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    let qrImagefile = req.file.path;

    if (!id || !qrImagefile) {
      return res
        .status(400)
        .json({ error: "QR code ID and image are required" });
    }
    console.log(qrImagefile);
    console.log(id);

    // let svgData = await qrcode.toString(
    //   `${process.env.QRCODE_LINK}/${newQRCode.id}`,
    //   { type: "svg" }
    // );

    // const qr = new QRCodeSVG({
    //   content: `${process.env.QRCODE_LINK}/${newQRCode.id}`,
    //   padding: 3,
    //   width: 700,
    //   height: 700,
    //   color: "#000000",
    //   background: "transparent",
    // });
    // let svgString = qr.svg();

    //  const svgBase64 = `data:image/svg+xml;base64,${Buffer.from(
    //   svgString
    // ).toString("base64")}`;

    const canvasSize = 1400;
    const extraWidth = 150;
    //const ctxMargin = 50; // how much inside the QR we draw the ID
    const canvas = createCanvas(canvasSize + extraWidth, canvasSize);

    const ctx = canvas.getContext("2d");

    // Load and draw the QR code image (full size)
    //const logo = await loadImage("https://res.cloudinary.com/dpxpmkxhw/image/upload/v1754446721/uploads/uhalnszbafahgaw3lsic.png")

    // Add required width and height to make it renderable by canvas

    // const logoSize = canvasSize * 0.2;
    // const dx = (canvasSize - logoSize) / 2;
    // const dy = (canvasSize - logoSize) / 2;

    const qrImage = await loadImage(qrImagefile);
    ctx.drawImage(qrImage, 0, 0, canvasSize, canvasSize);
    // // Optional: white rounded box behind logo
    // ctx.fillStyle = "white";
    // ctx.beginPath();
    // ctx.roundRect
    //   ? ctx.roundRect(dx, dy, logoSize, logoSize, 10)
    //   : ctx.rect(dx, dy, logoSize, logoSize); // fallback if roundRect not supported
    // ctx.fill();

    // Draw the logo
    //.drawImage(logo, dx, dy, logoSize, logoSize);

    // Format ID (4 digits minimum)
    const idText = id < 1000 ? String(id).padStart(4, "0") : String(id);

    // Prepare text style
    ctx.save();
    ctx.font = "bold 48px Arial"; // larger font
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";


    // Move origin to slightly inside the right side of QR and center vertically
    ctx.translate(canvasSize + extraWidth / 2, canvasSize / 2); // 30px margin away from the QR code
    ctx.rotate(Math.PI / 2); // 90° clockwise



    // Draw text
    ctx.fillStyle = "#222222"; // text color
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
            public_id: `qrcode_${id}`,
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
    console.log(cloudinaryResult.secure_url);
    await QRCode.update(
      { image: cloudinaryResult.secure_url },
      { where: { id: id } }
    );
    return res.status(200).json({
      message: "QR code created and uploaded to Cloudinary",
      imageUrl: cloudinaryResult.secure_url,
    });
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
