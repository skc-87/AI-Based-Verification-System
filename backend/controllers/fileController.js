const File = require("../models/File");
const User = require("../models/User");

// ✅ Upload File
exports.uploadFile = async (req, res) => {
  const { fileCategory, studentName } = req.body;
  const studentId = req.user?.id;

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    const newFile = new File({
      studentId,
      studentName,
      fileCategory,
      fileName: req.file.originalname,
      contentType: req.file.mimetype,
      fileData: req.file.buffer,
      uploadDate: new Date() // Explicitly set upload date
    });

    await newFile.save();
    res.status(201).json({ message: "File uploaded successfully!", file: newFile });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Upload File from Teacher Dashboard
exports.uploadFileByTeacher = async (req, res) => {
  const { fileCategory, studentName, studentId } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  if (!studentId && !studentName) {
    return res.status(400).json({ message: "Either studentId or studentName must be provided." });
  }

  try {
    let student;
    if (studentId && studentName) {
      student = await User.findOne({ _id: studentId, name: studentName, role: "student" });
    } else if (studentId) {
      student = await User.findOne({ _id: studentId, role: "student" });
    } else {
      student = await User.findOne({ name: studentName, role: "student" });
    }

    if (!student) {
      return res.status(404).json({ message: "Student not found or not a student." });
    }

    if (fileCategory === "handwriting_sample") {
      const existingSample = await File.findOne({ studentId: student._id, fileCategory });

      if (existingSample) {
        existingSample.fileData = req.file.buffer;
        existingSample.fileName = req.file.originalname;
        existingSample.contentType = req.file.mimetype;
        existingSample.studentName = student.name;
        existingSample.uploadDate = new Date(); // Explicitly update upload date

        await existingSample.save();

        return res.status(200).json({ 
          message: "Handwriting sample updated by teacher.", 
          file: existingSample 
        });
      }
    }

    const newFile = new File({
      studentId: student._id,
      studentName: student.name,
      fileCategory,
      fileName: req.file.originalname,
      contentType: req.file.mimetype,
      fileData: req.file.buffer,
      uploadDate: new Date() // Explicitly set upload date
    });

    await newFile.save();
    res.status(201).json({ message: "File uploaded by teacher successfully!", file: newFile });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ GET: Fetch all files, split by category
exports.getAllFiles = async (req, res) => {
  try {
    const files = await File.find().select("-fileData");

    const handwritingSamples = files.filter(f => f.fileCategory === "handwriting_sample");
    const assignments = files.filter(f => f.fileCategory === "assignment");

    res.status(200).json({ handwritingSamples, assignments });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch files", error: error.message });
  }
};

// ✅ View Assignment
exports.viewAssignment = async (req, res) => {
  const { studentId } = req.params;

  try {
    const assignment = await File.findOne({ studentId, fileCategory: "assignment" }).sort({ uploadDate: -1 });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    res.set({
      "Content-Type": assignment.contentType,
      "Content-Disposition": `inline; filename="${assignment.fileName}"`,
    });

    res.send(assignment.fileData);
  } catch (error) {
    res.status(500).json({ error: "Server error while downloading" });
  }
};

// ✅ View Handwriting Sample (in-browser)
exports.viewHandwritingSample = async (req, res) => {
  const { studentId } = req.params;

  try {
    const sample = await File.findOne({ studentId, fileCategory: "handwriting_sample" }).sort({ uploadDate: -1 });

    if (!sample) {
      return res.status(404).json({ error: "Handwriting sample not found" });
    }

    res.set({
      "Content-Type": sample.contentType,
      "Content-Disposition": `inline; filename="${sample.fileName}"`,
    });

    res.send(sample.fileData);
  } catch (error) {
    res.status(500).json({ error: "Server error while viewing sample" });
  }
};

// ✅ PATCH: Evaluate assignment and add marks
exports.evaluateAssignment = async (req, res) => {
  const { fileId } = req.params;
  const { marks } = req.body;

  try {
    const updatedFile = await File.findByIdAndUpdate(fileId, { $set: { marks } }, { new: true });

    if (!updatedFile) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    res.status(200).json({ message: "Marks added successfully", file: updatedFile });
  } catch (error) {
    res.status(500).json({ message: "Failed to evaluate assignment", error: error.message });
  }
};

// In your backend controller
exports.getStudentAssignments = async (req, res) => {
  try {
    const files = await File.find({
      studentId: req.params.studentId,
      fileCategory: 'assignment'
    }).sort({ uploadDate: -1 });
    
    res.json(files);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};