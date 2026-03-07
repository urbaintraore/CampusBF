import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Send, MoreVertical, Phone, Video } from 'lucide-react';
import { MOCK_MESSAGES, MOCK_TUTORS, MOCK_MARKETPLACE, CURRENT_USER } from '@/data/mock';
import { cn } from '@/lib/utils';

export default function Messages() {
  const location = useLocation();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const chatId = params.get('chat');
    if (chatId) {
      setSelectedChat(chatId);
    } else if (!selectedChat) {
      setSelectedChat('u5'); // Default chat
    }
  }, [location.search]);

  // Mock getting conversations from messages
  // In a real app, this would be a distinct API call
  const conversations = [
    {
      user: MOCK_TUTORS[0].user,
      lastMessage: MOCK_MESSAGES[0],
      unread: 1,
    },
    {
      user: MOCK_MARKETPLACE[0].seller,
      lastMessage: MOCK_MESSAGES[2],
      unread: 0,
    }
  ];

  const activeConversation = conversations.find(c => c.user.id === selectedChat);

  return (
    <div className="h-[calc(100vh-140px)] bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex">
      {/* Sidebar List */}
      <div className="w-full md:w-80 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <button
              key={conv.user.id}
              onClick={() => setSelectedChat(conv.user.id)}
              className={cn(
                "w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50",
                selectedChat === conv.user.id ? "bg-emerald-50/50 hover:bg-emerald-50/80" : ""
              )}
            >
              <div className="relative">
                <img src={conv.user.avatarUrl} alt="" className="w-12 h-12 rounded-full bg-gray-200 object-cover" />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">{conv.user.firstName} {conv.user.lastName}</h3>
                  <span className="text-xs text-gray-400 whitespace-nowrap">10:30</span>
                </div>
                <p className={cn("text-sm truncate", conv.unread ? "font-semibold text-gray-900" : "text-gray-500")}>
                  {conv.lastMessage.content}
                </p>
              </div>
              {conv.unread > 0 && (
                <div className="w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-1">
                  {conv.unread}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      {selectedChat ? (
        <div className="hidden md:flex flex-1 flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
            <div className="flex items-center gap-3">
              <img src={activeConversation?.user.avatarUrl} alt="" className="w-10 h-10 rounded-full bg-gray-200" />
              <div>
                <h3 className="font-bold text-gray-900">{activeConversation?.user.firstName} {activeConversation?.user.lastName}</h3>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  En ligne
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><Phone size={20} /></button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><Video size={20} /></button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><MoreVertical size={20} /></button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
            {MOCK_MESSAGES.filter(m => 
              (m.senderId === selectedChat && m.receiverId === CURRENT_USER.id) || 
              (m.senderId === CURRENT_USER.id && m.receiverId === selectedChat)
            ).map((msg) => {
              const isMe = msg.senderId === CURRENT_USER.id;
              return (
                <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[70%] rounded-2xl px-5 py-3 shadow-sm",
                    isMe 
                      ? "bg-emerald-600 text-white rounded-tr-none" 
                      : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
                  )}>
                    <p className="text-sm">{msg.content}</p>
                    <p className={cn("text-[10px] mt-1 text-right", isMe ? "text-emerald-100" : "text-gray-400")}>
                      {msg.timestamp.split('T')[1].slice(0, 5)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Écrivez votre message..." 
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && messageInput.trim()) {
                    // Handle send (mock)
                    setMessageInput('');
                  }
                }}
              />
              <button className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200">
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
          <div className="text-center text-gray-400">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send size={32} />
            </div>
            <p>Sélectionnez une conversation pour commencer</p>
          </div>
        </div>
      )}
    </div>
  );
}
