const express = require("express");
const router = express.Router();
const qrController = require("../controller/qrController");
// const multer = require("multer");
// const { storage } = require("../utils/cloudinaryConfig");
// const upload = multer({ storage: storage });

router.post("/create", qrController.createQRCode);
router.put("/update/:id", qrController.updateQRCode);
router.get("/redirect/:id", qrController.redirectQRCode);
router.delete("/delete", qrController.deleteQRCode);
router.get("/qrcode/:id", qrController.getQRCode);

module.exports = router;
