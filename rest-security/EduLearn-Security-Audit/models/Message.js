const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    contentText: { type: String, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Message", MessageSchema);
