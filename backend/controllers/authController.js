const User = require("../models/User");
const bcrypt = require("bcrypt");
const crypto = require("crypto"); // Using your original crypto-based token strategy

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // --- CORRECTION 1: PASSWORD HASHING ---
    // The password is intentionally passed as plain text.
    // The .pre('save') hook in your User.js model is responsible for hashing it before it's saved.
    // This removes the redundant hashing logic from the controller.
    const authToken = crypto.randomBytes(30).toString("hex");

    user = new User({ 
      name, 
      email, 
      password, // Pass plain password; model will hash it
      role, 
      authToken 
    });
    
    await user.save();

    res.status(201).json({ 
      message: "User registered successfully", 
      token: authToken, 
      role: user.role 
    });

  } catch (error) {
    console.error("REGISTRATION ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};


exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Use a generic message for security to prevent email enumeration
      return res.status(400).json({ message: "Invalid credentials" }); 
    }

    // --- CORRECTION 2: PASSWORD MATCHING ---
    // This now uses the custom method you defined on your userSchema.
    // It keeps your controller clean and encapsulates the logic within the model.
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Your original logic for generating a new token on login remains.
    const authToken = crypto.randomBytes(30).toString("hex");
    user.authToken = authToken;
    await user.save();

    res.json({ 
      token: authToken, 
      role: user.role 
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

