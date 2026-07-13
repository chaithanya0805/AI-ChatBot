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
  ArrowUp,
  User,
  LogOut,
  Eye,
  EyeOff
} from 'lucide-react';

type InputMode = 'text' | 'voice';
type AuthModalStep = 'signin' | 'signup' | 'verify-signup' | 'forgot-password' | 'reset-password' | 'loading';

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

// Minimal modern logo lettermark
const Logo = () => (
  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-tr from-[#D4AF6A] to-[#C89B5C] text-[#090909] font-extrabold text-sm shadow-xs select-none">
    J
  </div>
);

function App() {
  const { messages, setMessages, sendMessage, isTyping } = useChatStream();
  const [input, setInput] = useState('');
  const [lastInputMode, setLastInputMode] = useState<InputMode>('text');

  // Auth states
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<{ email: string; fullName: string; role: string } | null>(null);

  // Auth modal states
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalStep, setAuthModalStep] = useState<AuthModalStep>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);

  // Password visibility states
  const [showSignInPass, setShowSignInPass] = useState(false);
  const [showSignUpPass, setShowSignUpPass] = useState(false);
  const [showSignUpConfirmPass, setShowSignUpConfirmPass] = useState(false);
  const [showResetPass, setShowResetPass] = useState(false);
  const [showResetConfirmPass, setShowResetConfirmPass] = useState(false);

  // Dropdown states
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

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

  // 1. Auto-login on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      fetch('http://localhost:8083/auth/me', {
        headers: {
          'Authorization': `Bearer ${storedToken}`
        }
      })
      .then(res => {
        if (!res.ok) {
          throw new Error('Token verification failed');
        }
        return res.json();
      })
      .then(userData => {
        setUser(userData);
        setToken(storedToken);
        localStorage.removeItem('guest_chats');
      })
      .catch(err => {
        console.error("Auto-login failed:", err);
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      });
    }
  }, []);

  // 2. Cooldown timer countdown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // 3. Dropdown outside click & Escape listener
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  // Sync theme to root class list
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Clear modal input values on open, close, or step transition
  useEffect(() => {
    if (!authModalOpen) {
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFullName('');
      setOtpCode('');
      setNewPassword('');
      setAuthError(null);
    } else {
      // Clear credentials when modal opens initially on signin/signup/forgot-password,
      // but preserve context data (like email) if transitioning to intermediate pages.
      if (authModalStep === 'signin' || authModalStep === 'signup' || authModalStep === 'forgot-password') {
        setEmail('');
        setFullName('');
      }
      setPassword('');
      setConfirmPassword('');
      setOtpCode('');
      setNewPassword('');
    }
  }, [authModalOpen, authModalStep]);

  // Load chat sessions based on Auth Token or Guest Storage
  useEffect(() => {
    if (token) {
      // Cloud mode load
      fetch('http://localhost:8083/api/chats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
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
          handleNewChatForToken(token);
        }
      })
      .catch(err => {
        console.error("Error loading chat history:", err);
        setDbError('Database is currently unavailable. Chat history could not be loaded.');
      });
    } else {
      // Guest mode load
      const stored = localStorage.getItem('guest_chats');
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as ChatSession[];
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
            handleNewChatForToken(null);
          }
        } catch (e) {
          handleNewChatForToken(null);
        }
      } else {
        handleNewChatForToken(null);
      }
    }
  }, [token]);

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

      if (token) {
        fetch('http://localhost:8083/api/chats', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updatedChat)
        })
        .then(res => {
          if (!res.ok) {
            throw new Error('Database is currently unavailable.');
          }
          return res.json();
        })
        .then((savedChat: ChatSession) => {
          setChats(prev => prev.map(c => c.id === activeChatId ? savedChat : c));
          setActiveChatId(savedChat.id);
          setDbError(null);
        })
        .catch(err => {
          console.error("Error saving chat session to DB:", err);
          setDbError('Database is currently unavailable. Chat session could not be saved.');
          setChats(prev => prev.map(c => c.id === activeChatId ? updatedChat : c));
        });
      } else {
        // Guest mode state sync
        const updatedChats = chats.map(c => c.id === activeChatId ? updatedChat : c);
        setChats(updatedChats);
        localStorage.setItem('guest_chats', JSON.stringify(updatedChats));
      }
    }
  }, [messages, activeChatId, chats, token]);

  const handleNewChatForToken = (tokenVal: string | null) => {
    isSwitchingChat.current = true;
    const tempChat: ChatSession = {
      id: crypto.randomUUID(),
      title: "New Chat",
      messages: [],
      timestamp: Date.now()
    };

    if (tokenVal) {
      fetch("http://localhost:8083/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${tokenVal}`
        },
        body: JSON.stringify(tempChat)
      })
      .then((res) => {
        if (!res.ok) throw new Error("Database Error");
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
        setDbError("Database is currently unavailable. Chat session could not be saved.");
      });
    } else {
      // Guest mode setup
      setChats(prev => {
        const next = [tempChat, ...prev.filter(c => c.messages.length > 0)];
        localStorage.setItem('guest_chats', JSON.stringify(next));
        return next;
      });
      setActiveChatId(tempChat.id);
      setMessages([]);
      setSidebarOpen(false);
      isSwitchingChat.current = false;
    }
  };

  const handleNewChat = () => {
    handleNewChatForToken(token);
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

    if (token) {
      fetch(`http://localhost:8083/api/chats/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => {
        if (!res.ok) {
          throw new Error('Database is currently unavailable.');
        }
        setChats(prev => {
          const updated = prev.filter(c => c.id !== chatId);
          if (activeChatId === chatId) {
            if (updated.length > 0) {
              setTimeout(() => handleSelectChat(updated[0].id), 0);
            } else {
              setTimeout(() => handleNewChat(), 0);
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
    } else {
      // Guest mode deletion
      setChats(prev => {
        const updated = prev.filter(c => c.id !== chatId);
        if (activeChatId === chatId) {
          if (updated.length > 0) {
            setTimeout(() => handleSelectChat(updated[0].id), 0);
          } else {
            setTimeout(() => handleNewChat(), 0);
          }
        }
        localStorage.setItem('guest_chats', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleClearAllChats = () => {
    if (token) {
      isSwitchingChat.current = true;
      fetch('http://localhost:8083/api/chats', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
    } else {
      // Clear guest local storage history
      setChats([]);
      setMessages([]);
      setActiveChatId(null);
      setSettingsOpen(false);
      localStorage.removeItem('guest_chats');
      setTimeout(() => {
        handleNewChat();
      }, 0);
    }
  };

  // Auth Operations
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthModalStep('loading');
    setAuthError(null);
    try {
      const res = await fetch('http://localhost:8083/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }
      localStorage.removeItem('guest_chats');
      setChats([]);
      setMessages([]);
      setActiveChatId(null);
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser({ email: data.email, fullName: data.fullName, role: data.role });
      setAuthModalOpen(false);
      setPassword('');
      setAuthError(null);
    } catch (err: any) {
      setAuthError(err.message);
      setAuthModalStep('signin');
      setPassword('');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setAuthError("Passwords do not match.");
      return;
    }
    setAuthModalStep('loading');
    setAuthError(null);
    try {
      const res = await fetch('http://localhost:8083/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }
      setAuthModalStep('verify-signup');
      setCooldown(60);
    } catch (err: any) {
      setAuthError(err.message);
      setAuthModalStep('signup');
      setPassword('');
      setConfirmPassword('');
    }
  };

  const handleVerifySignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthModalStep('loading');
    setAuthError(null);
    try {
      const res = await fetch('http://localhost:8083/auth/verify-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpCode })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed.');
      }
      localStorage.removeItem('guest_chats');
      setChats([]);
      setMessages([]);
      setActiveChatId(null);
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser({ email: data.email, fullName: data.fullName, role: data.role });
      setAuthModalOpen(false);
      setFullName('');
      setPassword('');
      setConfirmPassword('');
      setOtpCode('');
      setAuthError(null);
    } catch (err: any) {
      setAuthError(err.message);
      setAuthModalStep('verify-signup');
      setOtpCode('');
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthModalStep('loading');
    setAuthError(null);
    try {
      const res = await fetch('http://localhost:8083/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Reset code delivery failed.');
      }
      setAuthModalStep('reset-password');
      setCooldown(60);
    } catch (err: any) {
      setAuthError(err.message);
      setAuthModalStep('forgot-password');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setAuthError("Passwords do not match.");
      return;
    }
    setAuthModalStep('loading');
    setAuthError(null);
    try {
      const res = await fetch('http://localhost:8083/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpCode, password: newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update credentials.');
      }
      setAuthModalStep('signin');
      setNewPassword('');
      setConfirmPassword('');
      setOtpCode('');
      setAuthError(null);
      alert("Password successfully reset! Please sign in.");
    } catch (err: any) {
      setAuthError(err.message);
      setAuthModalStep('reset-password');
      setNewPassword('');
      setConfirmPassword('');
      setOtpCode('');
    }
  };

  const handleSendOtpForSignup = async () => {
    setCooldown(60);
    try {
      await fetch('http://localhost:8083/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendOtpForForgotPassword = async () => {
    setCooldown(60);
    try {
      await fetch('http://localhost:8083/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    if (token) {
      fetch('http://localhost:8083/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).catch(err => console.error(err));
    }
    localStorage.removeItem('token');
    localStorage.removeItem('guest_chats');
    setToken(null);
    setUser(null);
    setChats([]);
    setMessages([]);
    setActiveChatId(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setOtpCode('');
    setNewPassword('');
  };

  // Handle voice speech
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

  // Speak assistant replies ONLY in voice mode
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
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 dark:bg-[#090909] dark:text-[#F5F5F5] font-sans overflow-hidden transition-colors duration-300">
      
      {/* Left Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-50 dark:bg-[#0F0F0F] border-r border-slate-200/50 dark:border-[#2A2A2A]
        flex flex-col transform transition-transform duration-300 ease-in-out
        md:static md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200/50 dark:border-[#2A2A2A]">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="font-bold text-base tracking-tight text-slate-800 dark:text-[#F5F5F5] select-none">Jarvis</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-655 dark:hover:text-slate-250 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-4 bg-gradient-to-r from-[#D4AF6A] to-[#C89B5C] text-[#090909] font-semibold text-xs rounded-xl hover:opacity-90 active:scale-[0.98] transition-all duration-200 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Chat History Section */}
        <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1">
          <div className="px-3 mb-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
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
                  className={`group relative flex items-center justify-between pl-4.5 pr-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 text-xs border ${
                    activeChatId === chat.id
                      ? 'bg-white dark:bg-[#181818] text-slate-800 dark:text-[#F5F5F5] font-semibold border-slate-200/50 dark:border-[#2A2A2A] shadow-xs'
                      : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-800 dark:text-[#9A9A9A] dark:hover:bg-[#1E1E1E] dark:hover:text-[#F5F5F5] border-transparent'
                  }`}
                >
                  {activeChatId === chat.id && (
                    <div className="absolute left-0 top-[25%] bottom-[25%] w-[3px] bg-[#D4AF6A] rounded-r-md" />
                  )}
                  <div className="flex items-center gap-2 overflow-hidden">
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-75 text-[#D4AF6A]" />
                    <span className="truncate">{chat.title}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-455 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-all duration-150 cursor-pointer"
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
        <header className="h-[72px] w-full flex items-center justify-between px-8 bg-white/75 dark:bg-[#090909]/75 border-b border-slate-200/50 dark:border-[#2A2A2A] backdrop-blur-xl z-30 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200/50 dark:border-slate-800 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-400 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
            {messages.length > 0 && (
              <h1 className="text-xl font-semibold text-slate-855 dark:text-[#F5F5F5] select-none tracking-tight animate-fade-in">
                {chats.find(c => c.id === activeChatId)?.title}
              </h1>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3.5">
            
            {/* Audio Synthesis Info & Controls */}
            {(lastInputMode === 'voice' || isSpeaking || isListening) && (
              <div className="flex items-center gap-3.5 mr-1 border-r border-slate-200/50 dark:border-[#2A2A2A] pr-4">
                {isSpeaking && (
                  <button
                    onClick={stopSpeaking}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-red-500 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 rounded-lg transition-colors font-semibold"
                    title="Stop audio presentation"
                  >
                    <Square className="w-2.5 h-2.5 fill-current" />
                    <span>Stop</span>
                  </button>
                )}
                {isListening && (
                  <span className="flex h-2 w-2 relative mx-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
                {isSpeaking && !isMuted && (
                  <div className="flex items-end gap-0.5 h-3 mx-1">
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
                  className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-[#D4AF6A] hover:bg-slate-100/60 dark:hover:bg-[#1E1E1E] transition-colors cursor-pointer"
                  title={isMuted ? "Unmute speech feedback" : "Mute speech feedback"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
            )}

            {/* Light/Dark mode toggler */}
            <button
              onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
              className="w-10 h-10 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-850 dark:text-[#9A9A9A] dark:hover:text-[#F5F5F5] hover:bg-slate-100/60 dark:hover:bg-[#1E1E1E] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Optional Settings button */}
            <button 
              onClick={() => setSettingsOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-850 dark:text-[#9A9A9A] dark:hover:text-[#F5F5F5] hover:bg-slate-100/60 dark:hover:bg-[#1E1E1E] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Profile Avatar Dropdown Menu (If Authenticated) */}
            {user ? (
              <div className="relative ml-1" ref={profileMenuRef}>
                <button
                  onClick={() => setProfileMenuOpen(prev => !prev)}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-tr from-[#D4AF6A] to-[#C89B5C] text-[#090909] font-bold text-xs transition-all hover:scale-105 active:scale-95 shadow-xs border border-white/20 select-none cursor-pointer hover:ring-4 hover:ring-[#D4AF6A]/15"
                  title={user.email}
                >
                  {user.fullName ? user.fullName.substring(0, 2).toUpperCase() : user.email.substring(0, 2).toUpperCase()}
                </button>
                {profileMenuOpen && (
                  <>
                    <style>{`
                      @keyframes profileDropdownEnter {
                        from {
                          opacity: 0;
                          transform: translateY(4px);
                        }
                        to {
                          opacity: 1;
                          transform: translateY(0);
                        }
                      }
                      .animate-profile-dropdown {
                        animation: profileDropdownEnter 150ms ease-out forwards;
                      }
                    `}</style>
                    <div 
                      className="absolute right-0 mt-2.5 w-[280px] rounded-xl p-4 z-50 animate-profile-dropdown select-none border border-slate-200/50 dark:border-[#2A2A2A]"
                      style={{
                        backgroundColor: theme === 'dark' ? '#0F0F0F' : '#ffffff',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
                        opacity: 1,
                        backdropFilter: 'none',
                        WebkitBackdropFilter: 'none',
                        filter: 'none',
                        mixBlendMode: 'normal',
                        borderRadius: '12px'
                      }}
                    >
                      {/* Triangle pointer tip matching reference */}
                      <div 
                        className="absolute right-4.5 -top-1.5 w-2.5 h-2.5 rotate-45 border-t border-l border-slate-200/50 dark:border-[#2A2A2A]"
                        style={{
                          backgroundColor: theme === 'dark' ? '#0F0F0F' : '#ffffff',
                          opacity: 1,
                          backdropFilter: 'none',
                          WebkitBackdropFilter: 'none',
                          filter: 'none',
                          mixBlendMode: 'normal'
                        }}
                      />

                      <div className="flex items-center gap-3 py-1 px-0.5">
                        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-tr from-[#D4AF6A] to-[#C89B5C] text-[#090909] font-bold text-xs select-none">
                          {user.fullName ? user.fullName.substring(0, 2).toUpperCase() : user.email.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-slate-805 dark:text-[#F5F5F5] truncate">
                            {user.fullName || 'User Account'}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-[#9A9A9A] truncate mt-0.5">
                            {user.email}
                          </span>
                        </div>
                      </div>
                      
                      <div className="h-px bg-slate-100 dark:bg-[#2A2A2A] my-3.5" />
                      
                      <button
                        onClick={(e) => {
                          setProfileMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#ff7b7b] bg-slate-50 dark:bg-[#181818] hover:bg-slate-100 dark:hover:bg-[#1E1E1E] rounded-lg transition-all duration-250 font-semibold cursor-pointer border border-transparent active:scale-[0.98]"
                      >
                        <LogOut className="w-4 h-4 text-[#ff7b7b] flex-shrink-0" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              // Sign In Button for Guest Mode
              <button
                onClick={() => {
                  setAuthError(null);
                  setAuthModalStep('signin');
                  setAuthModalOpen(true);
                }}
                className="flex items-center gap-1.5 h-10 px-5 bg-gradient-to-r from-[#D4AF6A] to-[#C89B5C] text-[#090909] font-semibold text-xs rounded-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-[#D4AF6A]/10 cursor-pointer ml-1"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {dbError && (
          <div className="bg-red-500 text-white text-xs py-2 px-6 flex justify-between items-center z-20">
            <span>{dbError}</span>
            <button onClick={() => setDbError(null)} className="hover:text-red-200 font-bold ml-4">✕</button>
          </div>
        )}
        {/* Messaging Box */}
        <div className="flex-1 overflow-hidden relative bg-slate-50 dark:bg-[#090909]">
          <ChatContainer messages={messages} isTyping={isTyping} />
        </div>
        {/* Input box section */}
        <div className="p-4 md:p-6 border-t border-slate-200/50 dark:border-[#2A2A2A] bg-white dark:bg-[#0F0F0F] transition-colors">
          <div className="max-w-3xl mx-auto flex flex-col gap-3">
            
            <form
              onSubmit={handleSubmit}
              className="relative flex items-center bg-slate-50 dark:bg-[#151515] border border-slate-200/60 dark:border-[#2A2A2A] rounded-xl p-1.5 focus-within:border-[#D4AF6A] focus-within:ring-2 focus-within:ring-[#D4AF6A]/10 transition-all duration-200 shadow-xs"
            >
              {hasRecognition && (
                <button
                  type="button"
                  onClick={toggleListen}
                  className={`p-2 rounded-lg transition-all duration-200 cursor-pointer ${
                    isListening
                      ? 'bg-red-500/10 text-red-500'
                      : 'text-slate-400 hover:text-slate-655 dark:text-[#9A9A9A] dark:hover:text-[#D4AF6A] hover:bg-slate-100 dark:hover:bg-[#1E1E1E]'
                  }`}
                  title={isListening ? "Stop voice listening" : "Start speech recording"}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "Listening... speak now" : "Message Jarvis..."}
                className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-slate-800 dark:text-[#F5F5F5] placeholder-slate-400 dark:placeholder-[#8A8A8A] text-sm font-sans"
                disabled={isTyping || isListening}
              />

              <button
                type="submit"
                disabled={!input.trim() || isTyping || isListening}
                className="p-1.5 w-8 h-8 bg-gradient-to-r from-[#D4AF6A] to-[#C89B5C] text-[#090909] disabled:bg-slate-100 disabled:text-slate-300 dark:disabled:bg-[#181818] dark:disabled:text-[#9A9A9A] rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center shadow-xs"
                title="Send command"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </form>

            <div className="text-center text-[10px] text-slate-400 dark:text-slate-500 tracking-wide select-none uppercase font-semibold">
              Jarvis &bull; Powered by advanced AI model
            </div>
          </div>
        </div>

      </div>      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div 
            onClick={() => setSettingsOpen(false)}
            className="absolute inset-0 bg-slate-950/45 dark:bg-slate-950/60 backdrop-blur-md transition-opacity duration-200"
          />
          
          {/* Modal Panel */}
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-xl shadow-xl z-10 overflow-hidden transition-all duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200/50 dark:border-slate-800/60">
              <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100 font-sans tracking-tight">Settings</h3>
              <button 
                onClick={() => setSettingsOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-5 space-y-5">
              
              {/* Theme Preference */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-250 font-sans">Theme Preference</h4>
                  <p className="text-[11px] text-slate-450 dark:text-slate-500 font-sans">Toggle between light and dark themes</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold border border-slate-200/60 dark:border-slate-800 hover:bg-slate-100/60 dark:hover:bg-slate-850 rounded-xl transition-all duration-200 text-slate-650 dark:text-slate-300 font-sans active:scale-95 cursor-pointer"
                >
                  {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                  <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                </button>
              </div>
              
              {/* Clear Chat History */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-850/60 pt-5">
                <div>
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-250 font-sans">Clear Chat History</h4>
                  <p className="text-[11px] text-slate-450 dark:text-slate-500 font-sans">Permanently delete all conversations from history</p>
                </div>
                <button
                  type="button"
                  onClick={handleClearAllChats}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-red-650 dark:text-red-400 border border-red-200/50 dark:border-red-900/30 bg-red-50 dark:bg-red-950/10 hover:bg-red-100 dark:hover:bg-red-950/25 rounded-xl transition-all duration-200 font-sans active:scale-95 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              </div>
              
              {/* About Jarvis */}
              <div className="border-t border-slate-100 dark:border-slate-850/60 pt-5">
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-250 mb-2 font-sans">About</h4>
                <div className="p-3 bg-slate-50/50 dark:bg-slate-900/40 rounded-lg border border-slate-150 dark:border-slate-850 text-xs space-y-1 text-slate-500 dark:text-slate-400 font-sans">
                  <div className="font-semibold text-slate-700 dark:text-slate-350">Jarvis AI Chatbot</div>
                  <div>Version 1.0</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-mono">© 2026 Jarvis. All rights reserved.</div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      )}

      {/* SaaS Authentication Modal */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop blur overlay */}
          <div 
            onClick={() => {
              if (authModalStep !== 'loading') setAuthModalOpen(false);
            }}
            className="absolute inset-0 bg-slate-950/45 dark:bg-slate-950/60 backdrop-blur-md transition-opacity duration-200"
          />

          {/* Modal Panel */}
          <div className="relative w-full max-w-md bg-white dark:bg-[#0F0F0F] border border-slate-200/50 dark:border-[#2A2A2A] rounded-[20px] shadow-2xl z-10 overflow-hidden transition-all duration-200 p-6 flex flex-col items-center gap-5">
            
            {/* Close Button */}
            {authModalStep !== 'loading' && (
              <button 
                onClick={() => setAuthModalOpen(false)}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-[#181818] border border-[#2A2A2A] hover:bg-[#1E1E1E] text-[#9A9A9A] hover:text-[#D4AF6A] transition-all duration-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Logo */}
            <div className="flex flex-col items-center gap-2 text-center z-10">
              <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-[#D4AF6A] to-[#C89B5C] text-[#090909] font-bold text-2xl shadow-sm select-none">
                <div className="absolute inset-0 bg-[#D4AF6A]/20 rounded-xl blur-md" />
                <span className="z-10">J</span>
              </div>
              <h2 className="text-xl font-bold text-slate-850 dark:text-[#F5F5F5] tracking-tight mt-1.5">
                {authModalStep === 'signin' && 'Sign In to Jarvis'}
                {authModalStep === 'signup' && 'Create Your Mainframe Account'}
                {authModalStep === 'verify-signup' && 'Verify Your Email'}
                {authModalStep === 'forgot-password' && 'Password Reset Request'}
                {authModalStep === 'reset-password' && 'Create New Password'}
                {authModalStep === 'loading' && 'Authorizing'}
              </h2>
              <p className="text-xs text-slate-450 dark:text-[#CFCFCF] font-medium">
                {authModalStep === 'signin' && 'Welcome back. Initialize system authentication.'}
                {authModalStep === 'signup' && 'Activate secondary secure credentials.'}
                {authModalStep === 'verify-signup' && `Enter the 6-digit code sent to ${email}.`}
                {authModalStep === 'forgot-password' && 'Send a secure verification code to your Gmail.'}
                {authModalStep === 'reset-password' && 'Override credentials and restore access.'}
              </p>
            </div>

            {/* Forms */}
            <div className="w-full z-10">
              {authModalStep === 'loading' && (
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                  <div className="w-10 h-10 border-4 border-[#D4AF6A] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-450 dark:text-[#9A9A9A] animate-pulse uppercase tracking-wider font-semibold">
                    Processing protocol...
                  </p>
                </div>
              )}

              {/* Sign In */}
              {authModalStep === 'signin' && (
                <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-455 dark:text-[#9A9A9A] uppercase tracking-wider">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-[#2A2A2A] rounded-lg px-3.5 py-2 text-sm text-slate-800 dark:text-[#F5F5F5] placeholder-slate-400 dark:placeholder-[#8A8A8A] outline-none focus:border-[#D4AF6A] focus:ring-2 focus:ring-[#D4AF6A]/10 transition-all duration-200"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-455 dark:text-[#9A9A9A] uppercase tracking-wider">Password</label>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthError(null);
                          setAuthModalStep('forgot-password');
                        }}
                        className="text-xs text-[#D4AF6A] hover:underline font-semibold animate-fade-in cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type={showSignInPass ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-[#2A2A2A] rounded-lg pl-3.5 pr-10 py-2 text-sm text-slate-800 dark:text-[#F5F5F5] placeholder-slate-400 dark:placeholder-[#8A8A8A] outline-none focus:border-[#D4AF6A] focus:ring-2 focus:ring-[#D4AF6A]/10 transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPass(!showSignInPass)}
                        className="absolute right-3 text-slate-400 hover:text-slate-655 dark:hover:text-[#D4AF6A] transition-colors cursor-pointer"
                      >
                        {showSignInPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {authError && <p className="text-xs text-red-500 font-semibold">{authError}</p>}
                  <button
                    type="submit"
                    className="w-full py-2 bg-gradient-to-r from-[#D4AF6A] to-[#C89B5C] text-[#090909] font-semibold text-xs rounded-xl hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#D4AF6A]/10 active:scale-[0.98] transition-all duration-200 cursor-pointer mt-2"
                  >
                    Sign In
                  </button>
                  <p className="text-xs text-center text-slate-455 dark:text-[#9A9A9A] mt-2 font-medium">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthError(null);
                        setAuthModalStep('signup');
                      }}
                      className="text-[#D4AF6A] font-bold hover:underline cursor-pointer"
                    >
                      Sign Up
                    </button>
                  </p>
                </form>
              )}

              {/* Sign Up */}
              {authModalStep === 'signup' && (
                <form onSubmit={handleSignUp} className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-455 dark:text-[#9A9A9A] uppercase tracking-wider">Full Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-[#2A2A2A] rounded-lg px-3.5 py-2 text-sm text-slate-800 dark:text-[#F5F5F5] placeholder-slate-400 dark:placeholder-[#8A8A8A] outline-none focus:border-[#D4AF6A] focus:ring-2 focus:ring-[#D4AF6A]/10 transition-all duration-200"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-455 dark:text-[#9A9A9A] uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-[#2A2A2A] rounded-lg px-3.5 py-2 text-sm text-slate-800 dark:text-[#F5F5F5] placeholder-slate-400 dark:placeholder-[#8A8A8A] outline-none focus:border-[#D4AF6A] focus:ring-2 focus:ring-[#D4AF6A]/10 transition-all duration-200"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-455 dark:text-[#9A9A9A] uppercase tracking-wider">Password</label>
                    <div className="relative flex items-center">
                      <input
                        type={showSignUpPass ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-[#2A2A2A] rounded-lg pl-3.5 pr-10 py-2 text-sm text-slate-800 dark:text-[#F5F5F5] placeholder-slate-400 dark:placeholder-[#8A8A8A] outline-none focus:border-[#D4AF6A] focus:ring-2 focus:ring-[#D4AF6A]/10 transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpPass(!showSignUpPass)}
                        className="absolute right-3 text-slate-400 hover:text-slate-655 dark:hover:text-[#D4AF6A] transition-colors cursor-pointer"
                      >
                        {showSignUpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-455 dark:text-[#9A9A9A] uppercase tracking-wider">Confirm Password</label>
                    <div className="relative flex items-center">
                      <input
                        type={showSignUpConfirmPass ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-[#2A2A2A] rounded-lg pl-3.5 pr-10 py-2 text-sm text-slate-800 dark:text-[#F5F5F5] placeholder-slate-400 dark:placeholder-[#8A8A8A] outline-none focus:border-[#D4AF6A] focus:ring-2 focus:ring-[#D4AF6A]/10 transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpConfirmPass(!showSignUpConfirmPass)}
                        className="absolute right-3 text-slate-400 hover:text-slate-655 dark:hover:text-[#D4AF6A] transition-colors cursor-pointer"
                      >
                        {showSignUpConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {authError && <p className="text-xs text-red-500 font-semibold">{authError}</p>}
                  <button
                    type="submit"
                    className="w-full py-2 bg-gradient-to-r from-[#D4AF6A] to-[#C89B5C] text-[#090909] font-semibold text-xs rounded-xl hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#D4AF6A]/10 active:scale-[0.98] transition-all duration-200 cursor-pointer mt-2"
                  >
                    Create Account
                  </button>
                  <p className="text-xs text-center text-slate-455 dark:text-[#9A9A9A] mt-2 font-medium">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthError(null);
                        setAuthModalStep('signin');
                      }}
                      className="text-[#D4AF6A] font-bold hover:underline cursor-pointer"
                    >
                      Sign In
                    </button>
                  </p>
                </form>
              )}

              {/* Verify OTP (Signup & Forgot password use this similarly or separate screens) */}
              {authModalStep === 'verify-signup' && (
                <form onSubmit={handleVerifySignUp} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-455 dark:text-[#9A9A9A] uppercase tracking-wider text-center">Enter 6-Digit Code</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      pattern="\d{6}"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Enter verification code"
                      className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-[#2A2A2A] rounded-lg px-4 py-2 text-center text-sm font-semibold tracking-[0.25em] text-slate-800 dark:text-[#F5F5F5] placeholder-slate-400 dark:placeholder-[#8A8A8A] outline-none focus:border-[#D4AF6A] focus:ring-2 focus:ring-[#D4AF6A]/10 transition-all duration-200"
                    />
                  </div>
                  {authError && <p className="text-xs text-red-500 font-semibold">{authError}</p>}
                  <button
                    type="submit"
                    className="w-full py-2 bg-gradient-to-r from-[#D4AF6A] to-[#C89B5C] text-[#090909] font-semibold text-xs rounded-xl hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#D4AF6A]/10 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                  >
                    Verify Code
                  </button>
                  <div className="flex items-center justify-between text-xs mt-2 font-medium">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthError(null);
                        setAuthModalStep('signup');
                      }}
                      className="text-[#9A9A9A] hover:text-slate-700 dark:hover:text-[#D4AF6A] font-semibold cursor-pointer"
                    >
                      Back to Sign Up
                    </button>
                    <button
                      type="button"
                      disabled={cooldown > 0}
                      onClick={() => handleSendOtpForSignup()}
                      className="text-[#D4AF6A] hover:text-blue-750 disabled:text-slate-400 dark:disabled:text-slate-650 font-bold cursor-pointer"
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                    </button>
                  </div>
                </form>
              )}

              {/* Forgot Password */}
              {authModalStep === 'forgot-password' && (
                <form onSubmit={handleForgotPasswordSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-455 dark:text-[#9A9A9A] uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your registered email"
                      className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-[#2A2A2A] rounded-lg px-3.5 py-2 text-sm text-slate-850 dark:text-[#F5F5F5] placeholder-slate-400 dark:placeholder-[#8A8A8A] outline-none focus:border-[#D4AF6A] focus:ring-2 focus:ring-[#D4AF6A]/10 transition-all duration-200"
                    />
                  </div>
                  {authError && <p className="text-xs text-red-500 font-semibold">{authError}</p>}
                  <button
                    type="submit"
                    className="w-full py-2 bg-gradient-to-r from-[#D4AF6A] to-[#C89B5C] text-[#090909] font-semibold text-xs rounded-xl hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#D4AF6A]/10 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                  >
                    Send Recovery Code
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError(null);
                      setAuthModalStep('signin');
                    }}
                    className="w-full text-center text-xs text-slate-455 hover:text-slate-700 dark:text-[#9A9A9A] dark:hover:text-[#D4AF6A] font-semibold mt-1 transition-colors cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </form>
              )}

              {/* Reset Password */}
              {authModalStep === 'reset-password' && (
                <form onSubmit={handleResetPasswordSubmit} className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-455 dark:text-[#9A9A9A] uppercase tracking-wider text-center">6-Digit Recovery Code</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      pattern="\d{6}"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Enter verification code"
                      className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-[#2A2A2A] rounded-lg px-4 py-2 text-center text-sm font-semibold tracking-[0.25em] text-slate-850 dark:text-[#F5F5F5] placeholder-slate-400 dark:placeholder-[#8A8A8A] outline-none focus:border-[#D4AF6A] focus:ring-2 focus:ring-[#D4AF6A]/10 transition-all duration-200"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-455 dark:text-[#9A9A9A] uppercase tracking-wider">New Password</label>
                    <div className="relative flex items-center">
                      <input
                        type={showResetPass ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-[#2A2A2A] rounded-lg pl-3.5 pr-10 py-2 text-sm text-slate-850 dark:text-[#F5F5F5] placeholder-slate-400 dark:placeholder-[#8A8A8A] outline-none focus:border-[#D4AF6A] focus:ring-2 focus:ring-[#D4AF6A]/10 transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPass(!showResetPass)}
                        className="absolute right-3 text-slate-455 hover:text-slate-655 dark:hover:text-[#D4AF6A] transition-colors cursor-pointer"
                      >
                        {showResetPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-455 dark:text-[#9A9A9A] uppercase tracking-wider">Confirm New Password</label>
                    <div className="relative flex items-center">
                      <input
                        type={showResetConfirmPass ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-[#2A2A2A] rounded-lg pl-3.5 pr-10 py-2 text-sm text-slate-800 dark:text-[#F5F5F5] placeholder-slate-400 dark:placeholder-[#8A8A8A] outline-none focus:border-[#D4AF6A] focus:ring-2 focus:ring-[#D4AF6A]/10 transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetConfirmPass(!showResetConfirmPass)}
                        className="absolute right-3 text-slate-455 hover:text-slate-655 dark:hover:text-[#D4AF6A] transition-colors cursor-pointer"
                      >
                        {showResetConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {authError && <p className="text-xs text-red-500 font-semibold">{authError}</p>}
                  <button
                    type="submit"
                    className="w-full py-2 bg-gradient-to-r from-[#D4AF6A] to-[#C89B5C] text-[#090909] font-semibold text-xs rounded-xl hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#D4AF6A]/10 active:scale-[0.98] transition-all duration-200 cursor-pointer mt-2"
                  >
                    Reset Password
                  </button>
                  <div className="flex items-center justify-between text-xs mt-2 font-medium">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthError(null);
                        setAuthModalStep('forgot-password');
                      }}
                      className="text-slate-455 hover:text-slate-700 dark:text-[#9A9A9A] dark:hover:text-[#D4AF6A] font-semibold transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={cooldown > 0}
                      onClick={() => handleSendOtpForForgotPassword()}
                      className="text-[#D4AF6A] hover:text-blue-750 disabled:text-slate-400 dark:disabled:text-slate-650 font-bold cursor-pointer"
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default App;
