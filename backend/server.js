const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdf = require('pdf-parse');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory chat store
// Structure: { [chatId]: [ { role: 'user' | 'model', parts: [{text: string}] } ] }
const chats = new Map();

// Configure Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// We use gemini-2.5-flash as it is supported by your API key and supports text + image well.
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Create new chat session
app.post('/api/chat/new', (req, res) => {
  const chatId = req.body.chatId || Date.now().toString();
  chats.set(chatId, []);
  res.json({ success: true, chatId });
});

// Delete specific chat session
app.delete('/api/chat/:id', (req, res) => {
  const { id } = req.params;
  chats.delete(id);
  res.json({ success: true, message: 'Chat deleted' });
});

// Delete all chat sessions
app.delete('/api/chat', (req, res) => {
  chats.clear();
  res.json({ success: true, message: 'All chats deleted' });
});

// Helper function to extract text from file
const extractTextFromFile = async (file) => {
  if (file.mimetype === 'application/pdf') {
    const data = await pdf(file.buffer);
    return data.text;
  } else if (file.mimetype === 'text/plain') {
    return file.buffer.toString('utf-8');
  }
  return null;
};

// Helper function to convert file to Gemini inline data
const fileToGenerativePart = (file) => {
  return {
    inlineData: {
      data: file.buffer.toString("base64"),
      mimeType: file.mimetype
    },
  };
};

app.post('/api/chat/message', upload.single('file'), async (req, res) => {
  try {
    const { chatId, message } = req.body;
    const file = req.file;

    if (!chatId) {
      return res.status(400).json({ error: 'chatId is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });
    }

    // Get or create chat history
    if (!chats.has(chatId)) {
      chats.set(chatId, []);
    }
    const history = chats.get(chatId);

    // Prepare current user message parts
    let userParts = [];
    
    // Add text message if present
    if (message) {
      userParts.push({ text: message });
    }

    // Handle file upload
    if (file) {
      if (file.mimetype === 'application/pdf' || file.mimetype === 'text/plain') {
        const textContent = await extractTextFromFile(file);
        if (textContent) {
          userParts.push({ text: `\n--- START OF DOCUMENT CONTENT ---\n${textContent}\n--- END OF DOCUMENT CONTENT ---\n` });
        }
      } else if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        userParts.push(fileToGenerativePart(file));
      } else {
        return res.status(400).json({ error: 'Unsupported file type. Only PDF, TXT, PNG, and JPG are supported.' });
      }
    }

    if (userParts.length === 0) {
      return res.status(400).json({ error: 'Message or file is required' });
    }

    // Create the chat session
    const chatSession = model.startChat({
      history: history,
    });

    // Send message to Gemini
    const result = await chatSession.sendMessage(userParts);
    const response = await result.response;
    const responseText = response.text();

    // Update history manually to ensure images are saved correctly in our context if needed
    // The history is already updated by startChat internally, but we can sync it back if we need to.
    // However, startChat internally updates the history array we passed by reference.
    // Wait, the documentation for getGenerativeModel + startChat usually modifies the history array passed.
    // Let's verify by checking history.length. If it doesn't, we can fetch history from chatSession.
    
    const updatedHistory = await chatSession.getHistory();
    chats.set(chatId, updatedHistory);

    // Check if we need to generate a title (first message)
    let generatedTitle = undefined;
    if (history.length === 0) {
      try {
        // Create a separate call to generate a short title
        const titleModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const titlePrompt = `Generate a very short, concise title (max 4 words) for a chat that starts with this message. Do not use quotes or prefixes. Message: "${message || 'Uploaded a file'}"`;
        const titleResult = await titleModel.generateContent(titlePrompt);
        generatedTitle = titleResult.response.text().trim();
      } catch (err) {
        console.error('Failed to generate title:', err);
      }
    }

    res.json({
      success: true,
      response: responseText,
      title: generatedTitle,
      history: updatedHistory.map(item => ({
        role: item.role,
        text: item.parts.map(p => p.text).join('') // simplistic view for frontend
      }))
    });
  } catch (error) {
    console.error('Error in /api/chat/message:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
