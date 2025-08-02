
const sequelize = require("../db");
const { DataTypes } = require("sequelize");

const QRCode = sequelize.define("QRCodes", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    link: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    image: {
        type: DataTypes.STRING,
        allowNull: true, // Optional, if you want to store the image URL
    },

});

module.exports = QRCode;
