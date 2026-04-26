const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema(
  {
    patientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    uploadedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    storedName: { type: String, required: true },
    originalName: { type: String, required: true },
    mime: { type: String, required: true },
    size: { type: Number, required: true },

    // encryption metadata
    ivB64: { type: String, required: true },
    tagB64: { type: String, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Document", DocumentSchema);
