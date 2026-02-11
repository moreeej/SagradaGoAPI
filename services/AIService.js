const mongoose = require("mongoose");
const axios = require("axios");

// Initialize Google Gemini client
let GoogleGenerativeAI;
let genAI;
let geminiApiKey;

try {
  GoogleGenerativeAI = require("@google/generative-ai").GoogleGenerativeAI;
  geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (geminiApiKey) {
    genAI = new GoogleGenerativeAI(geminiApiKey);
  } else {
    console.warn("GEMINI_API_KEY not found in environment variables");
  }
} catch (error) {
  console.error("Failed to load @google/generative-ai package. Please install it: npm install @google/generative-ai");
  console.error("Error:", error.message);
}

/**
 * List available models for the API key
 */
let cachedAvailableModels = null;
async function getAvailableModels() {
  if (cachedAvailableModels) {
    return cachedAvailableModels;
  }

  if (!geminiApiKey) {
    return [];
  }

  try {
    // Try v1 API first
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1/models?key=${geminiApiKey}`,
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    if (response.data && response.data.models) {
      const models = response.data.models
        .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
        .map(m => m.name.replace("models/", ""));
      cachedAvailableModels = models;
      console.log("Available models:", models);
      return models;
    }
  } catch (error) {
    console.log("Failed to list models from v1 API, trying v1beta:", error.response?.status || error.message);
    
    // Try v1beta as fallback
    try {
      const response = await axios.get(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`,
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      if (response.data && response.data.models) {
        const models = response.data.models
          .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
          .map(m => m.name.replace("models/", ""));
        cachedAvailableModels = models;
        console.log("Available models (v1beta):", models);
        return models;
      }
    } catch (betaError) {
      console.error("Failed to list models from v1beta API:", betaError.response?.status || betaError.message);
    }
  }

  return [];
}

/**
 * Try to get AI response using REST API directly (fallback method)
 */
async function getAIResponseViaREST(userMessage, userId, conversationHistory) {
  if (!geminiApiKey) {
    throw new Error("API key not configured");
  }

  // Get available models first
  const availableModels = await getAvailableModels();
  
  if (availableModels.length === 0) {
    // If we can't list models, try common free tier models
    console.log("Could not list models, trying common free tier models");
    const fallbackModels = ["gemini-pro", "models/gemini-pro"];
    
    for (const modelName of fallbackModels) {
      try {
        // Try v1 API
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1/${modelName}:generateContent?key=${geminiApiKey}`,
          {
            contents: [{
              parts: [{ text: SYSTEM_PROMPT + "\n\nUser: " + userMessage + "\nAssistant:" }]
            }]
          },
          {
            headers: {
              "Content-Type": "application/json"
            }
          }
        );

        if (response.data && response.data.candidates && response.data.candidates[0]) {
          const aiResponse = response.data.candidates[0].content.parts[0].text;
          await saveMessage(userId, "user", userMessage);
          await saveMessage(userId, "assistant", aiResponse);
          console.log(`Successfully used REST API with model: ${modelName}`);
          return aiResponse;
        }
      } catch (error) {
        console.log(`REST API model ${modelName} failed:`, error.response?.status || error.message);
        continue;
      }
    }
    
    throw new Error("No available models found");
  }

  // Build the prompt
  let fullPrompt = SYSTEM_PROMPT + "\n\n";
  conversationHistory.forEach((msg) => {
    if (msg.role === "user") {
      fullPrompt += `User: ${msg.content}\n`;
    } else if (msg.role === "assistant") {
      fullPrompt += `Assistant: ${msg.content}\n`;
    }
  });
  fullPrompt += `User: ${userMessage}\nAssistant:`;

  // Try each available model
  for (const modelName of availableModels) {
    // Try both v1 and v1beta
    const apiVersions = ["v1", "v1beta"];
    
    for (const version of apiVersions) {
      try {
        const url = `https://generativelanguage.googleapis.com/${version}/models/${modelName}:generateContent?key=${geminiApiKey}`;
        const response = await axios.post(
          url,
          {
            contents: [{
              parts: [{ text: fullPrompt }]
            }]
          },
          {
            headers: {
              "Content-Type": "application/json"
            }
          }
        );

        if (response.data && response.data.candidates && response.data.candidates[0]) {
          const aiResponse = response.data.candidates[0].content.parts[0].text;
          await saveMessage(userId, "user", userMessage);
          await saveMessage(userId, "assistant", aiResponse);
          console.log(`Successfully used REST API with model: ${modelName} (${version})`);
          return aiResponse;
        }
      } catch (error) {
        console.log(`REST API ${version}/${modelName} failed:`, error.response?.status || error.message);
        continue;
      }
    }
  }

  throw new Error("All REST API endpoints failed");
}

