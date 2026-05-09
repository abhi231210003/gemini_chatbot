import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Plus, Image as ImageIcon, FileText, X, Bot, User, Trash2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function App() {
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistoryList, setChatHistoryList] = useState([]);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const isInitialized = useRef(false);

  // Initialize a new chat on first load
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      startNewChat();
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const startNewChat = async () => {
    if (messages.length === 0 && chatId) {
      return; // Already in a new, empty chat
    }
    
    try {
      const id = Date.now().toString();
      const response = await axios.post(`${API_URL}/chat/new`, { chatId: id });
      
      setChatId(response.data.chatId);
      setMessages([]);
      setFile(null);
      setPreviewUrl(null);
      setInput('');
      
      // Update chat history list for the sidebar
      setChatHistoryList(prev => {
        return [{ id: response.data.chatId, preview: 'New Chat', time: new Date() }, ...prev];
      });
    } catch (error) {
      console.error('Failed to start new chat:', error);
    }
  };

  const deleteChat = async (id, e) => {
    e.stopPropagation(); // prevent clicking chat item
    try {
      await axios.delete(`${API_URL}/chat/${id}`);
      setChatHistoryList(prev => prev.filter(c => c.id !== id));
      if (chatId === id) {
        startNewChat();
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  const deleteAllChats = async () => {
    try {
      await axios.delete(`${API_URL}/chat`);
      setChatHistoryList([]);
      startNewChat();
    } catch (err) {
      console.error('Failed to delete all chats:', err);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const validTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];
    if (!validTypes.includes(selectedFile.type)) {
      alert('Unsupported file type. Please upload JPG, PNG, PDF, or TXT.');
      return;
    }

    setFile(selectedFile);

    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null); // No preview for PDF/TXT, just show icon
    }
  };

  const removeFile = () => {
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessage = async () => {
    if ((!input.trim() && !file) || isLoading) return;

    // Add user message to UI immediately
    const userMsg = {
      role: 'user',
      text: input,
      imageUrl: previewUrl,
      fileName: file ? file.name : null
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    
    const currentInput = input;
    setInput('');

    try {
      const formData = new FormData();
      formData.append('chatId', chatId);
      if (currentInput.trim()) {
        formData.append('message', currentInput);
      }
      if (file) {
        formData.append('file', file);
      }

      const response = await axios.post(`${API_URL}/chat/message`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Add bot response to UI
      setMessages(prev => [...prev, {
        role: 'model',
        text: response.data.response
      }]);
      
      // Clear file after successful send
      removeFile();
      
      // Update sidebar preview
      setChatHistoryList(prev => prev.map(c => {
        if (c.id === chatId) {
          if (response.data.title) {
            return { ...c, preview: response.data.title };
          }
          // If already named something else, keep it, otherwise update fallback
          return c.preview === 'New Chat' 
            ? { ...c, preview: currentInput || (file ? `Sent file: ${file.name}` : 'Message') } 
            : c;
        }
        return c;
      }));

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'model',
        text: 'Sorry, I encountered an error. Please try again or check if the API key is valid.',
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <button className="new-chat-btn" onClick={startNewChat}>
          <Plus size={20} />
          New Chat
        </button>
        
        <div className="chats-list">
          {chatHistoryList.map(chat => (
            <div 
              key={chat.id} 
              className={`chat-item ${chat.id === chatId ? 'active' : ''}`}
              onClick={() => {
                // To switch chats properly, we'd need to fetch history from server
                // but this is basic so we just highlight it. Full feature requires backend GET route.
                setChatId(chat.id);
                setMessages([]); // Resetting messages for simplistic view since we don't have GET endpoint
              }}
            >
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexGrow: 1 }}>
                {chat.preview}
              </div>
              <button 
                onClick={(e) => deleteChat(chat.id, e)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title="Delete Chat"
                className="delete-btn-hover"
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {chatHistoryList.length > 0 && (
          <button 
            onClick={deleteAllChats}
            style={{ 
              background: 'transparent', 
              border: '1px solid var(--danger)', 
              color: 'var(--danger)', 
              padding: '0.75rem', 
              borderRadius: '8px', 
              cursor: 'pointer',
              marginTop: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 600,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <Trash2 size={18} />
            Clear All
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="header">
          <h1>Gemini Intelligence</h1>
        </div>

        <div className="chat-area">
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <Bot className="welcome-icon" />
              <h2>How can I help you today?</h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                Upload documents (PDF/TXT) or images (JPG/PNG) to get started.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`message-wrapper ${msg.role}`}>
                <div className={`message ${msg.role}`} style={{ borderColor: msg.isError ? 'var(--danger)' : '' }}>
                  {msg.role === 'user' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', opacity: 0.7, fontSize: '0.8rem' }}>
                      <User size={14} /> You
                    </div>
                  )}
                  {msg.role === 'model' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', opacity: 0.7, fontSize: '0.8rem', color: 'var(--accent-color)' }}>
                      <Bot size={14} /> Gemini
                    </div>
                  )}
                  
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                  
                  {msg.fileName && !msg.imageUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', padding: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '0.9rem' }}>
                      <FileText size={16} /> {msg.fileName}
                    </div>
                  )}
                  
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="Uploaded preview" className="message-image" />
                  )}
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="message-wrapper model">
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="input-area-wrapper">
          <div className="input-container">
            {file && (
              <div className="file-preview">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" />
                ) : (
                  <FileText size={24} color="var(--accent-color)" />
                )}
                <span style={{ fontSize: '0.8rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </span>
                <button className="remove-file" onClick={removeFile}>
                  <X size={14} />
                </button>
              </div>
            )}
            
            <div className="textarea-wrapper">
              <textarea
                placeholder="Ask Gemini anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
            </div>
            
            <div className="actions-row">
              <div className="attachment-buttons">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden-input"
                  accept=".jpg,.jpeg,.png,.pdf,.txt"
                />
                
                <button 
                  className="icon-btn" 
                  title="Upload Image (JPG/PNG)"
                  onClick={() => {
                    fileInputRef.current.accept = ".jpg,.jpeg,.png";
                    fileInputRef.current.click();
                  }}
                >
                  <ImageIcon size={20} />
                </button>
                
                <button 
                  className="icon-btn" 
                  title="Upload Document (PDF/TXT)"
                  onClick={() => {
                    fileInputRef.current.accept = ".pdf,.txt";
                    fileInputRef.current.click();
                  }}
                >
                  <FileText size={20} />
                </button>
              </div>
              
              <button 
                className="send-btn" 
                onClick={sendMessage}
                disabled={(!input.trim() && !file) || isLoading}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
