express = require("express");
require("dotenv").config();
const app = express();
const port = process.env.PORT;
app.use(express.json());
const sequelize = require("./db");
const qrRoutes = require("./Routes/qrRoutes");
const cors = require("cors");
const QRCode = require("./models/qrcode");
const User = require("./models/User");
const RefreshToken = require("./models/RefreshToken");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

app.use(
  cors({
    origin: process.env.FRONT_END_URL,
    methods: ["GET", "POST", "PUT", "DELETE"], // React app's origin
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


const generateAccessToken = (user) => {
	return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
};

const generateRefreshToken = async (user) => {
	const refreshToken = await jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, {
		expiresIn: "30d",
	});

	await RefreshToken.create({
		token: refreshToken,
		userId: user.id,
		expiryDate: new Date(new Date().getTime() + 60000 * 60 * 24 * 30 ), // 30 days expiry
	});

	return refreshToken;
};

app.post("/login", async (request, response) => {
	//authenticate the user

	const { username, password } = request.body;

	const user = await User.findOne({ where: { username: username } });
	if (!user) {
		return response
			.status(400)
			.json({ message: "Invalid username or password" });
	}

	// Verify the password
	const validPassword = await bcrypt.compare(password, user.password);
	if (!validPassword) {
		return response
			.status(400)
			.json({ message: "Invalid username or password" });
	}

	const userRefreshToken = await RefreshToken.findOne({
		where: { userId: user.id, status: "valid" },
	});
	if (userRefreshToken) {
		userRefreshToken.status = "invalid";
		await userRefreshToken.save();
	}

	const accessToken = generateAccessToken({
		id: user.id,
		username: user.username,
		role: user.role,
	});
	const refreshToken = await generateRefreshToken({
		id: user.id,
		username: user.username,
		role: user.role,
	});
	response.json({ accessToken, refreshToken });
});

app.post("/token", async (request, response) => {
	const refreshToken = request.body.refreshToken;

	if (refreshToken === null) return response.sendStatus(401);

	console.log("Refresh Token:", refreshToken);

	const storedToken = await RefreshToken.findOne({
		where: {
			token: refreshToken,
			status: "valid",
		},
	});

	console.log("Stored Token:", storedToken);

	if (!storedToken){
		console.log("no token found");
		return response.status(403).json({ message: "the token is invalid" });
	}

	// if (new Date() > storedToken.expiryDate) {
	// 	storedToken.status = "invalid";
	// 	await storedToken.save();
	// 	console.log("token has expired");
	// 	return response
	// 		.status(403)
	// 		.json({ message: "Refresh token has expired and is now invalid" });

	// }

	await jwt.verify(
		refreshToken,
		process.env.REFRESH_TOKEN_SECRET,
		async (err, user) => {
			if (err) {
				console.log("token verification failed");
				return response
					.status(403)
					.json({ message: "the token verification is unseccessfull" });
			}

			const accessToken = generateAccessToken({
				id: user.id,
				username: user.username,
				role: user.role,
			});

			const newRefreshToken = await generateRefreshToken({
				id: user.id,
				username: user.username,
				role: user.role,
			});
			storedToken.status = "invalid";
			await storedToken.save();

			response.status(200).json({ accessToken, refreshToken: newRefreshToken });
		}
	);
});

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
