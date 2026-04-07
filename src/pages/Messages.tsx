import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Send, MoreVertical, Phone, Video, Paperclip, X, FileText, Image as ImageIcon, Download, ChevronLeft, MessageCircle, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { User, Message } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { uploadFile } from '@/services/storageService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Conversation {
  id: string;
  user: User;
  lastMessage?: Message;
  unread: number;
  updatedAt: number;
}

export default function Messages() {
  const { user: currentUser, users, logAction } = useAuth();
  const location = useLocation();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Helper to generate conversation ID
  const getConversationId = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('_');
  };

  // Fetch conversations
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUser.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs: Conversation[] = [];
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const otherUserId = data.participants.find((id: string) => id !== currentUser.id);
        const otherUser = users.find(u => u.id === otherUserId);
        
        if (otherUser) {
          convs.push({
            id: docSnap.id,
            user: otherUser,
            lastMessage: data.lastMessage,
            unread: data.unreadCount?.[currentUser.id] || 0,
            updatedAt: data.updatedAt?.toMillis() || 0
          });
        }
      });
      
      // Sort by updatedAt descending
      convs.sort((a, b) => b.updatedAt - a.updatedAt);
      setConversations(convs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, users]);

  // Fetch messages for selected chat
  useEffect(() => {
    if (!currentUser || !selectedChat) return;

    const convId = getConversationId(currentUser.id, selectedChat);
    const q = query(
      collection(db, `conversations/${convId}/messages`),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate().toISOString() || new Date().toISOString()
      })) as Message[];
      setMessages(msgs);

      // Mark messages as read
      if (msgs.length > 0) {
        const unreadMsgs = msgs.filter(m => m.receiverId === currentUser.id && !m.read);
        if (unreadMsgs.length > 0) {
          // Update unread count in conversation
          updateDoc(doc(db, 'conversations', convId), {
            [`unreadCount.${currentUser.id}`]: 0
          }).catch(console.error);
          
          // We could also mark individual messages as read here
        }
      }
    });

    return () => unsubscribe();
  }, [currentUser, selectedChat]);

  // Handle URL chat parameter
  useEffect(() => {
    if (loading || !currentUser) return;

    const params = new URLSearchParams(location.search);
    const chatId = params.get('chat');
    
    if (chatId) {
      const existingConv = conversations.find(c => c.user.id === chatId);
      
      if (existingConv) {
        setSelectedChat(chatId);
      } else {
        const userToChat = users.find(u => u.id === chatId);
        
        if (userToChat) {
          // Create conversation document if it doesn't exist
          const convId = getConversationId(currentUser.id, chatId);
          getDoc(doc(db, 'conversations', convId)).then(docSnap => {
            if (!docSnap.exists()) {
              setDoc(doc(db, 'conversations', convId), {
                participants: [currentUser.id, chatId],
                updatedAt: serverTimestamp(),
                unreadCount: {
                  [currentUser.id]: 0,
                  [chatId]: 0
                }
              });
            }
          });
          setSelectedChat(chatId);
        }
      }
    } else if (!selectedChat && conversations.length > 0) {
      // Auto-select first chat only on desktop to avoid hiding the list on mobile
      if (window.innerWidth >= 768) {
        setSelectedChat(conversations[0].user.id);
      }
    }
  }, [location.search, users, conversations.length, loading, currentUser]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadAndSend = async () => {
    if (!selectedFile || !selectedChat || !currentUser) return;
    setIsUploading(true);
    try {
      const { url, fileName } = await uploadFile(selectedFile, 'messages');
      await handleSendMessage(url, selectedFile.type, fileName);
      setSelectedFile(null);
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (fileUrl?: string, fileType?: string, fileName?: string) => {
    if ((!messageInput.trim() && !fileUrl) || !selectedChat || !currentUser) return;

    const content = messageInput;
    setMessageInput(''); // Clear input immediately for better UX

    const convId = getConversationId(currentUser.id, selectedChat);
    const newMessage: Message = {
      senderId: currentUser.id,
      receiverId: selectedChat,
      content,
      timestamp: serverTimestamp() as any,
      read: false,
      fileUrl,
      fileType,
      fileName
    };

    try {
      // Add message to subcollection
      await addDoc(collection(db, `conversations/${convId}/messages`), newMessage);

      // Update conversation metadata
      await updateDoc(doc(db, 'conversations', convId), {
        lastMessage: {
          content: fileUrl ? (fileType?.startsWith('image/') ? 'Image' : 'Fichier') : content,
          senderId: currentUser.id,
          timestamp: new Date().toISOString()
        },
        updatedAt: serverTimestamp(),
      });
      
      // Log message sending
      if (typeof logAction === 'function') {
        await logAction('Envoi message', `Destinataire ID: ${selectedChat}`);
      }
      
      // We can use a transaction to increment unread count safely
      const convRef = doc(db, 'conversations', convId);
      const convSnap = await getDoc(convRef);
      if (convSnap.exists()) {
        const currentUnread = convSnap.data().unreadCount?.[selectedChat] || 0;
        await updateDoc(convRef, {
          [`unreadCount.${selectedChat}`]: currentUnread + 1
        });
      }

    } catch (error) {
      console.error("Error sending message:", error);
      // Handle error (maybe restore input)
      setMessageInput(content);
    }
  };

  const activeConversation = conversations.find(c => c.user.id === selectedChat);

  const exportToPDF = () => {
    if (!activeConversation || messages.length === 0 || !currentUser) return;
    
    const doc = new jsPDF();
    const userName = `${activeConversation.user.firstName} ${activeConversation.user.lastName}`;
    const currentUserName = `${currentUser.firstName} ${currentUser.lastName}`;
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(16, 185, 129); // Emerald 600
    doc.text("CampusBF - Historique de Discussion", 10, 15);
    
    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(`Exporté le : ${new Date().toLocaleString('fr-FR')}`, 10, 25);
    doc.text(`Participants : ${currentUserName} & ${userName}`, 10, 30);
    
    const tableData = messages.map(msg => [
      new Date(msg.timestamp).toLocaleString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      msg.senderId === currentUser.id ? 'Moi' : userName,
      msg.content || (msg.fileUrl ? '[Fichier joint]' : '')
    ]);
    
    autoTable(doc, {
      head: [['Date & Heure', 'Expéditeur', 'Message']],
      body: tableData,
      startY: 40,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 40 },
        2: { cellWidth: 'auto' }
      }
    });
    
    doc.save(`Discussion_${userName.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
  };

  // Filter messages for the current chat
  const currentChatMessages = messages;

  const startNewConversation = async (userId: string) => {
    if (!currentUser) return;
    
    // Check if conversation already exists
    const existingConv = conversations.find(c => c.user.id === userId);
    if (existingConv) {
      setSelectedChat(userId);
      setShowNewMessageModal(false);
      return;
    }

    // Create new conversation
    const convId = getConversationId(currentUser.id, userId);
    try {
      await setDoc(doc(db, 'conversations', convId), {
        participants: [currentUser.id, userId],
        updatedAt: serverTimestamp(),
        unreadCount: {
          [currentUser.id]: 0,
          [userId]: 0
        }
      });
      setSelectedChat(userId);
      setShowNewMessageModal(false);
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const filteredUsers = users.filter(u => 
    u.id !== currentUser?.id && 
    (u.firstName.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
     u.lastName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
     u.university?.toLowerCase().includes(userSearchQuery.toLowerCase()))
  );

  return (
    <div className="h-[calc(100vh-140px)] bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex">
      {/* Sidebar List */}
      <div className={cn("w-full md:w-80 border-r border-gray-200 flex-col", selectedChat ? "hidden md:flex" : "flex")}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Messages</h2>
            <button 
              onClick={() => setShowNewMessageModal(true)}
              className="p-2 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200 transition-colors"
              title="Nouveau message"
            >
              <Plus size={20} />
            </button>
          </div>
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
          {conversations.length > 0 ? (
            conversations.map((conv) => (
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
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {conv.lastMessage ? new Date(conv.lastMessage.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                    </span>
                  </div>
                  <p className={cn("text-sm truncate", conv.unread ? "font-semibold text-gray-900" : "text-gray-500")}>
                    {conv.lastMessage ? conv.lastMessage.content : <span className="italic text-gray-400">Nouvelle conversation</span>}
                  </p>
                </div>
                {conv.unread > 0 && (
                  <div className="w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-1">
                    {conv.unread}
                  </div>
                )}
              </button>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <MessageCircle size={32} className="text-gray-400" />
              </div>
              <p className="font-medium text-gray-900 mb-1">Aucun message</p>
              <p className="text-sm">Vous n'avez pas encore de conversation. Contactez d'autres étudiants depuis leur profil ou leurs annonces.</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedChat ? (
        <div className="flex flex-1 flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedChat(null)}
                className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg text-gray-600"
              >
                <ChevronLeft size={24} />
              </button>
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
              <button 
                onClick={exportToPDF}
                className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors"
                title="Exporter la discussion en PDF"
              >
                <Download size={20} />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><Phone size={20} /></button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><Video size={20} /></button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><MoreVertical size={20} /></button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
            {currentChatMessages.length > 0 ? (
              currentChatMessages.map((msg) => {
                const isMe = msg.senderId === currentUser?.id;
                return (
                  <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[70%] rounded-2xl px-5 py-3 shadow-sm",
                      isMe 
                        ? "bg-emerald-600 text-white rounded-tr-none" 
                        : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
                    )}>
                      <p className="text-sm">{msg.content}</p>
                      {msg.fileUrl && (
                        <div className="mt-2">
                          {msg.fileUrl.match(/\.(jpeg|jpg|gif|png)$/) ? (
                            <img src={msg.fileUrl} alt={msg.fileName} className="max-w-full rounded-lg" />
                          ) : (
                            <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm underline">
                              <FileText size={16} />
                              {msg.fileName || 'Fichier'}
                            </a>
                          )}
                        </div>
                      )}
                      <p className={cn("text-[10px] mt-1 text-right", isMe ? "text-emerald-100" : "text-gray-400")}>
                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p>Aucun message. Commencez la discussion !</p>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-200">
            {selectedFile && (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm mb-2">
                <FileText size={16} />
                <span className="flex-1 truncate">{selectedFile.name}</span>
                <button onClick={() => setSelectedFile(null)} className="hover:text-emerald-900">
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                disabled={isUploading}
              >
                <Paperclip size={20} className="text-gray-500" />
              </button>
              <input 
                type="text" 
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Écrivez votre message..." 
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    selectedFile ? handleUploadAndSend() : handleSendMessage();
                  }
                }}
              />
              <button 
                onClick={() => selectedFile ? handleUploadAndSend() : handleSendMessage()}
                className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                disabled={isUploading}
              >
                {isUploading ? '...' : <Send size={20} />}
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
      {/* New Message Modal */}
      {showNewMessageModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900">Nouvelle conversation</h3>
              <button 
                onClick={() => setShowNewMessageModal(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Rechercher un utilisateur..." 
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {filteredUsers.length > 0 ? (
                filteredUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => startNewConversation(u.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors text-left"
                  >
                    <img src={u.avatarUrl} alt="" className="w-10 h-10 rounded-full bg-gray-200 object-cover" />
                    <div>
                      <p className="font-semibold text-gray-900">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-gray-500">{u.university || u.role}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <p>Aucun utilisateur trouvé</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