// AI Chat Model - separate from admin chat
const AIChatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["user", "assistant"],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const AIChatSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    messages: {
      type: [AIChatMessageSchema],
      default: [],
    },
    lastMessage: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const AIChatModel = mongoose.models.AIChat || mongoose.model("AIChat", AIChatSchema);

// Enhanced system prompt with all chatbot knowledge
const SYSTEM_PROMPT = `You are SagradaBot, a helpful AI assistant for the Sagrada Familia Parish Information System. You help parishioners with information about the parish and its services.

**SACRAMENTS AND BOOKING INFORMATION:**

1. **Wedding**
   - Minimum booking date: October 17, 2025
   - Requirements: Valid marriage license, Baptismal certificate, Confirmation certificate, Pre-marriage seminar certificate, Parental consent (if applicable)

2. **Baptism**
   - Minimum booking date: November 1, 2025
   - Requirements: Birth certificate, Parent's marriage certificate, Godparent's confirmation certificate, Baptismal seminar attendance

3. **Confession**
   - Minimum booking date: September 19, 2025
   - Requirements: No special requirements, Come with a contrite heart, Examination of conscience

4. **Anointing of the Sick**
   - Minimum booking date: September 18, 2025
   - Requirements: Medical certificate (if applicable), Family member or guardian present, Contact parish office for scheduling

5. **First Communion**
   - Minimum booking date: November 16, 2025
   - Requirements: Baptismal certificate, First Communion preparation completion, Parent/guardian consent, Regular attendance at catechism classes

6. **Burial**
   - Minimum booking date: September 20, 2025
   - Requirements: Death certificate, Baptismal certificate of deceased, Family contact information, Preferred date and time

7. **Confirmation**
   - Minimum booking date: November 16, 2025
   - Requirements: Baptismal certificate, First Communion certificate, Confirmation preparation completion, Sponsor's confirmation certificate, Regular attendance at catechism classes

**OTHER SERVICES:**
- **Donations**: Users can make donations through the Donations section in the app
- **Events**: Users can view parish events in the Events section
- **Volunteering**: Users can volunteer through the Events section of the app
- **Virtual Tour**: The app provides a 360° virtual tour feature to explore the church

**GUIDELINES:**
- Be friendly, respectful, and maintain a Christian/Catholic tone
- Always provide accurate information based on what's available in the system
- If you don't know something, politely direct users to contact the parish office or use the "Chat with Admin" feature
- Keep responses concise but informative
- Use emojis sparingly and appropriately (🙏 is acceptable)
- When users ask about booking dates, provide the minimum booking dates for all sacraments
- When users ask about requirements, provide detailed requirements for the specific sacrament they're interested in`;

/**
 * Get AI response for a user message
 * @param {string} userMessage - The user's message
 * @param {string} userId - The user's ID
 * @returns {Promise<string>} - The AI's response
 */
