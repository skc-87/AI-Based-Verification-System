const express = require("express");
const QRCode = require("qrcode");
const Event = require("../models/Event");
const EventPass = require("../models/EventPass");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/authMiddleware");
const router = express.Router();

// Generate unique IDs
const generateEventId = () => `EVT${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
const generatePassId = () => `PASS${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();

// Create Event
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const { title, description, date, time, venue, organizer } = req.body;
    const createdBy = req.user.id;

    // Generate unique event ID
    const eventId = generateEventId();

    // Create QR code data
    const qrData = JSON.stringify({
      eventId: eventId,
      type: "event_info",
      title: title,
      date: date,
      time: time
    });

    // Create event
    const event = await Event.create({
      title,
      description,
      date,
      time,
      venue,
      organizer,
      qrCode: qrData,
      eventId,
      createdBy
    });

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      event: event
    });

  } catch (error) {
    console.error("Event creation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create event"
    });
  }
});

// Generate Passes for Students
router.post("/:eventId/generate-passes", authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { studentIds } = req.body;

    console.log(`Generating passes for event: ${eventId}, students:`, studentIds);

    // Find event by eventId (not _id)
    const event = await Event.findOne({ eventId });
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    const passes = [];
    const errors = [];

    for (const studentId of studentIds) {
      try {
        const student = await User.findById(studentId);
        if (!student) {
          errors.push(`Student not found: ${studentId}`);
          continue;
        }

        // Check if pass already exists
        const existingPass = await EventPass.findOne({ 
          eventId: event._id, 
          studentId 
        });
        
        if (existingPass) {
          passes.push(existingPass);
          continue;
        }

        // Generate unique pass data
        const passData = JSON.stringify({
          eventId: event.eventId,
          passId: generatePassId(),
          studentId: studentId,
          studentName: student.name,
          type: "event_pass"
        });

        // Create event pass
        const pass = await EventPass.create({
          eventId: event._id,
          studentId,
          qrCode: passData,
          passId: JSON.parse(passData).passId
        });

        // Populate student info for response
        const populatedPass = await EventPass.findById(pass._id)
          .populate('studentId', 'name email');

        passes.push(populatedPass);
      } catch (error) {
        console.error(`Error creating pass for student ${studentId}:`, error);
        errors.push(`Failed to create pass for student ${studentId}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Generated ${passes.length} passes successfully`,
      passes: passes,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error("Pass generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate passes"
    });
  }
});

// Validate QR Code
router.post("/validate-qr", authMiddleware, async (req, res) => {
  try {
    const { qrData } = req.body;
    const scannedBy = req.user.id;

    console.log("Validating QR data:", qrData);

    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch (error) {
      return res.status(400).json({
        valid: false,
        message: "Invalid QR code format"
      });
    }

    const { type, eventId, passId } = parsedData;

    if (type === "event_pass") {
      // Validate event pass
      const pass = await EventPass.findOne({ passId })
        .populate('eventId')
        .populate('studentId', 'name email');

      if (!pass) {
        return res.json({
          valid: false,
          message: "Invalid pass"
        });
      }

      if (pass.isUsed) {
        return res.json({
          valid: false,
          message: "Pass already used"
        });
      }

      // Mark pass as used
      pass.isUsed = true;
      pass.usedAt = new Date();
      pass.scannedBy = scannedBy;
      await pass.save();

      return res.json({
        valid: true,
        message: "Pass validated successfully",
        data: {
          studentName: pass.studentId.name,
          studentEmail: pass.studentId.email,
          eventTitle: pass.eventId.title,
          eventDate: pass.eventId.date,
          eventTime: pass.eventId.time,
          venue: pass.eventId.venue
        }
      });
    } else if (type === "event_info") {
      // Event QR (for information)
      const event = await Event.findOne({ eventId });
      if (!event) {
        return res.json({
          valid: false,
          message: "Event not found"
        });
      }

      return res.json({
        valid: true,
        message: "Event QR code",
        data: {
          eventTitle: event.title,
          eventDate: event.date,
          eventTime: event.time,
          venue: event.venue,
          organizer: event.organizer
        }
      });
    } else {
      return res.json({
        valid: false,
        message: "Unknown QR code type"
      });
    }

  } catch (error) {
    console.error("QR validation error:", error);
    res.status(500).json({
      valid: false,
      message: "Validation error"
    });
  }
});

// Get All Events
router.get("/", authMiddleware, async (req, res) => {
  try {
    const events = await Event.find({ createdBy: req.user.id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      events
    });
  } catch (error) {
    console.error("Get events error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch events"
    });
  }
});

// Get Event Passes
router.get("/:eventId/passes", authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const event = await Event.findOne({ eventId });
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    const passes = await EventPass.find({ eventId: event._id })
      .populate('studentId', 'name email')
      .populate('scannedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      passes
    });
  } catch (error) {
    console.error("Get passes error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch passes"
    });
  }
});

// Get All Students for Pass Generation
router.get("/students/list", authMiddleware, async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('_id name email')
      .sort({ name: 1 });

    res.json({
      success: true,
      students
    });
  } catch (error) {
    console.error("Get students error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch students"
    });
  }
});

module.exports = router;