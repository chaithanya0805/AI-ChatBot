import React, { useState, useEffect, useRef } from 'react';
import { ChatContainer } from './components/ChatContainer';
import { useChatStream, Message } from './hooks/useChatStream';
import { useVoiceAssistant } from './hooks/useVoiceAssistant';
import { 
  Plus, 
  Trash2, 
  Sun, 
  Moon, 
  Settings, 
  MessageSquare, 
  Menu, 
  X, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Square,
  ArrowUp
} from 'lucide-react';

type InputMode = 'text' | 'voice';

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

// Minimal modern logo lettermark
const Logo = () => (
  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-primary to-brand-secondary text-white font-bold text-base shadow-sm select-none">
    J
  </div>
);

function App() {
  const { messages, setMessages, sendMessage, isTyping } = useChatStream();
  const [input, setInput] = useState('');
  const [lastInputMode, setLastInputMode] = useState<InputMode>('text');

  // Multi-chat states
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });

  const [dbError, setDbError] = useState<string | null>(null);

  const isSwitchingChat = useRef(false);

  const handleClearAllChats = () => {
    isSwitchingChat.current = true;
    fetch('http://localhost:8083/api/chats', {
      method: 'DELETE'
    })
    .then(res => {
      if (!res.ok) {
        throw new Error('Database is currently unavailable.');
      }
      setChats([]);
      setMessages([]);
      setActiveChatId(null);
      setSettingsOpen(false);
      setDbError(null);
      setTimeout(() => {
        handleNewChat();
      }, 0);
    })
    .catch(err => {
      console.error("Error clearing chats:", err);
      setDbError('Database is currently unavailable. Chat history could not be cleared.');
      isSwitchingChat.current = false;
    });
  };

  // Sync theme to root class list
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Load chat sessions from MySQL database
  useEffect(() => {
    fetch('http://localhost:8083/api/chats')
      .then(res => {
        if (!res.ok) {
          throw new Error('Database is currently unavailable.');
        }
        return res.json();
      })
      .then(data => {
        const parsed = data as ChatSession[];
        setChats(parsed);
        setDbError(null);
        if (parsed.length > 0) {
          isSwitchingChat.current = true;
          setActiveChatId(parsed[0].id);
          setMessages(parsed[0].messages);
          setTimeout(() => {
            isSwitchingChat.current = false;
          }, 50);
        } else {
          handleNewChat();
        }
      })
      .catch(err => {
        console.error("Error loading chat history:", err);
        setDbError('Database is currently unavailable. Chat history could not be loaded.');
        // Fallback to empty session locally so user can still try to chat
        const fallbackId = crypto.randomUUID();
        const fallbackChat: ChatSession = {
          id: fallbackId,
          title: 'New Chat',
          messages: [],
          timestamp: Date.now()
        };
        setChats([fallbackChat]);
        setActiveChatId(fallbackId);
        setMessages([]);
      });
  }, []);

  // Save changes to current chat messages
  useEffect(() => {
    if (isSwitchingChat.current || !activeChatId) return;

    const currentChat = chats.find(c => c.id === activeChatId);
    if (!currentChat) return;

    const messagesChanged = JSON.stringify(currentChat.messages) !== JSON.stringify(messages);

    if (messagesChanged) {
      let newTitle = currentChat.title;
      // Generate a readable title from the first user message if it's currently default
      if (currentChat.title === 'New Chat' && messages.length > 0) {
        const firstUserMsg = messages.find(m => m.role === 'user');
        if (firstUserMsg) {
          newTitle = firstUserMsg.content.slice(0, 26) + (firstUserMsg.content.length > 26 ? '...' : '');
        }
      }

      const updatedChat: ChatSession = {
        ...currentChat,
        title: newTitle,
        messages: messages,
        timestamp: Date.now()
      };

      fetch('http://localhost:8083/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedChat)
      })
      .then(res => {
        if (!res.ok) {
          throw new Error('Database is currently unavailable.');
        }
        return res.json();
      })
     .then((savedChat: ChatSession) => {
    setChats(prev =>
        prev.map(c =>
            c.id === activeChatId ? savedChat : c
        )
    );

    setActiveChatId(savedChat.id);

    setDbError(null);
})
      .catch(err => {
        console.error("Error saving chat session to DB:", err);
        setDbError('Database is currently unavailable. Chat session could not be saved.');
        // Fallback local update to keep UI in sync
        setChats(prev => prev.map(c => c.id === activeChatId ? updatedChat : c));
      });
    }
  }, [messages, activeChatId, chats]);

  // Start a new chat session
 const handleNewChat = () => {
  isSwitchingChat.current = true;

  const tempChat: ChatSession = {
    id: crypto.randomUUID(),
    title: "New Chat",
    messages: [],
    timestamp: Date.now()
  };

  fetch("http://localhost:8083/api/chats", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(tempChat)
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error("Database Error");
      }
      return res.json();
    })
  .then((savedChat: ChatSession) => {

    setChats(prev => [savedChat, ...prev]);

    setActiveChatId(savedChat.id);

    setMessages([]);

    setSidebarOpen(false);

    setDbError(null);

    isSwitchingChat.current = false;
})
    .catch((err) => {
      console.error(err);

      setDbError(
        "Database is currently unavailable. Chat session could not be saved."
      );
    });
};

  // Switch to an existing chat session
  const handleSelectChat = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      isSwitchingChat.current = true;
      setActiveChatId(chatId);
      setMessages(chat.messages);
      setSidebarOpen(false);

      setTimeout(() => {
        isSwitchingChat.current = false;
      }, 50);
    }
  };

  // Delete an existing chat session
  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();

    fetch(`http://localhost:8083/api/chats/${chatId}`, {
      method: 'DELETE'
    })
    .then(res => {
      if (!res.ok) {
        throw new Error('Database is currently unavailable.');
      }
      setChats(prev => {
        const updated = prev.filter(c => c.id !== chatId);
        if (activeChatId === chatId) {
          if (updated.length > 0) {
            setTimeout(() => {
              handleSelectChat(updated[0].id);
            }, 0);
          } else {
            setTimeout(() => {
              handleNewChat();
            }, 0);
          }
        }
        return updated;
      });
      setDbError(null);
    })
    .catch(err => {
      console.error("Error deleting chat:", err);
      setDbError('Database is currently unavailable. Chat session could not be deleted.');
    });
  };

  // Handle voice commands: automatically send when speech is recognized
  const handleSpeechResult = (transcript: string) => {
    setInput("");
    setLastInputMode('voice');
    sendMessage(transcript);
  };

  const {
    isListening,
    isSpeaking,
    isMuted,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    toggleMute,
    hasRecognition
  } = useVoiceAssistant(handleSpeechResult);

  // Speak AI responses ONLY if the last input mode was 'voice'
  useEffect(() => {
    if (!isTyping && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && lastInputMode === 'voice') {
        speak(lastMessage.content);
      }
    }
  }, [isTyping, messages, speak, lastInputMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    setLastInputMode('text');
    sendMessage(input);
    setInput('');
  };

  const toggleListen = () => {
    if (isListening) {
      stopListening();
    } else {
      setLastInputMode('voice');
      startListening();
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-50 font-sans overflow-hidden transition-colors duration-300">
      
      {/* Left Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700/60
        flex flex-col transform transition-transform duration-300 ease-in-out
        md:static md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-700/60">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="font-bold text-lg tracking-tight text-slate-800 dark:text-slate-100 select-none">Jarvis</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-primary hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors duration-200 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Chat History Section */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-3 mb-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
            Chat History
          </div>
          {chats.length <= 1 && chats[0]?.messages.length === 0 ? (
            <div className="px-3 py-4 text-xs text-slate-400 dark:text-slate-500 italic select-none">
              No recent conversations
            </div>
          ) : (
            chats.map((chat) => {
              // Hide empty new chat in history list unless it's selected
              if (chat.messages.length === 0 && chat.id !== activeChatId) return null;
              
              return (
                <div
                  key={chat.id}
                  onClick={() => handleSelectChat(chat.id)}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors duration-150 text-sm ${
                    activeChatId === chat.id
                      ? 'bg-slate-200/60 text-slate-900 dark:bg-slate-700 dark:text-slate-100 font-medium'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-60 text-brand-primary" />
                    <span className="truncate">{chat.title}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded transition-opacity duration-150"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/40 dark:bg-slate-950/60 md:hidden backdrop-blur-xs"
        />
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-700/60 z-10 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-semibold text-slate-700 dark:text-slate-200 select-none">
              {chats.find(c => c.id === activeChatId)?.title || 'Jarvis'}
            </h1>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            
            {/* Audio Synthesis Info & Controls */}
            {(lastInputMode === 'voice' || isSpeaking || isListening) && (
              <div className="flex items-center gap-2 mr-2 border-r border-slate-200 dark:border-slate-700/60 pr-4">
                {isSpeaking && (
                  <button
                    onClick={stopSpeaking}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-red-500 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 rounded-lg transition-colors font-medium"
                    title="Stop audio presentation"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Stop</span>
                  </button>
                )}
                {isListening && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
                {isSpeaking && !isMuted && (
                  <div className="flex items-end gap-0.5 h-3">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="w-0.5 bg-brand-secondary rounded-full animate-pulse"
                        style={{
                          height: '100%',
                          animationDelay: `${i * 0.12}s`,
                          animationDuration: '0.8s'
                        }}
                      />
                    ))}
                  </div>
                )}
                <button
                  onClick={toggleMute}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title={isMuted ? "Unmute speech feedback" : "Mute speech feedback"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
            )}

            {/* Light/Dark mode toggler */}
            <button
              onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === 'light' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
            </button>

            {/* Optional Settings button */}
            <button 
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Settings"
            >
              <Settings className="w-4.5 h-4.5" />
            </button>
          </div>
        </header>

        {dbError && (
          <div className="bg-red-500 text-white text-xs py-2 px-6 flex justify-between items-center z-20">
            <span>{dbError}</span>
            <button onClick={() => setDbError(null)} className="hover:text-red-200 font-bold ml-4">✕</button>
          </div>
        )}

        {/* Messaging Box */}
        <div className="flex-1 overflow-hidden relative">
          <ChatContainer messages={messages} isTyping={isTyping} />
        </div>

        {/* Input box section */}
        <div className="p-4 md:p-6 border-t border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 transition-colors">
          <div className="max-w-3xl mx-auto flex flex-col gap-3">
            
            <form
              onSubmit={handleSubmit}
              className="relative flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-1.5 focus-within:border-brand-primary dark:focus-within:border-brand-primary/80 focus-within:ring-1 focus-within:ring-brand-primary/40 shadow-sm transition-all duration-200"
            >
              {hasRecognition && (
                <button
                  type="button"
                  onClick={toggleListen}
                  className={`p-2.5 rounded-xl transition-all duration-200 ${
                    isListening
                      ? 'bg-red-500/10 text-red-500 dark:bg-red-500/20'
                      : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  title={isListening ? "Stop voice listening" : "Start speech recording"}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "Listening... speak now" : "Message Jarvis..."}
                className="flex-1 bg-transparent border-none outline-none px-3.5 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm font-sans"
                disabled={isTyping || isListening}
              />

              <button
                type="submit"
                disabled={!input.trim() || isTyping || isListening}
                className="p-2.5 bg-brand-primary text-white hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-300 dark:disabled:bg-slate-800/40 dark:disabled:text-slate-600 rounded-xl transition-all duration-200"
                title="Send command"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
            </form>

            <div className="text-center text-[10px] text-slate-400 dark:text-slate-500 tracking-wide select-none uppercase font-semibold">
              Jarvis &bull; Powered by advanced AI model
            </div>
          </div>
        </div>

      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div 
            onClick={() => setSettingsOpen(false)}
            className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-xs transition-opacity duration-200"
          />
          
          {/* Modal Panel */}
          <div className="relative w-full max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-10 overflow-hidden transition-all">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700/60">
              <h3 className="font-semibold text-base text-slate-800 dark:text-slate-100 font-sans">Settings</h3>
              <button 
                onClick={() => setSettingsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-6">
              
              {/* Theme Preference */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 font-sans">Theme Preference</h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-sans">Toggle between light and dark visual themes</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-600 dark:text-slate-300 font-sans"
                >
                  {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                  <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                </button>
              </div>
              
              {/* Clear Chat History */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 pt-6">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 font-sans">Clear Chat History</h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-sans">Permanently delete all conversations from history</p>
                </div>
                <button
                  type="button"
                  onClick={handleClearAllChats}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 rounded-xl transition-colors font-sans"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              </div>
              
              {/* About Jarvis */}
              <div className="border-t border-slate-100 dark:border-slate-700/60 pt-6">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 font-sans">About</h4>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1 text-slate-500 dark:text-slate-400 font-sans">
                  <div className="font-semibold text-slate-700 dark:text-slate-300">Jarvis AI Chatbot</div>
                  <div>Version 1.0</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-mono">© 2026 Jarvis. All rights reserved.</div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
