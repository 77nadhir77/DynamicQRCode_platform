const express = require("express");
const router = express.Router();
const qrController = require("../controller/qrController");
const authController = require("../controller/authController");
// const multer = require("multer");
// const { storage } = require("../utils/cloudinaryConfig");
// const upload = multer({ storage: storage });

const jwt = require("jsonwebtoken");
require("dotenv").config();

const authenticateTokens = (req, res, next) => {
  const authHeaders = req.headers["authorization"];
  const authToken = authHeaders && authHeaders.split(" ")[1];

  if (!authToken) return res.sendStatus(401);

  jwt.verify(authToken, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      }
      return res.sendStatus(403); // Token invalid
    }

    req.user = user;
    next();
  });
};

module.exports = authenticateTokens;

router.post("/create", qrController.createQRCode);
router.put("/update/:id", qrController.updateQRCode);
router.get("/redirect/:id", qrController.redirectQRCode);
router.delete("/delete", qrController.deleteQRCode);
router.get("/qrcode/:id", qrController.getQRCode);
router.get(
  "/forgot-password",
  authenticateTokens,
  authController.forgotPassword
);

module.exports = router;
