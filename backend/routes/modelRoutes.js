const express = require("express");
const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const FileModel = require('../models/File');

// =================================================================
// --- ⚙️ Reusable Helper Function to Run Python Scripts ---
const runPythonScript = (scriptPath, args = []) => {
    return new Promise((resolve) => {
        execFile("python", [scriptPath, ...args], (error, stdout, stderr) => {
            if (error) console.error(`[Python Error] ${error.message}`);
            if (stderr) console.error(`[Python STDERR] ${stderr}`);

            let result;
            try {
                result = JSON.parse(stdout.trim());
            } catch (parseError) {
                result = {
                    status: "error",
                    message: stdout.trim() || error?.message || "Python script failed",
                    stderr: stderr.trim() || undefined
                };
            }

            resolve(result);
        });
    });
};

// =================================================================
// --- 🗺️ Centralized Error Message Mapping ---
// =================================================================
const getFriendlyErrorMessage = (errorCode) => {
    const errorMessages = {
        "handwriting_sample_not_found": "✏️ Handwriting sample not found. Please upload it first.",
        "assignment_not_found": "📄 Assignment not found. Please upload the assignment file.",
        "failed_to_save_sample": "Failed to process the handwriting sample.",
        "failed_to_save_assignment": "Failed to process the assignment file.",
        "mongodb_not_set": "Server configuration error.",
        "database_connection_failed": "Could not connect to the database.",
        "record_not_found": "Attendance record not found.",
        "invalid_status": "Invalid status value. Must be 'Present' or 'Absent'.",
        "update_failed": "Failed to update attendance record.",
        // Add any other specific error codes from your Python scripts here
    };
    return errorMessages[errorCode] || errorCode.replace(/_/g, " ") || "An unknown error occurred.";
};

// Assuming you have imported your Mongoose model as `FileModel`
async function deleteAssignmentFromDB(studentId) {
    try {
        console.log(`[🗑️] Deleting assignment for student ${studentId} from DB`);
        const deleted = await FileModel.findOneAndDelete(
            { studentId, fileCategory: "assignment" },
            { sort: { uploadDate: -1 } } // Delete the most recent assignment
        );
        if (deleted) console.log(`[✅] Deleted assignment file: ${deleted.fileName}`);
        else console.log(`[⚠️] No assignment found to delete for student ${studentId}`);
    } catch (err) {
        console.error(`[⚠️] Failed to delete assignment for student ${studentId}:`, err.message);
    }
}

// =================================================================
// --- Helper Function to Update Attendance CSV ---
// =================================================================
const updateAttendanceCSV = (studentId, date, time, newStatus) => {
    return new Promise((resolve, reject) => {
        const filePath = path.join(__dirname, '../../backend/attendance.csv');
        
        if (!fs.existsSync(filePath)) {
            return reject(new Error("Attendance file not found"));
        }

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                return reject(err);
            }

            const lines = data.split('\n');
            let updated = false;
            const updatedLines = lines.map((line, index) => {
                // Skip empty lines and header
                if (!line.trim() || index === 0) return line;
                
                const fields = line.split(',');
                if (fields.length >= 6) {
                    const lineStudentId = fields[0]?.trim();
                    const lineDate = fields[2]?.trim();
                    const lineTime = fields[3]?.trim();
                    
                    // Match by studentId, date, AND time to ensure unique record
                    if (lineStudentId === studentId && lineDate === date && lineTime === time) {
                        console.log(`📝 Found matching record: ${line}`);
                        fields[5] = newStatus; // Update status (6th field)
                        updated = true;
                        return fields.join(',');
                    }
                }
                return line;
            });

            if (!updated) {
                console.log(`❌ No record found for: ${studentId}, ${date}, ${time}`);
                return reject(new Error("record_not_found"));
            }

            fs.writeFile(filePath, updatedLines.join('\n'), 'utf8', (writeErr) => {
                if (writeErr) {
                    return reject(writeErr);
                }
                console.log(`💾 CSV file updated successfully`);
                resolve(true);
            });
        });
    });
};
// =================================================================
// --- Refactored Routes ---
// =================================================================

