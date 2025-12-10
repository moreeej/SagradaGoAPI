const { OpenAI } = require("openai");
const ChatModel = require("../models/Chat");

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt for the chatbot
const SYSTEM_PROMPT = `You are SagradaBot, a helpful AI assistant for the Sagrada Familia Parish Information System. You help parishioners with:

1. **Sacraments**: Provide information about booking dates, requirements, and procedures for:
   - Wedding (Minimum booking date: October 17, 2025)
   - Baptism (Minimum booking date: November 1, 2025)
   - Confession (Minimum booking date: September 19, 2025)
   - Anointing of the Sick (Minimum booking date: September 18, 2025)
   - First Communion (Minimum booking date: November 16, 2025)
   - Burial (Minimum booking date: September 20, 2025)
   - Confirmation (Minimum booking date: November 16, 2025)

2. **Donations**: Guide users on how to make donations through the app.

3. **Events**: Inform users about parish events and activities.

4. **Volunteering**: Help users understand how to volunteer for events.

5. **Virtual Tour**: Explain the 360° virtual tour feature.

Be friendly, respectful, and maintain a Christian/Catholic tone. Always provide accurate information based on what's available in the system. If you don't know something, politely direct users to contact the parish office or use the admin chat feature.

Keep responses concise but informative. Use emojis sparingly and appropriately.`;

/**
 * Get AI response for a user message
 * @param {string} userMessage - The user's message
 * @param {string} userId - The user's ID
 * @param {string} sessionId - The chat session ID
 * @returns {Promise<string>} - The AI's response
 */
async function getAIResponse(userMessage, userId, sessionId) {
  try {
    // Retrieve conversation history
    const conversationHistory = await getConversationHistory(userId, sessionId);

    // Prepare messages array with system prompt and conversation history
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user", content: userMessage },
    ];

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const aiResponse = completion.choices[0].message.content;

    // Save conversation to database
    await saveMessage(userId, sessionId, "user", userMessage);
    await saveMessage(userId, sessionId, "assistant", aiResponse);

    return aiResponse;
  } catch (error) {
    console.error("OpenAI API Error:", error);
    
    // Fallback response if API fails
    if (error.code === "insufficient_quota") {
      return "I apologize, but the AI service is currently unavailable due to quota limits. Please try again later or contact the parish office for assistance.";
    }
    
    return "I apologize, but I'm having trouble processing your request right now. Please try again later or use the 'Chat with Admin' feature for immediate assistance.";
  }
}

/**
 * Get conversation history for a user session
 * @param {string} userId - The user's ID
 * @param {string} sessionId - The chat session ID
 * @returns {Promise<Array>} - Array of messages
 */
async function getConversationHistory(userId, sessionId) {
  try {
    const chat = await ChatModel.findOne({
      user_id: userId,
      session_id: sessionId,
      is_active: true,
    })
      .sort({ "messages.timestamp": 1 })
      .limit(1);

    if (!chat || !chat.messages || chat.messages.length === 0) {
      return [];
    }

    // Return last 10 messages to keep context manageable
    return chat.messages.slice(-10).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  } catch (error) {
    console.error("Error fetching conversation history:", error);
    return [];
  }
}

/**
 * Save a message to the database
 * @param {string} userId - The user's ID
 * @param {string} sessionId - The chat session ID
 * @param {string} role - The message role (user or assistant)
 * @param {string} content - The message content
 */
async function saveMessage(userId, sessionId, role, content) {
  try {
    let chat = await ChatModel.findOne({
      user_id: userId,
      session_id: sessionId,
      is_active: true,
    });

    if (!chat) {
      chat = new ChatModel({
        user_id: userId,
        session_id: sessionId,
        messages: [],
      });
    }

    chat.messages.push({
      role,
      content,
      timestamp: new Date(),
    });

    await chat.save();
  } catch (error) {
    console.error("Error saving message:", error);
  }
}

/**
 * Create a new chat session
 * @param {string} userId - The user's ID
 * @param {string} sessionId - The chat session ID
 */
async function createChatSession(userId, sessionId) {
  try {
    const existingChat = await ChatModel.findOne({
      user_id: userId,
      session_id: sessionId,
      is_active: true,
    });

    if (!existingChat) {
      const newChat = new ChatModel({
        user_id: userId,
        session_id: sessionId,
        messages: [],
        is_active: true,
      });
      await newChat.save();
    }
  } catch (error) {
    console.error("Error creating chat session:", error);
  }
}

/**
 * End a chat session
 * @param {string} userId - The user's ID
 * @param {string} sessionId - The chat session ID
 */
async function endChatSession(userId, sessionId) {
  try {
    await ChatModel.updateOne(
      {
        user_id: userId,
        session_id: sessionId,
        is_active: true,
      },
      {
        is_active: false,
      }
    );
  } catch (error) {
    console.error("Error ending chat session:", error);
  }
}

/**
 * Get chat history for a user
 * @param {string} userId - The user's ID
 * @param {string} sessionId - Optional session ID
 * @returns {Promise<Array>} - Array of chat messages
 */
async function getChatHistory(userId, sessionId = null) {
  try {
    const query = {
      user_id: userId,
      is_active: true,
    };

    if (sessionId) {
      query.session_id = sessionId;
    }

    const chats = await ChatModel.find(query).sort({ "messages.timestamp": 1 });

    if (!chats || chats.length === 0) {
      return [];
    }

    // If sessionId is provided, return messages from that session
    if (sessionId) {
      return chats[0].messages || [];
    }

    // Otherwise, return all messages from all sessions
    const allMessages = [];
    chats.forEach((chat) => {
      chat.messages.forEach((msg) => {
        allMessages.push({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          session_id: chat.session_id,
        });
      });
    });

    return allMessages.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return [];
  }
}

module.exports = {
  getAIResponse,
  getConversationHistory,
  saveMessage,
  createChatSession,
  endChatSession,
  getChatHistory,
};

