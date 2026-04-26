const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    contentHtml: { type: String, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Post", PostSchema);
