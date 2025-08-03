express = require("express");
require("dotenv").config();
const app = express();
const port = process.env.PORT;
app.use(express.json());
const sequelize = require("./db");
const qrRoutes = require("./Routes/qrRoutes");
const cors = require("cors");
const QRCode = require("./models/qrcode");
app.use(
  cors({
    origin: "*", // React app's origin
    credentials: true, // Allow credentials (cookies) to be sent
  })
);

app.get("/", async(req, res) => {
  try {
    let QRCodes = await QRCode.findAll();
    res.status(200).json({QRCodes});
  } catch (error) {
    console.error("Error in root route:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.use("/api", qrRoutes);

app.listen(port, async () => {
  console.log(`server running on port ${port}`);

  try {
    await sequelize.authenticate();
    console.log(
      "Connection to the database has been established successfully."
    );
    await sequelize.sync({ force: false });

    console.log("All models were synchronized successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
});
