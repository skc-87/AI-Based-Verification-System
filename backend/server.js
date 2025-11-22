const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const fileRoutes = require("./routes/fileRoutes"); // ✅ Import File Routes
const path = require("path");
const modelRoute = require("./routes/modelRoutes");
const eventRoutes = require("./routes/eventRoutes"); // ADD THIS LINE



dotenv.config();
connectDB();

const app = express();

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],  
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

// ✅ Register Routes
app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes); // ✅ Add this line to enable file uploads

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/model", modelRoute);

// Serve the fetched_files folder as static
const fetchedFilesPath = path.join(__dirname, "../model/fetched_files"); // Adjust if needed
app.use("/download", express.static(fetchedFilesPath));

app.use("/api/events", eventRoutes); // ADD THIS LINE


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
