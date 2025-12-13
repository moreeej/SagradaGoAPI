const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  senderId: {
    type: String,
    required: true,
  },
  senderType: {
    type: String,
    enum: ["user", "admin"],
    required: true,
  },
  senderName: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  read: {
    type: Boolean,
    default: false,
  },
});

const ChatSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
    },
    adminId: {
      type: String,
    },
    messages: {
      type: [MessageSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastMessage: {
      type: Date,
      default: Date.now,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const ChatModel = mongoose.model("Chats", ChatSchema);
module.exports = ChatModel;

