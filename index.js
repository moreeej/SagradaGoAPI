// require("dotenv").config();
// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");
// const allRoutes = require("./routes/routes");

// const MONGO_URL = process.env.MONGO;

// const app = express();
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// const data = ["jerome", "bryan", "virgo", "gege"];
// app.get("/api/tryserver", (req, res) => {
//   res.json({ message: data });
// });

// mongoose.connect(MONGO_URL, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
// .then(() => console.log("Connected to MongoDB Atlas"))
// .catch(err => console.error("MongoDB connection error:", err));

// app.use("/api", allRoutes);

// app.listen(8080, () => {
//   console.log("Server running on port 8080");
// });


require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");
const allRoutes = require("./routes/routes");
const ChatController = require("./controllers/ChatController");
const ChatModel = require("./models/Chat");

const MONGO_URL = process.env.MONGO;

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const data = ["jerome", "bryan", "virgo", "gege"];
app.get("/api/tryserver", (req, res) => {
  res.json({ message: data });
});

mongoose.connect(MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch(err => console.error("MongoDB connection error:", err));

app.use("/api", allRoutes);

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join a room based on userId or admin
  socket.on("join-room", async ({ userId, userType, userName }) => {
    const roomId = userType === "admin" ? "admin-room" : `user-${userId}`;
    socket.join(roomId);
    socket.userId = userId;
    socket.userType = userType;
    socket.userName = userName;
    
    console.log(`${userName} (${userType}) joined room: ${roomId}`);
    
    // If admin, send list of active chats
    if (userType === "admin") {
      try {
        const chats = await ChatModel.find({ isActive: true })
          .sort({ lastMessage: -1 })
          .exec();
        socket.emit("chat-list", { chats });
      } catch (error) {
        console.error("Error fetching chats for admin:", error);
      }
    }
  });

  // Handle new message
  socket.on("send-message", async ({ userId, message, senderId, senderType, senderName }) => {
    try {
      // Save message to database
      const chat = await ChatController.addMessage(
        senderId,
        senderType,
        senderName,
        userId,
        message
      );

      // Get the last message (the one just added)
      const lastMessage = chat.messages[chat.messages.length - 1];

      // Send message to the specific user room (for admin messages to user)
      if (senderType === "admin") {
        io.to(`user-${userId}`).emit("receive-message", {
          message: {
            _id: lastMessage._id,
            senderId,
            senderType,
            senderName,
            message,
            timestamp: lastMessage.timestamp,
            seenAt: lastMessage.seenAt || null,
          },
        });
      } else {
        // For user messages, send confirmation back to user with proper _id
        io.to(`user-${userId}`).emit("message-sent", {
          message: {
            _id: lastMessage._id,
            senderId,
            senderType,
            senderName,
            message,
            timestamp: lastMessage.timestamp,
            seenAt: lastMessage.seenAt || null,
          },
        });
      }

      // Notify admin room about new message
      io.to("admin-room").emit("new-message", {
        chat,
        message: {
          _id: lastMessage._id,
          senderId,
          senderType,
          senderName,
          message,
          timestamp: lastMessage.timestamp,
          seenAt: lastMessage.seenAt || null,
        },
      });

      // Update chat list for admin
      const chats = await ChatModel.find({ isActive: true })
        .sort({ lastMessage: -1 })
        .exec();
      io.to("admin-room").emit("chat-list", { chats });
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // Handle admin selecting a chat
  socket.on("select-chat", async ({ userId }) => {
    try {
      const chat = await ChatModel.findOne({ userId, isActive: true });
      
      if (chat) {
        // If admin is selecting chat, mark user messages as seen
        if (socket.userType === "admin") {
          const now = new Date();
          let hasUpdates = false;
          
          chat.messages.forEach((msg) => {
            if (msg.senderType === "user" && !msg.seenAt) {
              msg.seenAt = now;
              hasUpdates = true;
            }
          });
          
          if (hasUpdates) {
            await chat.save();
            // Notify user that their messages were seen
            io.to(`user-${userId}`).emit("messages-seen", {
              userId,
              seenAt: now,
            });
          }
        }
        
        socket.emit("selected-chat", { chat });
      } else {
        socket.emit("selected-chat", { chat: null });
      }
    } catch (error) {
      console.error("Error selecting chat:", error);
      socket.emit("error", { message: "Failed to load chat" });
    }
  });

  // Handle mark as seen event
  socket.on("mark-as-seen", async ({ userId, viewerType }) => {
    try {
      const chat = await ChatModel.findOne({ userId, isActive: true });
      
      if (!chat) {
        return socket.emit("error", { message: "Chat not found" });
      }

      const now = new Date();
      let updatedMessageIds = [];
      let hasUpdates = false;

      // Mark messages as seen based on viewer type
      chat.messages.forEach((msg) => {
        if (viewerType === "admin" && msg.senderType === "user") {
          if (!msg.seenAt) {
            msg.seenAt = now;
            updatedMessageIds.push(msg._id.toString());
            hasUpdates = true;
          }
        } else if (viewerType === "user" && msg.senderType === "admin") {
          if (!msg.seenAt) {
            msg.seenAt = now;
            updatedMessageIds.push(msg._id.toString());
            hasUpdates = true;
          }
        }
      });

      if (hasUpdates) {
        await chat.save();
        
        // Notify the other party that messages were seen
        if (viewerType === "admin") {
          io.to(`user-${userId}`).emit("messages-seen", {
            userId,
            seenAt: now,
            messageIds: updatedMessageIds,
          });
        } else if (viewerType === "user") {
          io.to("admin-room").emit("messages-seen", {
            userId,
            seenAt: now,
            messageIds: updatedMessageIds,
          });
        }

        // Update the chat list for admin
        if (viewerType === "user") {
          const chats = await ChatModel.find({ isActive: true })
            .sort({ lastMessage: -1 })
            .exec();
          io.to("admin-room").emit("chat-list", { chats });
        }
      }

      socket.emit("seen-updated", {
        success: true,
        updatedMessageIds,
      });
    } catch (error) {
      console.error("Error marking messages as seen:", error);
      socket.emit("error", { message: "Failed to mark messages as seen" });
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO server ready`);
});