async function getAIResponse(userMessage, userId) {
  // Declare modelName outside try block so it's accessible in catch
  let modelName = process.env.GEMINI_MODEL || "";
  
  try {
    // Retrieve conversation history first
    const conversationHistory = await getConversationHistory(userId);

    // Try REST API first since SDK models are not working
    console.log("Trying REST API first...");
    try {
      const aiResponse = await getAIResponseViaREST(userMessage, userId, conversationHistory);
      return aiResponse;
    } catch (restError) {
      console.log("REST API failed, trying SDK:", restError.message);
    }

    // Fallback to SDK if REST API fails
    // Check if Gemini is properly initialized
    if (!genAI) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return "I apologize, but the AI service is not properly configured. Please contact the parish office for assistance.";
      }
      if (!GoogleGenerativeAI) {
        return "I apologize, but the AI service package is not installed. Please contact the administrator.";
      }
      genAI = new GoogleGenerativeAI(apiKey);
    }

    // Get the model - try different model names that are actually available
    if (!modelName) {
      // Try these models in order of preference (using valid models)
      const availableModels = [
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash-lite", 
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-2.5-pro"
      ];
      modelName = availableModels[0]; // Start with the most likely to work
    }
    
    const model = genAI.getGenerativeModel({ 
      model: modelName
    });

    // Build the conversation history for Gemini
    // Gemini uses a different format - we need to combine system prompt with history
    let fullPrompt = SYSTEM_PROMPT + "\n\n";
    
    // Add conversation history
    conversationHistory.forEach((msg) => {
      if (msg.role === "user") {
        fullPrompt += `User: ${msg.content}\n`;
      } else if (msg.role === "assistant") {
        fullPrompt += `Assistant: ${msg.content}\n`;
      }
    });
    
    // Add current user message
    fullPrompt += `User: ${userMessage}\nAssistant:`;

    // Call Gemini API
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const aiResponse = response.text();

    // Save conversation to database
    await saveMessage(userId, "user", userMessage);
    await saveMessage(userId, "assistant", aiResponse);

    return aiResponse;
  } catch (error) {
    // Log error for debugging (but don't expose to user)
    console.error("Gemini API Error:", {
      code: error.code,
      status: error.status,
      message: error.message,
      statusCode: error.statusCode
    });
    
    // Check for quota/rate limit errors
    const errorCode = error.code;
    const statusCode = error.status || error.statusCode;
    const errorMessage = error.message || "";
    
    // Check for quota exceeded errors
    if (statusCode === 429 ||
        errorCode === "RESOURCE_EXHAUSTED" ||
        errorMessage.toLowerCase().includes("quota") ||
        errorMessage.toLowerCase().includes("rate limit") ||
        errorMessage.toLowerCase().includes("exceeded") ||
        errorMessage.toLowerCase().includes("resource exhausted")) {
      console.log("Quota exceeded - returning fallback message");
      return "I apologize, but the AI service is currently unavailable due to quota limits. Please try again later or contact the parish office for assistance. You can also use the 'Chat with Admin' feature for immediate help.";
    }
    
    // Check for model not found errors
    if (statusCode === 404 || 
        errorMessage.toLowerCase().includes("not found") ||
        errorMessage.toLowerCase().includes("not supported") ||
        errorMessage.toLowerCase().includes("listmodels")) {
      console.log("Model not found - trying alternative models");
      
      // Try different model names that might work (using valid models)
      const fallbackModels = [
        "gemini-2.0-flash-exp",
        "gemini-1.5-flash-8b",
        "gemini-exp-1206"
      ];
      
      // Remove the model that already failed (if we know which one)
      const failedModel = modelName || "";
      const modelsToTry = failedModel ? fallbackModels.filter(m => m !== failedModel) : fallbackModels;
      
      for (const fallbackModelName of modelsToTry) {
        try {
          console.log(`Trying model: ${fallbackModelName}`);
          const fallbackModel = genAI.getGenerativeModel({ model: fallbackModelName });
          const conversationHistory = await getConversationHistory(userId);
          let fullPrompt = SYSTEM_PROMPT + "\n\n";
          conversationHistory.forEach((msg) => {
            if (msg.role === "user") {
              fullPrompt += `User: ${msg.content}\n`;
            } else if (msg.role === "assistant") {
              fullPrompt += `Assistant: ${msg.content}\n`;
            }
          });
          fullPrompt += `User: ${userMessage}\nAssistant:`;
          
          const result = await fallbackModel.generateContent(fullPrompt);
          const response = await result.response;
          const aiResponse = response.text();
          await saveMessage(userId, "user", userMessage);
          await saveMessage(userId, "assistant", aiResponse);
          console.log(`Successfully used model: ${fallbackModelName}`);
          return aiResponse;
        } catch (fallbackError) {
          console.error(`Model ${fallbackModelName} failed:`, fallbackError.message);
          continue; // Try next model
        }
      }
      
      // If all SDK models failed, try REST API as last resort
      console.log("All SDK models failed, trying REST API");
      try {
        const conversationHistory = await getConversationHistory(userId);
        const aiResponse = await getAIResponseViaREST(userMessage, userId, conversationHistory);
        return aiResponse;
      } catch (restError) {
        console.error("REST API also failed:", restError.message);
        // Return a helpful error message
        return "I apologize, but the AI service is experiencing technical difficulties. Please try again later or use the 'Chat with Admin' feature for immediate assistance.";
      }
    }
    
    // Check for API key errors
    if (errorMessage.toLowerCase().includes("api key") || 
        errorMessage.toLowerCase().includes("invalid api key") ||
        errorMessage.toLowerCase().includes("authentication") ||
        statusCode === 401 ||
        statusCode === 403) {
      console.log("API key error - returning fallback message");
      return "I apologize, but the AI service is not properly configured. Please contact the parish office for assistance.";
    }
    
    // Generic error fallback
    console.log("Generic error - returning fallback message");
    return "I apologize, but I'm having trouble processing your request right now. Please try again later or use the 'Chat with Admin' feature for immediate assistance.";
  }
}

