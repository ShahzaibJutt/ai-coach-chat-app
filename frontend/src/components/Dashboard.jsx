import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStreamChat } from '../contexts/StreamChatContext';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  Send, 
  Plus, 
  MessageCircle, 
  Menu, 
  X, 
  ChevronLeft,
  ChevronRight,
  User,
  Bell,
  Brain
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

function Dashboard() {
  const { currentUser, logout } = useAuth();
  const { chatClient } = useStreamChat();
  const navigate = useNavigate();
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [newChannelName, setNewChannelName] = useState('');
  const [showNewChannelForm, setShowNewChannelForm] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Ref for auto-scrolling
  const messagesEndRef = useRef(null);

  // Function to scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load channels when chat client or user changes (do not depend on selectedChannel)
  useEffect(() => {
    const loadChannels = async () => {
      if (!chatClient) {
        console.log('Chat client not available');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        console.log('Loading channels for user:', currentUser?.userId);
        
        const filter = { type: 'messaging', members: { $in: [currentUser.userId] } };
        const sort = [{ last_message_at: -1 }];
        
        const channels = await chatClient.queryChannels(filter, sort, {
          watch: true,
          state: true,
        });
        
        console.log('Loaded chats:', channels.length);
        setChannels(channels);
        
        // Select the first channel by default if available
        if (channels.length > 0 && !selectedChannel) {
          setSelectedChannel(channels[0]);
        }
      } catch (error) {
        console.error('Error loading chats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (chatClient) {
      loadChannels();
    }
  }, [chatClient, currentUser]);

  // Function to forward new messages to your AI backend
  const handleNewMessage = useCallback(async (event) => {
    // Only forward messages from the current user (not from the AI)
    if (event.user?.id === currentUser.userId) {
      try {
        console.log('Forwarding message to AI backend:', event);
        const payload = {
          message: event.message,
          user: event.user,
          cid: event.cid,
          type: 'message.new'
        };
        const response = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/ai/new-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
          },
          body: JSON.stringify(payload),
        });
        
        if (!response.ok) {
          throw new Error(`Backend responded with status: ${response.status}`);
        }
        
        console.log('Successfully sent message to AI backend');
      } catch (error) {
        console.error('Error forwarding message to AI backend:', error);
      }
    }
  }, [currentUser]);

  // Listen for new and updated messages and update state
  useEffect(() => {
    if (selectedChannel) {
      const loadMessages = async () => {
        try {
          const response = await selectedChannel.query({ messages: { limit: 50 } });
          setMessages(response.messages);
        } catch (error) {
          console.error('Error loading messages:', error);
        }
      };
      
      loadMessages();
      
      // Listener for new messages
      const handleMessageNew = (event) => {
        setMessages((prevMessages) => {
          // Avoid duplicate messages
          const messageExists = prevMessages.some(msg => msg.id === event.message.id);
          if (messageExists) return prevMessages;
          return [...prevMessages, event.message];
        });
        
        // Forward user messages to AI backend
        if (event.user?.id === currentUser.userId) {
          handleNewMessage(event);
        }
        
        // Bring channel to top of list
        setChannels(prevChannels => {
          const updatedChannels = [...prevChannels];
          const channelIndex = updatedChannels.findIndex(c => c.id === selectedChannel.id);
          if (channelIndex > 0) {
            const [channel] = updatedChannels.splice(channelIndex, 1);
            updatedChannels.unshift(channel);
          }
          return updatedChannels;
        });
      };

      selectedChannel.on('message.new', handleMessageNew);

      // Listener for updated messages (for streaming partial updates)
      const handleMessageUpdated = (event) => {
        setMessages(prevMessages => {
          const index = prevMessages.findIndex(msg => msg.id === event.message.id);
          if (index !== -1) {
            const updatedMessages = [...prevMessages];
            updatedMessages[index] = event.message;
            return updatedMessages;
          }
          return prevMessages;
        });
      };

      selectedChannel.on('message.updated', handleMessageUpdated);

      return () => {
        selectedChannel.off('message.new', handleMessageNew);
        selectedChannel.off('message.updated', handleMessageUpdated);
      };
    }
  }, [selectedChannel, handleNewMessage, currentUser]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !selectedChannel) return;
    
    try {
      await selectedChannel.sendMessage({
        text: newMessage,
      });
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (newChannelName.trim() === '' || !chatClient) return;
    
    try {
      const channelId = `${newChannelName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
      
      const channel = chatClient.channel('messaging', channelId, {
        name: newChannelName,
        members: [currentUser.userId, import.meta.env.VITE_AI_BOT_USER_ID],
        created_by_id: currentUser.userId
      });
      
      await channel.create();
      console.log('Chat created successfully:', channel.id);
      
      await channel.watch();
      
      // Add the new channel on top of the list without reloading all chats
      setChannels((prevChannels) => [channel, ...prevChannels]);
      setSelectedChannel(channel);
      setMessages([]);
      setNewChannelName('');
      setShowNewChannelForm(false);
    } catch (error) {
      console.error('Error creating chat:', error);
      alert('Failed to create chat: ' + error.message);
    }
  };

  const selectChannel = async (channel) => {
    setSelectedChannel(channel);
    setMessages([]);
    
    try {
      const response = await channel.query({ messages: { limit: 25 } });
      setMessages(response.messages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
    
    if (window.innerWidth < 768) {
      setSidebarCollapsed(true);
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md z-10 flex-shrink-0">
        <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button 
                onClick={toggleSidebar}
                className="mr-4 p-2 rounded-full hover:bg-gray-100 hidden md:flex"
                aria-label="Toggle sidebar"
              >
                {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </button>
              <button 
                onClick={toggleMobileMenu}
                className="mr-4 p-2 rounded-full hover:bg-gray-100 md:hidden"
                aria-label="Toggle mobile menu"
              >
                <Menu size={20} />
              </button>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Brain className="mr-2 text-blue-600" size={24} />
                <span>AI Coach</span>
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-full hover:bg-gray-100" aria-label="Notifications">
                <Bell size={20} className="text-gray-600" />
              </button>
              <div className="hidden md:flex items-center">
                <div className="flex items-center bg-blue-50 rounded-full p-1 pr-3">
                  <div className="bg-blue-600 text-white rounded-full p-1 mr-2">
                    <User size={18} />
                  </div>
                  <span className="font-medium text-blue-800">{currentUser?.userId}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-3 rounded-md flex items-center text-sm"
              >
                <LogOut size={16} className="mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="md:hidden bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
          <div className="p-4 flex justify-between items-center">
            <h2 className="font-semibold">Menu</h2>
            <button onClick={toggleMobileMenu} className="p-2">
              <X size={20} />
            </button>
          </div>
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center mb-4">
              <div className="bg-blue-600 text-white rounded-full p-2 mr-3">
                <User size={20} />
              </div>
              <div>
                <p className="font-medium">{currentUser?.userId}</p>
                <p className="text-sm text-gray-500">Online</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowMobileMenu(false);
                setSidebarCollapsed(false);
              }}
              className="w-full text-left p-3 mb-2 flex items-center bg-blue-50 rounded-md"
            >
              <MessageCircle size={18} className="mr-2 text-blue-600" />
              <span>Chats</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left p-3 flex items-center text-red-600 rounded-md hover:bg-red-50"
            >
              <LogOut size={18} className="mr-2" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
      
      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar - Chat List */}
        <div 
          className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${
            sidebarCollapsed ? 'w-0 md:w-16 overflow-hidden' : 'w-full md:w-1/4'
          } ${showMobileMenu ? 'hidden md:flex' : 'hidden md:flex'}`}
        >
          <div className={`p-4 border-b border-gray-200 flex justify-between items-center ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <h2 className={`font-semibold text-lg flex items-center ${sidebarCollapsed ? 'hidden' : ''}`}>
              <MessageCircle size={20} className="mr-2" />
              Chats
            </h2>
            {sidebarCollapsed && <MessageCircle size={20} className="text-blue-600" />}
            <button 
              onClick={() => setShowNewChannelForm(!showNewChannelForm)}
              className={`p-2 rounded-full hover:bg-gray-100 ${sidebarCollapsed ? 'hidden' : ''}`}
            >
              <Plus size={20} className="text-blue-600" />
            </button>
          </div>
          
          {/* New Chat Form */}
          {showNewChannelForm && !sidebarCollapsed && (
            <div className="p-4 border-b border-gray-200">
              <form onSubmit={handleCreateChannel} className="flex flex-col">
                <input
                  type="text"
                  placeholder="Chat name"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="p-2 border border-gray-300 rounded mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  type="submit"
                  className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors"
                >
                  Create Chat
                </button>
              </form>
            </div>
          )}
          
          {/* Chat List */}
          <div className="flex-grow overflow-y-auto">
            {loading ? (
              <div className={`p-4 text-center text-gray-500 ${sidebarCollapsed ? 'hidden' : ''}`}>Loading chats...</div>
            ) : channels.length === 0 ? (
              <div className={`p-4 text-center text-gray-500 ${sidebarCollapsed ? 'hidden' : ''}`}>
                No chats yet. Create one to start chatting!
              </div>
            ) : (
              <ul>
                {channels.map((channel) => (
                  <li key={channel.id}>
                    <button
                      onClick={() => selectChannel(channel)}
                      className={`w-full text-left p-3 flex items-center ${
                        selectedChannel?.id === channel.id
                          ? 'bg-blue-50 border-l-4 border-blue-500'
                          : 'hover:bg-gray-50'
                      } ${sidebarCollapsed ? 'justify-center p-2' : ''}`}
                    >
                      <MessageCircle size={20} className={`${sidebarCollapsed ? '' : 'mr-2'} text-gray-500 flex-shrink-0`} />
                      {!sidebarCollapsed && (
                        <div className="overflow-hidden">
                          <p className="font-medium truncate">{channel.data.name || 'Direct Message'}</p>
                          <p className="text-sm text-gray-500 truncate">
                            {channel.state.messages[channel.state.messages.length - 1]?.text || 'No messages yet'}
                          </p>
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        {/* Main Chat Area */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'md:w-[calc(100%-4rem)]' : 'md:w-3/4'}`}>
          {selectedChannel ? (
            <>
              {/* Channel Header */}
              <div className="p-4 border-b border-gray-200 bg-white shadow-sm flex items-center flex-shrink-0">
                {!sidebarCollapsed && window.innerWidth < 768 && (
                  <button 
                    onClick={toggleSidebar}
                    className="mr-3 p-1 rounded-full hover:bg-gray-100 md:hidden"
                  >
                    <ChevronLeft size={20} />
                  </button>
                )}
                <div>
                  <h2 className="font-semibold text-lg flex items-center">
                    {selectedChannel.data.name || 'Direct Message'}
                  </h2>
                  <p className="text-sm text-gray-500 flex items-center">
                    <MessageCircle size={14} className="mr-1" />
                    {selectedChannel.data.member_count || 2} participants
                  </p>
                </div>
              </div>
              
              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-10">
                    <Brain size={40} className="mx-auto mb-3 opacity-50" />
                    <p>No messages yet. Start the conversation with your AI Coach!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div
                        key={`${message.id}-${index}`}
                        className={`flex ${
                          message.user?.id === currentUser.userId ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg shadow-sm ${
                            message.user?.id === currentUser.userId
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-800 border border-gray-200'
                          }`}
                        >
                          {message.user?.id !== currentUser.userId && (
                            <p className="font-semibold text-xs mb-1 flex items-center">
                              {message.user?.id === import.meta.env.VITE_AI_BOT_USER_ID ? (
                                <>
                                  <Brain size={14} className="mr-1 text-blue-600" />
                                  AI Coach
                                </>
                              ) : (
                                message.user?.name || message.user?.id || 'Unknown User'
                              )}
                            </p>
                          )}
                          
                          {message.user?.id === currentUser.userId ? (
                            <p>{message.text}</p>
                          ) : (
                            <div className="markdown-content prose prose-sm max-w-none dark:prose-invert overflow-auto">
                              <ReactMarkdown>{message.text}</ReactMarkdown>
                            </div>
                          )}
                          
                          <p className="text-xs mt-1 opacity-70">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
              
              {/* Message Input */}
              <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Ask your AI Coach..."
                    className="flex-grow p-2 border border-gray-300 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 text-white p-2 rounded-r hover:bg-blue-700 flex items-center transition-colors"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center text-gray-500">
                <Brain size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-xl font-medium">Select a chat to start coaching</p>
                <p className="mt-2">Or create a new one using the + button</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
