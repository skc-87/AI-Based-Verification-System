const express = require("express");
const User = require("../models/User");
const Student = require("../models/Student");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// Register User (Student/Teacher) with Transactions
router.post("/register", async (req, res) => {
  const { name, email, password, role, mobile_number, department, year } = req.body;

  // Start MongoDB session for transaction
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();

    // Check if user exists
    const userExists = await User.findOne({ email }).session(session);
    if (userExists) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "User already exists" });
    }

    // Create User
    const user = await User.create([{ name, email, password, role }], { session });

    let studentProfile = null;
    
    if (role === "student") {
      // Validate student fields
      if (!mobile_number || !department || !year) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ 
          message: "All student fields (mobile_number, department, year) are required" 
        });
      }

      // Create Student Profile
      studentProfile = await Student.create([{
        user: user[0]._id,
        mobile_number,
        department,
        year: Number(year),
      }], { session });
    }

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "User registered successfully",
      user: user[0],
      student: studentProfile ? studentProfile[0] : null,
      token: generateToken(user[0]._id)
    });

  } catch (error) {
    // Abort transaction on any error
    await session.abortTransaction();
    session.endSession();
    
    console.error("Registration error:", error.message);
    
    res.status(500).json({ 
      message: "Server error during registration",
      error: error.message 
    });
  }
});

// Login User (Student/Teacher)
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Fetch student profile if user is student
    let studentProfile = null;
    if (user.role === "student") {
      studentProfile = await Student.findOne({ user: user._id });
    }

    // Remove password from user object in response
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json({
      message: "Login Successful",
      user: userResponse,
      student: studentProfile,
      token: generateToken(user._id),
    });

  } catch (error) {
    console.error("Login error:", error.message);
    
    res.status(500).json({ 
      message: "Server error during login",
      error: error.message 
    });
  }
});

module.exports = router;