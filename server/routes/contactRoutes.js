const express = require("express");
const { sendContactEmail } = require("../controller/contactController");

const router = express.Router();
router.post("/send", sendContactEmail);

module.exports = router;