# Gemini Chatbot

A minimal, highly responsive web-based chatbot using React (Frontend) and Node.js/Express (Backend) to interface with the Google Gemini API. Features a premium dynamic dark-mode design.

## Features
- **Text Conversation**: Chat directly with the Gemini model.
- **Document Support**: Upload PDF and TXT files. The text is automatically extracted and analyzed by Gemini.
- **Image Support**: Upload JPG and PNG images for vision-based queries.
- **Context Management**: The bot remembers previous messages in the current session.
- **New Chat**: Easily reset the context by clicking "New Chat".
- **Premium UI**: Dark mode, glassmorphism, responsive interface.

## Prerequisites
- Node.js (v18+)
- Google Gemini API Key

## Setup & Installation

### 1. Get a Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Create an API key.

### 2. Backend Setup
1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on the example:
   ```bash
   cp .env.example .env
   ```
4. Open `.env` and add your Gemini API Key:
   ```env
   GEMINI_API_KEY="your_actual_api_key_here"
   PORT=3000
   ```
5. Start the backend server:
   ```bash
   node server.js
   ```

### 3. Frontend Setup
1. Open a new terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

## Usage
1. Open your browser to `http://localhost:5173`.
2. Type a message in the input box and click the **Send** button (or press Enter).
3. Click the **Image** or **Document** icons to attach files to your message.
4. Click **New Chat** in the sidebar to start a fresh conversation.

## Tech Stack
- **Frontend**: React, Vite, Vanilla CSS, Axios, Lucide React (Icons).
- **Backend**: Node.js, Express, Multer (File Handling), PDF-Parse, @google/generative-ai.

