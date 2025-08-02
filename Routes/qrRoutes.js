const express = require("express");
const router = express.Router();
const qrController = require("../controller/qrController");
// const multer = require("multer");
// const { storage } = require("../utils/cloudinaryConfig");
// const upload = multer({ storage: storage });

router.post("/create", qrController.createQRCode);
router.put("/update/:id", qrController.upadateQRCode);
router.get("/redirect/:id", qrController.redirectQRCode);

module.exports = router;
