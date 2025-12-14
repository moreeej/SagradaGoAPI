const ChatModel = require("../models/Chat");
const UserModel = require("../models/User");
const AdminModel = require("../models/Admin");
const AIService = require("../services/AIService");

// Get or create a chat for a user
exports.getOrCreateChat = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    let chat = await ChatModel.findOne({ userId, isActive: true });

    if (!chat) {
      // Get user info
      const user = await UserModel.findOne({ uid: userId, is_deleted: false });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create new chat
      chat = new ChatModel({
        userId: user.uid,
        userName: `${user.first_name} ${user.last_name}`,
        userEmail: user.email,
        messages: [],
        isActive: true,
      });

      await chat.save();
    }

    res.json({ chat });
  } catch (error) {
    console.error("Error getting or creating chat:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Get all active chats (for admin)
exports.getAllChats = async (req, res) => {
  try {
    const chats = await ChatModel.find({ isActive: true })
      .sort({ lastMessage: -1 })
      .exec();

    res.json({ chats });
  } catch (error) {
    console.error("Error getting all chats:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Get chat by userId
exports.getChatByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const chat = await ChatModel.findOne({ userId, isActive: true });

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    res.json({ chat });
  } catch (error) {
    console.error("Error getting chat by userId:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Add message to chat
exports.addMessage = async (senderId, senderType, senderName, userId, message) => {
  try {
    let chat = await ChatModel.findOne({ userId, isActive: true });

    if (!chat) {
      // Get user info if chat doesn't exist
      const user = await UserModel.findOne({ uid: userId, is_deleted: false });
      
      if (!user) {
        throw new Error("User not found");
      }

      chat = new ChatModel({
        userId: user.uid,
        userName: `${user.first_name} ${user.last_name}`,
        userEmail: user.email,
        messages: [],
        isActive: true,
      });
    }

    // Add message
    const newMessage = {
      senderId,
      senderType,
      senderName,
      message,
      timestamp: new Date(),
      read: false,
    };

    chat.messages.push(newMessage);
    chat.lastMessage = new Date();

    // Update unread count if message is from user
    if (senderType === "user") {
      chat.unreadCount = (chat.unreadCount || 0) + 1;
    } else if (senderType === "admin") {
      // Reset unread count when admin sends message
      chat.unreadCount = 0;
    }

    await chat.save();
    return chat;
  } catch (error) {
    console.error("Error adding message:", error);
    throw error;
  }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
  try {
    const { userId } = req.body;

    const chat = await ChatModel.findOne({ userId, isActive: true });

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Mark all user messages as read
    chat.messages.forEach((msg) => {
      if (msg.senderType === "user") {
        msg.read = true;
      }
    });

    chat.unreadCount = 0;
    await chat.save();

    res.json({ message: "Messages marked as read", chat });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Get unread count for admin
exports.getUnreadCount = async (req, res) => {
  try {
    const chats = await ChatModel.find({ isActive: true });
    const totalUnread = chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);

    res.json({ unreadCount: totalUnread });
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// AI Chatbot endpoint
exports.getAIResponse = async (req, res) => {
  try {
    const { userId, message } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "message is required" });
    }

    // Get AI response
    const aiResponse = await AIService.getAIResponse(message.trim(), userId);

    res.json({ 
      message: aiResponse,
      success: true 
    });
  } catch (error) {
    console.error("Error getting AI response:", error);
    res.status(500).json({ 
      message: "Internal server error", 
      error: error.message,
      success: false 
    });
  }
};

// Get AI chat history
exports.getAIChatHistory = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const history = await AIService.getChatHistory(userId);

    res.json({ 
      history,
      success: true 
    });
  } catch (error) {
    console.error("Error getting AI chat history:", error);
    res.status(500).json({ 
      message: "Internal server error", 
      error: error.message,
      success: false 
    });
  }
};

// Clear AI chat history
exports.clearAIChatHistory = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    await AIService.clearChatHistory(userId);

    res.json({ 
      message: "Chat history cleared successfully",
      success: true 
    });
  } catch (error) {
    console.error("Error clearing AI chat history:", error);
    res.status(500).json({ 
      message: "Internal server error", 
      error: error.message,
      success: false 
    });
  }
};



