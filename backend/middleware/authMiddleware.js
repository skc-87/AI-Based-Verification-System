

const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    console.log("Auth Header received:", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Invalid Authorization format");
      return res.status(401).json({ message: "Invalid token format" });
    }

    const token = authHeader.split(" ")[1];
    console.log("Extracted Token:", token);

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Token:", decoded);

    // Fetch user from DB
    const student = await User.findById(decoded.id).select("_id");
    console.log("User found:", student);

    if (!student) {
      console.log("User not found in the database");
      return res.status(404).json({ message: "User not found" });
    }

    req.user = { id: student._id.toString() }; // Attach user ID to request object
    next();
  } catch (error) {
    console.error("Authentication error:", error.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = { authMiddleware };