/**
 * Get conversation history for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<Array>} - Array of messages in chat format (role/content)
 */
async function getConversationHistory(userId) {
  try {
    const chat = await AIChatModel.findOne({ userId })
      .sort({ "messages.timestamp": 1 });

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
 * @param {string} role - The message role (user or assistant)
 * @param {string} content - The message content
 */
async function saveMessage(userId, role, content) {
  try {
    let chat = await AIChatModel.findOne({ userId });

    if (!chat) {
      chat = new AIChatModel({
        userId,
        messages: [],
      });
    }

    chat.messages.push({
      role,
      content,
      timestamp: new Date(),
    });

    chat.lastMessage = new Date();
    await chat.save();
  } catch (error) {
    console.error("Error saving message:", error);
  }
}

/**
 * Get AI chat history for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<Array>} - Array of chat messages
 */
async function getChatHistory(userId) {
  try {
    const chat = await AIChatModel.findOne({ userId })
      .sort({ "messages.timestamp": 1 });

    if (!chat || !chat.messages || chat.messages.length === 0) {
      return [];
    }

    return chat.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
    }));
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return [];
  }
}

/**
 * Clear AI chat history for a user
 * @param {string} userId - The user's ID
 */
async function clearChatHistory(userId) {
  try {
    await AIChatModel.deleteOne({ userId });
  } catch (error) {
    console.error("Error clearing chat history:", error);
  }
}

/**
 * Analyze dashboard statistics using AI
 * @param {Object} stats - Dashboard statistics object
 * @returns {Promise<string>} - AI-generated analysis
 */
