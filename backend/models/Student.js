const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    mobile_number: { type: String, required: true },
    department: { type: String, required: true },
    year: { type: Number, required: true },
    digital_id_qr: { type: String },
    max_books_allowed: { type: Number, default: 3 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);