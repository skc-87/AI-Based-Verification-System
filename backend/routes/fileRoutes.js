const express = require("express");
const multer = require("multer");
const { uploadFile, getAllFiles, uploadFileByTeacher, viewHandwritingSample, viewAssignment, evaluateAssignment, getStudentAssignments  } = require("../controllers/fileController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload route
router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  (req, res, next) => {
    console.log("------ [UPLOAD API HIT] ------");
    console.log("Request body:", req.body);
    console.log("File info:", req.file);
    if (!req.file) return res.status(400).json({ error: "No file uploaded!" });
    next();
  },
  uploadFile
);

router.post(
  "/upload/teacher",
  authMiddleware,
  upload.single("file"),
  uploadFileByTeacher
);

router.get("/all-files", authMiddleware, getAllFiles);

router.get("/view-assignment/:studentId", viewAssignment);

router.get("/view-sample/:studentId", viewHandwritingSample);

router.put("/evaluate/:fileId", authMiddleware, evaluateAssignment);

// Get all files for a specific student
router.get("/student-assignments/:studentId", authMiddleware, getStudentAssignments);

module.exports = router;