async function analyzeDashboardStats(stats) {
  try {
    if (!geminiApiKey) {
      throw new Error("API key not configured");
    }

    const statsPrompt = `You are an AI assistant analyzing dashboard statistics for a parish management system. Analyze the following statistics and provide insights, trends, and recommendations in a concise, professional format (3-4 paragraphs max):

OVERVIEW STATISTICS:
- Total Users: ${stats.totalUsers || 0}
- Total Priests: ${stats.totalPriests || 0}
- Pending Bookings: ${stats.pendingBookings || 0}
- Total Bookings: ${stats.totalBookings || 0}
- Confirmed Bookings: ${stats.confirmedBookings || 0}
- Total Volunteers: ${stats.totalVolunteers || 0}

DONATION STATISTICS:
- Total Donations: ₱${(stats.totalDonations || 0).toLocaleString()}
- Current Month Donations: ₱${(stats.monthlyDonations || 0).toLocaleString()}
- Confirmed Donations: ₱${(stats.donationBreakdown?.confirmed || 0).toLocaleString()} (${stats.donationBreakdown?.confirmedCount || 0} donations)
- Pending Donations: ₱${(stats.donationBreakdown?.pending || 0).toLocaleString()} (${stats.donationBreakdown?.pendingCount || 0} donations)

MONTHLY DONATION BREAKDOWN (Last 12 Months):
${stats.monthlyDonationBreakdown && stats.monthlyDonationBreakdown.length > 0 ? stats.monthlyDonationBreakdown.map(m => `- ${m.month} ${m.year}: ₱${(m.amount || 0).toLocaleString()} (${m.count || 0} donations)`).join('\n') : 'No monthly data available'}

TOP DONATION MONTHS:
${stats.topDonationMonths && stats.topDonationMonths.length > 0 ? stats.topDonationMonths.map((m, i) => `${i + 1}. ${m.month} ${m.year}: ₱${(m.amount || 0).toLocaleString()} (${m.count || 0} donations)`).join('\n') : 'No data available'}

BOOKING BREAKDOWN BY TYPE:
${stats.bookingBreakdown ? Object.entries(stats.bookingBreakdown).map(([type, count]) => `- ${type}: ${count}`).join('\n') : 'No booking data available'}

MONTHLY BOOKING BREAKDOWN (Last 12 Months - Busiest Months):
${stats.monthlyBookingBreakdown && stats.monthlyBookingBreakdown.length > 0 ? stats.monthlyBookingBreakdown.map(m => `- ${m.month} ${m.year}: ${m.total || 0} bookings${m.byType && Object.keys(m.byType).length > 0 ? ` (${Object.entries(m.byType).map(([type, count]) => `${type}: ${count}`).join(', ')})` : ''}`).join('\n') : 'No monthly booking data available'}

BUSIEST BOOKING MONTHS:
${stats.busiestBookingMonths && stats.busiestBookingMonths.length > 0 ? stats.busiestBookingMonths.map((m, i) => `${i + 1}. ${m.month} ${m.year}: ${m.total || 0} bookings${m.byType && Object.keys(m.byType).length > 0 ? ` (${Object.entries(m.byType).map(([type, count]) => `${type}: ${count}`).join(', ')})` : ''}`).join('\n') : 'No data available'}

Provide actionable insights about:
1. Donation trends - highlight peak months, growth patterns, and areas for improvement
2. Booking patterns - identify busiest months, popular sacrament types, and seasonal trends
3. Areas that need attention (pending items, low activity periods)
4. Recommendations for improvement (resource allocation, marketing opportunities, operational efficiency)
5. Positive highlights and achievements

Keep the response professional, concise, and focused on actionable insights. Highlight the most significant trends and patterns.`;

    // Try REST API with smart model selection and quota handling
    try {
      const availableModels = await getAvailableModels();
      
      // Filter out non-existent models and prioritize working models
      const validModels = availableModels.filter(m => 
        !m.includes("gemini-1.5-flash-001") && 
        !m.includes("gemini-1.5")
      );
      
      // Prioritize models: prefer flash-lite models (less rate limited), then flash, then pro
      const prioritizedModels = [
        ...validModels.filter(m => m.includes("flash-lite")),
        ...validModels.filter(m => m.includes("flash") && !m.includes("flash-lite")),
        ...validModels.filter(m => m.includes("pro")),
        ...validModels.filter(m => !m.includes("flash") && !m.includes("pro"))
      ];
      
      // Try up to 3 models - if one has quota exceeded, try the next one
      const modelsToTry = prioritizedModels.length > 0 
        ? prioritizedModels.slice(0, 3) // Try up to 3 models
        : ["gemini-2.5-flash-lite", "gemini-2.0-flash-lite", "gemini-2.5-flash"];
      
      // Try v1 first (more stable)
      const apiVersions = ["v1"];
      
      let lastQuotaError = null;
      
      for (const modelName of modelsToTry) {
        for (const version of apiVersions) {
          try {
            const url = `https://generativelanguage.googleapis.com/${version}/models/${modelName}:generateContent?key=${geminiApiKey}`;
            const response = await axios.post(
              url,
              {
                contents: [{
                  parts: [{ text: statsPrompt }]
                }]
              },
              {
                headers: {
                  "Content-Type": "application/json"
                },
                timeout: 30000 // 30 second timeout
              }
            );

            if (response.data && response.data.candidates && response.data.candidates[0]) {
              const analysis = response.data.candidates[0].content.parts[0].text;
              console.log(`Successfully generated stats analysis using ${modelName} (${version})`);
              return analysis;
            }
          } catch (error) {
            const status = error.response?.status;
            const errorDetails = error.response?.data?.error?.details || [];
            const errorMessage = error.message || '';
            
            // Check if it's a quota exceeded error
            const quotaExceeded = errorDetails.some(detail => 
              detail['@type']?.includes('QuotaFailure') || 
              detail['@type']?.includes('Quota')
            ) || errorMessage.includes('quota') || 
              errorMessage.includes('Quota exceeded') ||
              errorMessage.includes('exceeded your current quota');
            
            if (quotaExceeded) {
              console.log(`Quota exceeded for ${modelName}. Trying next model...`);
              lastQuotaError = modelName;
              // Break out of version loop and try next model
              break;
            }
            
            // If rate limited (429) but not quota, it's temporary - wait and continue
            if (status === 429 && !quotaExceeded) {
              console.log(`REST API ${version}/${modelName} temporarily rate limited (429), trying next model...`);
              break; // Try next model
            } else if (status !== 429) {
              console.log(`REST API ${version}/${modelName} failed:`, status || error.message);
              // Continue to next version or model
            }
          }
        }
        
        // If we got a successful response, we would have returned already
        // If we're here, this model failed - continue to next model
        // Add small delay between models to be safe
        if (modelName !== modelsToTry[modelsToTry.length - 1]) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // If we tried all models and all had quota exceeded
      if (lastQuotaError) {
        console.log(`All tried models have quota exceeded. Last attempted: ${lastQuotaError}`);
        return `AI analysis quota exceeded for all available models today (20 requests/day limit per model on free tier). The analysis will be available again tomorrow. Dashboard statistics and charts are still available for insights.`;
      }
      
    } catch (restError) {
      console.log("REST API failed:", restError.message);
      // Don't throw, fall through to return graceful message
    }

    // If we get here, all models failed for non-quota reasons
    return `AI analysis is currently unavailable. Please try again in a few moments. Dashboard statistics and charts are still available for insights.`;
  } catch (error) {
    console.error("Error analyzing dashboard stats:", error);
    
    // Check if it's a quota error
    const isQuotaError = error.message?.includes('quota') || 
                        error.message?.includes('Quota') ||
                        error.status === 429;
    
    if (isQuotaError) {
      return `AI analysis quota exceeded for today (20 requests/day limit on free tier). Please try again tomorrow or upgrade your API plan. Dashboard statistics are still available.`;
    }
    
    return "Unable to generate AI analysis at this time. Please try again later. Dashboard statistics and charts are still available for insights.";
  }
}

module.exports = {
  getAIResponse,
  getConversationHistory,
  saveMessage,
  getChatHistory,
  clearChatHistory,
  analyzeDashboardStats,
};