// FETCH FILES ROUTE (Refactored)
router.post("/fetch-file-path", async (req, res) => {
    console.log("------ [FETCH FILE PATH API HIT] ------");
    const { student_id, fileCategory } = req.body;
    const authToken = req.headers.authorization?.split(" ")[1];

    if (!authToken || !student_id || !fileCategory) {
        return res.status(400).json({ status: "error", message: "Missing required fields" });
    }

    try {
        const fetchScript = path.join(__dirname, "../../model/fetch_file.py");
        const result = await runPythonScript(fetchScript, [student_id, fileCategory, authToken]);
        
        res.json({
            status: "success",
            message: "Files fetched successfully",
            files: result.files
        });

    } catch (error) {
        res.status(400).json({
            status: "error",
            message: getFriendlyErrorMessage(error.message)
        });
    }
});

// COMPARE HANDWRITING ROUTE (Refactored)
router.get("/compare-handwriting/:studentId", async (req, res) => {
    const { studentId } = req.params;
    const authToken = req.headers.authorization?.split(" ")[1];

    if (!authToken || !studentId) {
        return res.status(400).json({ status: "error", message: "Missing student ID or token" });
    }

    try {
        const fetchScript = path.join(__dirname, "../../model/fetch_file.py");
        const compareScript = path.join(__dirname, "../../model/compare_handwriting.py");

        console.log(`[Step 1/2] Fetching files for student: ${studentId}`);
        const fetchResult = await runPythonScript(fetchScript, [studentId, "all", authToken]);

        // Stop if fetch fails or warning
        if (fetchResult.status !== "success") {
            await deleteAssignmentFromDB(studentId);
            return res.status(400).json({
                status: fetchResult.status || "error",
                message: fetchResult.message || "File fetch failed. Assignment deleted.",
                ...fetchResult
            });
        }

        console.log(`[Step 2/2] Comparing handwriting for student: ${studentId}`);
        const compareResult = await runPythonScript(compareScript, ["--student_id", studentId]);

        if (compareResult.status !== "success" || !compareResult.matched) {
            await deleteAssignmentFromDB(studentId);
            return res.status(400).json({
                status: compareResult.status || "error",
                message: compareResult.message || "Handwriting mismatch. Assignment deleted.",
                ...compareResult
            });
        }

        // Success → keep assignment
        return res.json({
            status: "success",
            message: "Handwriting comparison completed successfully",
            ...compareResult
        });

    } catch (error) {
        console.error(`[🔥 Error] Compare handwriting failed for student ${studentId}:`, error.message);
        await deleteAssignmentFromDB(studentId);
        return res.status(500).json({
            status: "error",
            message: error.message || "Unexpected server error. Assignment deleted."
        });
    }
});

