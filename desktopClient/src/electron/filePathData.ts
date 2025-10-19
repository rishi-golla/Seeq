import mongoose from "mongoose";

const FileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  path: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: String,
    required: true, // e.g., "pdf", "docx", "txt"
  },
  description: {
    type: String,
    default: "",
  },
  tags: {
    type: [String], // e.g., ["lecture", "assignment", "math"]
    index: true, // makes search faster
  },
  size: {
    type: Number,
  },
  lastModified: {
    type: Date,
  },
}, { timestamps: true });

export default mongoose.model("File", FileSchema);