// ---------------------------
// NEW ROUTE: Register Student with Face (FIXED TEMP CLEANUP)
// ---------------------------
router.post("/register-face", async (req, res) => {
    console.log("------ [FACE REGISTRATION API HIT] ------");
    
    const { student_id = '', name = '', image = '' } = req.body;
    const authToken = req.headers.authorization?.split(" ")[1] || '';

    // Enhanced validation with specific error messages
    const missingFields = [];
    if (!authToken) missingFields.push('authorization');
    if (!student_id) missingFields.push('student_id');
    if (!name) missingFields.push('name');
    if (!image) missingFields.push('image');

    if (missingFields.length > 0) {
        return res.status(400).json({ 
            success: false,
            message: "Missing required fields",
            missing_fields: missingFields,
            required_fields: ["authorization", "student_id", "name", "image"]
        });
    }

    // More comprehensive image format validation
    const validImageRegex = /^data:image\/(jpeg|jpg|png);base64,/;
    if (!validImageRegex.test(image)) {
        return res.status(400).json({
            success: false,
            message: "Invalid image format. Only JPEG/JPG/PNG base64 supported",
            supported_formats: ["image/jpeg", "image/jpg", "image/png"]
        });
    }

    // Create temp directory if it doesn't exist
    const tempDir = path.join(__dirname, "../../backend/temp");
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempImagePath = path.join(tempDir, `${student_id}_${Date.now()}.${image.split(';')[0].split('/')[1]}`);
    let tempFileCreated = false;
    
    try {
        // Validate Python script existence
        const pythonScript = path.join(__dirname, "../../model_for_face/face_recognition_system.py");
        if (!fs.existsSync(pythonScript)) {
            throw new Error("Face recognition system not found at: " + pythonScript);
        }

        // Save image with proper buffer handling
        const base64Data = image.replace(validImageRegex, "");
        await fs.promises.writeFile(tempImagePath, base64Data, 'base64');
        tempFileCreated = true;

        // Validate the image was written successfully
        const stats = await fs.promises.stat(tempImagePath);
        if (stats.size === 0) {
            throw new Error("Failed to save image file");
        }

        // Construct arguments with validation
        const args = [
            "register",
            student_id.trim(),
            name.trim(),
            tempImagePath,
            authToken
        ];

        console.log(`🔍 Executing: python ${pythonScript} register ${student_id} [name] [image_path] [token_redacted]`);

        const result = await new Promise((resolve, reject) => {
            const child = execFile("python", [pythonScript, ...args], { timeout: 90000 }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`🐍 Python Error (${error.code}): ${stderr || error.message}`);
                    const errorMsg = error.code === 'ETIMEDOUT' 
                        ? "Face recognition process timed out"
                        : `Face registration failed: ${stderr || error.message}`;
                    reject(new Error(errorMsg));
                } else {
                    try {
                        const output = stdout.trim();
                        if (!output) {
                            throw new Error("Empty response from Python script");
                        }
                        resolve(JSON.parse(output));
                    } catch (e) {
                        console.error("Failed to parse Python output:", stdout);
                        reject(new Error("Invalid JSON response from Python script"));
                    }
                }
            });

            child.on('exit', (code) => {
                if (code !== 0) {
                    console.error(`Python process exited with code ${code}`);
                }
            });
        });

        // Validate Python script response structure
        if (typeof result.success !== 'boolean') {
            throw new Error("Invalid response format from face recognition system");
        }

        // Clean up temp file after successful execution
        if (tempFileCreated) {
            fs.unlink(tempImagePath, (err) => {
                if (err) console.error("Temp file cleanup error:", err.message);
                else console.log("✅ Temp file cleaned up successfully");
            });
        }

        res.status(result.success ? 200 : 400).json({
            success: result.success,
            message: result.message || (result.success ? "Face registered successfully" : "Face registration failed"),
            data: result.data || null
        });

    } catch (error) {
        // Clean up temp file in case of error
        if (tempFileCreated) {
            fs.unlink(tempImagePath, (err) => {
                if (err) console.error("Error cleaning up temp file:", err.message);
                else console.log("✅ Temp file cleaned up after error");
            });
        }
        
        console.error("🚨 System Error:", error.message);
        res.status(500).json({
            success: false,
            message: error.message,
            error_type: error.constructor.name,
            system_error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
// ---------------------------
// Optimized Attendance Route (FIXED TEMP CLEANUP)
// ---------------------------
router.post("/take-attendance", async (req, res) => {
    console.log("------ [FACE ATTENDANCE API HIT] ------");
    
    const { subject = '', image = '', date = '' } = req.body; // Add date here
    const authToken = req.headers.authorization?.split(" ")[1] || '';

    // Detailed validation - add date validation
    const missingFields = [];
    if (!authToken) missingFields.push('authorization');
    if (!subject) missingFields.push('subject');
    if (!image) missingFields.push('image');
    if (!date) missingFields.push('date'); // Validate date

    if (missingFields.length > 0) {
        return res.status(400).json({
            success: false,
            message: "Missing required fields",
            missing_fields: missingFields,
            required_fields: ["authorization", "subject", "image", "date"]
        });
    }

    // Enhanced image validation
    const validImageRegex = /^data:image\/(jpeg|jpg|png);base64,/;
    if (!validImageRegex.test(image)) {
        return res.status(400).json({
            success: false,
            message: "Invalid image format. Only JPEG/JPG/PNG base64 supported",
            supported_formats: ["image/jpeg", "image/jpg", "image/png"]
        });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
        return res.status(400).json({
            success: false,
            message: "Invalid date format. Please use YYYY-MM-DD"
        });
    }

    // Ensure temp directory exists
    const tempDir = path.join(__dirname, "../../backend/temp");
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileExtension = image.split(';')[0].split('/')[1];
    const tempImagePath = path.join(tempDir, `attendance_${Date.now()}.${fileExtension}`);
    let tempFileCreated = false;

    try {
        // Verify Python script with absolute path
        const pythonScript = path.join(__dirname, "../../model_for_face/face_recognition_system.py");
        if (!fs.existsSync(pythonScript)) {
            throw new Error(`Attendance system not found at: ${pythonScript}`);
        }

        // Save image with validation
        const base64Data = image.replace(validImageRegex, "");
        await fs.promises.writeFile(tempImagePath, base64Data, 'base64');
        tempFileCreated = true;
        
        // Verify image was saved
        const stats = await fs.promises.stat(tempImagePath);
        if (stats.size === 0) {
            throw new Error("Failed to save attendance image");
        }

        // Construct arguments with input sanitization - ADD DATE ARGUMENT
        const args = [
            "attendance",
            subject.trim(),
            tempImagePath,
            date.trim(), // Add the date as an argument
            authToken
        ];

        console.log(`🔍 Executing: python ${pythonScript} attendance ${subject} [image_path] ${date} [token_redacted]`);

        const result = await new Promise((resolve, reject) => {
            const child = execFile(
                "python", 
                [pythonScript, ...args], 
                { timeout: 30000 },
                (error, stdout, stderr) => {
                    if (error) {
                        const errorMsg = error.code === 'ETIMEDOUT' 
                            ? "Attendance process timed out"
                            : `Attendance failed: ${stderr || error.message}`;
                        console.error(`🐍 Python Error (${error.code}): ${errorMsg}`);
                        reject(new Error(errorMsg));
                    } else {
                        try {
                            const output = stdout.trim();
                            if (!output) throw new Error("Empty response from Python script");
                            resolve(JSON.parse(output));
                        } catch (e) {
                            console.error("Failed to parse Python output:", stdout);
                            reject(new Error("Invalid response from attendance system"));
                        }
                    }
                }
            );

            child.on('exit', (code) => {
                if (code !== 0) {
                    console.error(`Python process exited with code ${code}`);
                }
            });
        });

        // Validate and standardize response
        if (typeof result.success !== 'boolean') {
            throw new Error("Invalid response structure from attendance system");
        }

        // Clean up temp file after successful execution
        if (tempFileCreated) {
            fs.unlink(tempImagePath, (err) => {
                if (err) console.error("Failed to cleanup temp image:", err.message);
                else console.log("✅ Attendance temp file cleaned up successfully");
            });
        }

        res.status(result.success ? 200 : 400).json({
            success: result.success,
            message: result.message || (result.success ? "Attendance recorded successfully" : "Failed to record attendance"),
            data: result.data || null,
            recognized: result.recognized || [],
            unrecognized: result.unrecognized || []
        });

    } catch (error) {
        // Clean up temp file in case of error
        if (tempFileCreated) {
            fs.unlink(tempImagePath, (err) => {
                if (err) console.error("Error cleaning up temp file:", err.message);
                else console.log("✅ Temp file cleaned up after error");
            });
        }
        
        console.error("🚨 Attendance Error:", error.message);
        res.status(500).json({
            success: false,
            message: error.message,
            error_type: error.constructor.name,
            system_error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
// ---------------------------
// Update Attendance Status Route (LONG-TERM FIX)
// ---------------------------
router.put("/update-attendance-status", async (req, res) => {
    console.log("------ [UPDATE ATTENDANCE STATUS API HIT] ------");
    console.log("Request Body:", req.body);
    
    const { recordId, status } = req.body;
    const authToken = req.headers.authorization?.split(" ")[1];

    // Validation
    if (!authToken) {
        return res.status(401).json({
            success: false,
            message: "Authorization token required"
        });
    }

    if (!recordId || !status) {
        return res.status(400).json({
            success: false,
            message: "Missing required fields: recordId and status are required"
        });
    }

    if (!['Present', 'Absent'].includes(status)) {
        return res.status(400).json({
            success: false,
            message: "Invalid status value. Must be 'Present' or 'Absent'"
        });
    }

    try {
        // Parse recordId - NEW FORMAT: "studentId_date_hour-minute-second"
        // Example: "123_2025-09-24_22-28-01"
        const parts = recordId.split('_');
        if (parts.length < 3) {
            return res.status(400).json({
                success: false,
                message: "Invalid recordId format. Expected: studentId_date_time-with-hyphens"
            });
        }
        
        const studentId = parts[0];
        const date = parts[1];
        // Reconstruct time: "22-28-01" -> "22:28:01"
        const time = parts[2].replace(/-/g, ':');
        
        console.log(`🔍 Looking for record: ${studentId}, ${date}, ${time}`);
        
        // Update the CSV file
        await updateAttendanceCSV(studentId, date, time, status);
        
        console.log(`✅ Attendance status updated: ${studentId} on ${date} at ${time} -> ${status}`);
        
        res.status(200).json({
            success: true,
            message: "Attendance status updated successfully",
            data: {
                recordId,
                studentId,
                date,
                time,
                status,
                updatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error("🚨 Update Attendance Error:", error.message);
        
        if (error.message === "record_not_found") {
            return res.status(404).json({
                success: false,
                message: "Attendance record not found for the specified student, date, and time"
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to update attendance status",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ---------------------------
// Get Attendance Records for Specific Date (UPDATED _id generation)
// ---------------------------
router.get("/get-attendance", async (req, res) => {
    try {
        const { date } = req.query;

        // Validate date format (YYYY-MM-DD)
        if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({
                success: false,
                message: "Invalid date format. Please use YYYY-MM-DD"
            });
        }

        const filePath = path.join(__dirname, '../../backend/attendance.csv');
        
        if (!fs.existsSync(filePath)) {
            return res.status(200).json({
                success: true,
                records: [],
                message: "Attendance file not found"
            });
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
            return res.status(200).json({
                success: true,
                records: [],
                message: "Attendance file is empty"
            });
        }

        const records = [];
        const startIndex = lines[0].includes('student_id') ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            
            const fields = line.split(',');
            if (fields.length >= 6) {
                const studentId = fields[0]?.trim();
                const recordDate = fields[2]?.trim();
                const time = fields[3]?.trim();
                
                // FIXED: Use hyphens instead of underscores for time
                const _id = `${studentId}_${recordDate}_${time.replace(/:/g, '-')}`.replace(/[^a-zA-Z0-9_-]/g, '_');
                
                const record = {
                    _id,
                    student_id: studentId || 'N/A',
                    name: fields[1]?.trim() || 'N/A',
                    date: recordDate || 'N/A',
                    time: time || 'N/A',
                    subject: fields[4]?.trim() || 'N/A',
                    status: fields[5]?.trim() || 'N/A'
                };
                
                if (!date || record.date === date) {
                    records.push(record);
                }
            }
        }

        res.status(200).json({
            success: true,
            records,
            count: records.length
        });
    } catch (error) {
        console.error("Error processing attendance request:", error);
        res.status(500).json({
            success: false,
            message: "Failed to process attendance records"
        });
    }
});

// ---------------------------
// Get All Attendance Records (UPDATED _id generation)
// ---------------------------
router.get("/get-all-attendance", async (req, res) => {
    try {
        const filePath = path.join(__dirname, '../../backend/attendance.csv');
        
        if (!fs.existsSync(filePath)) {
            return res.status(200).json({
                success: true,
                records: [],
                message: "Attendance file not found"
            });
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split('\n').filter(Boolean);
        
        if (lines.length === 0) {
            return res.status(200).json({
                success: true,
                records: [],
                message: "Attendance file is empty"
            });
        }

        const records = [];
        const startIndex = lines[0].includes('student_id') ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            
            const fields = line.split(',');
            if (fields.length >= 6) {
                const studentId = fields[0]?.trim();
                const recordDate = fields[2]?.trim();
                const time = fields[3]?.trim();
                
                // FIXED: Use hyphens instead of underscores for time
                const _id = `${studentId}_${recordDate}_${time.replace(/:/g, '-')}`.replace(/[^a-zA-Z0-9_-]/g, '_');
                
                records.push({
                    _id,
                    student_id: studentId || 'N/A',
                    name: fields[1]?.trim() || 'N/A',
                    date: recordDate || 'N/A',
                    time: time || 'N/A',
                    subject: fields[4]?.trim() || 'N/A',
                    status: fields[5]?.trim() || 'N/A'
                });
            }
        }

        return res.status(200).json({
            success: true,
            records,
            count: records.length
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to process attendance records",
            error: error.message
        });
    }
});

// ---------------------------
// Get Attendance Statistics
// ---------------------------
// ---------------------------
// Get Attendance Statistics (FIXED)
// ---------------------------
router.get("/attendance-statistics", async (req, res) => {
    try {
        const { date, subject } = req.query; // Optional filters
        
        const filePath = path.join(__dirname, '../../backend/attendance.csv');
        
        if (!fs.existsSync(filePath)) {
            return res.status(200).json({
                success: true,
                statistics: {
                    total: 0,
                    present: 0,
                    absent: 0,
                    presentPercentage: 0,
                    absentPercentage: 0,
                    bySubject: {}
                }
            });
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split('\n').filter(line => line.trim());
        
        if (lines.length <= 1) { // Only header or empty
            return res.status(200).json({
                success: true,
                statistics: {
                    total: 0,
                    present: 0,
                    absent: 0,
                    presentPercentage: 0,
                    absentPercentage: 0,
                    bySubject: {}
                }
            });
        }

        const statistics = {
            total: 0,
            present: 0,
            absent: 0,
            presentPercentage: 0,
            absentPercentage: 0,
            bySubject: {},
            byDate: {}
        };

        const startIndex = lines[0].includes('student_id') ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            
            const fields = line.split(',');
            if (fields.length >= 6) {
                const recordDate = fields[2]?.trim();
                const recordSubject = fields[4]?.trim();
                const status = fields[5]?.trim();
                
                // Apply filters if provided - FIXED: changed subjectFilter to subject
                if (date && recordDate !== date) continue;
                if (subject && recordSubject !== subject) continue;
                
                statistics.total++;
                
                if (status === 'Present') {
                    statistics.present++;
                } else if (status === 'Absent') {
                    statistics.absent++;
                }
                
                // Group by subject
                if (!statistics.bySubject[recordSubject]) {
                    statistics.bySubject[recordSubject] = { total: 0, present: 0, absent: 0 };
                }
                statistics.bySubject[recordSubject].total++;
                if (status === 'Present') statistics.bySubject[recordSubject].present++;
                if (status === 'Absent') statistics.bySubject[recordSubject].absent++;
                
                // Group by date
                if (!statistics.byDate[recordDate]) {
                    statistics.byDate[recordDate] = { total: 0, present: 0, absent: 0 };
                }
                statistics.byDate[recordDate].total++;
                if (status === 'Present') statistics.byDate[recordDate].present++;
                if (status === 'Absent') statistics.byDate[recordDate].absent++;
            }
        }

        // Calculate percentages
        if (statistics.total > 0) {
            statistics.presentPercentage = ((statistics.present / statistics.total) * 100).toFixed(1);
            statistics.absentPercentage = ((statistics.absent / statistics.total) * 100).toFixed(1);
            
            // Calculate percentages for each subject
            Object.keys(statistics.bySubject).forEach(subject => {
                const subjectStats = statistics.bySubject[subject];
                subjectStats.presentPercentage = subjectStats.total > 0 ? ((subjectStats.present / subjectStats.total) * 100).toFixed(1) : "0";
                subjectStats.absentPercentage = subjectStats.total > 0 ? ((subjectStats.absent / subjectStats.total) * 100).toFixed(1) : "0";
            });
            
            // Calculate percentages for each date
            Object.keys(statistics.byDate).forEach(date => {
                const dateStats = statistics.byDate[date];
                dateStats.presentPercentage = dateStats.total > 0 ? ((dateStats.present / dateStats.total) * 100).toFixed(1) : "0";
                dateStats.absentPercentage = dateStats.total > 0 ? ((dateStats.absent / dateStats.total) * 100).toFixed(1) : "0";
            });
        }

        res.status(200).json({
            success: true,
            statistics,
            filters: { date, subject }
        });

    } catch (error) {
        console.error("Error generating statistics:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate attendance statistics"
        });
    }
});
module.exports = router;