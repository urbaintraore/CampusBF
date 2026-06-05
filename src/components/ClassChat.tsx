import React, { useState } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Paperclip, 
  Send 
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ClassMessage, Commentary, AcademicRole } from '@/types/academic';

interface ClassChatProps {
  classeId: string;
  selectedRole: AcademicRole;
  messages: ClassMessage[];
  onPostMessage: (messageForm: { title: string; content: string; allowComments: boolean; attachmentsName: string; attachmentsUrl: string }) => Promise<void>;
  onAddComment: (messageId: string, commentContent: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
}

export default function ClassChat({ 
  classeId, 
  selectedRole, 
  messages, 
  onPostMessage, 
  onAddComment, 
  onDeleteMessage 
}: ClassChatProps) {
  const { user } = useAuth();
  const [showAddMessageModal, setShowAddMessageModal] = useState(false);
  const [newMessage, setNewMessage] = useState({
    title: '',
    content: '',
    allowComments: true,
    attachmentsName: '',
    attachmentsUrl: ''
  });
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // Manager accounts or publishers:
  const canPublishAnnonces = ['super_admin', 'admin_university', 'chef_departement', 'responsable_filiere', 'teacher', 'admin', 'institution'].includes(selectedRole);

  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.title || !newMessage.content) return;
    await onPostMessage(newMessage);
    setShowAddMessageModal(false);
    setNewMessage({
      title: '',
      content: '',
      allowComments: true,
      attachmentsName: '',
      attachmentsUrl: ''
    });
  };

  const handleCommentSubmit = async (messageId: string) => {
    const inputVal = commentInputs[messageId];
    if (!inputVal || !inputVal.trim()) return;
    await onAddComment(messageId, inputVal);
    setCommentInputs(prev => ({ ...prev, [messageId]: '' }));
  };

  return (
    <div id="class_chat_module" className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-200">
      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base">Tableau des Annonces et Direct Chat</h3>
          <p className="text-slate-500 text-xs mt-0.5">Discussions en temps réel synchronisées avec les enseignants.</p>
        </div>
        {canPublishAnnonces && (
          <button
            type="button"
            onClick={() => setShowAddMessageModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm shrink-0 transition-all"
          >
            <Plus size={14} />
            Publier une annonce
          </button>
        )}
      </div>

      <div className="space-y-6">
        {messages.map(msg => (
          <div key={msg.id} className="p-5 bg-slate-50/50 border border-slate-200 rounded-3xl space-y-4 hover:border-slate-300 transition-all relative group">
            
            {/* Delete button only if user matches author or has structural powers */}
            {(canPublishAnnonces || user?.id === msg.authorId) && (
              <button 
                type="button"
                onClick={() => onDeleteMessage(msg.id)}
                className="absolute top-4 right-4 p-1.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-150 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                title="Supprimer l'annonce"
              >
                <Trash2 size={13} />
              </button>
            )}

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 font-extrabold text-sm flex items-center justify-center shrink-0 border border-emerald-200/50">
                {msg.authorName ? msg.authorName[0] : 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-slate-900 text-xs sm:text-sm">{msg.authorName}</span>
                  <span className="px-2 py-0.5 bg-yellow-400/10 text-yellow-800 border border-yellow-400/20 text-[9px] font-black rounded uppercase">
                    {msg.authorRole}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1 font-mono">{new Date(msg.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2 pl-1 sm:pl-12">
              <h4 className="font-extrabold text-slate-900 text-sm leading-snug">{msg.title}</h4>
              <p className="text-slate-600 text-xs leading-relaxed font-light whitespace-pre-line">{msg.content}</p>
              
              {/* Attachment card (Teachers & Delegate supports) */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mt-3">
                  {msg.attachments.map((file, i) => (
                    <div key={i} className="inline-flex items-center gap-2 p-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                      <Paperclip size={13} className="text-slate-400" />
                      <span className="truncate max-w-[180px]">{file.fileName}</span>
                      <a 
                        href={file.fileUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-emerald-600 hover:text-emerald-700 font-bold underline shrink-0 cursor-pointer ml-1"
                      >
                        Télécharger
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* In-chat dynamic discussions and comment system */}
            {msg.allowComments && (
              <div className="pl-1 sm:pl-12 pt-4 border-t border-slate-100 space-y-4">
                <h5 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                  <MessageSquare size={12} />
                  Discussions ({msg.comments?.length || 0})
                </h5>

                <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                  {msg.comments?.map(comm => (
                    <div key={comm.id} className="p-3 bg-white border border-slate-150 rounded-2xl text-xs space-y-1">
                      <div className="flex items-center justify-between font-extrabold flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-slate-900 text-xs">{comm.authorName}</span>
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-bold rounded uppercase">
                            {comm.authorRole}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-normal">{new Date(comm.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-600 font-light leading-relaxed whitespace-pre-line">{comm.content}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentInputs[msg.id] || ''}
                    onChange={e => setCommentInputs(prev => ({ ...prev, [msg.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleCommentSubmit(msg.id)}
                    placeholder="Écrivez une réponse officielle..."
                    className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => handleCommentSubmit(msg.id)}
                    className="px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
                  >
                    Répondre
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {messages.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-xs italic">
            Aucune publication active dans cette classe.
          </div>
        )}
      </div>

      {/* NEW MESSAGE ANNOUNCEMENT MODAL */}
      {showAddMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm sm:text-base">Diffuser une Annonce</h3>
              <button 
                type="button" 
                onClick={() => setShowAddMessageModal(false)} 
                className="text-white hover:opacity-80"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmitMessage} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Objet de l'annonce</label>
                <input
                  type="text"
                  required
                  value={newMessage.title}
                  onChange={e => setNewMessage({ ...newMessage, title: e.target.value })}
                  placeholder="ex: Report de session de ratrapage ou note de service"
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Contenu du message</label>
                <textarea
                  required
                  value={newMessage.content}
                  onChange={e => setNewMessage({ ...newMessage, content: e.target.value })}
                  placeholder="Saisissez la communication détaillée..."
                  rows={4}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
                <span className="text-xs font-extrabold text-slate-800 block mb-1">Fichier de support joint (Facultatif)</span>
                <input
                  type="text"
                  value={newMessage.attachmentsName}
                  onChange={e => setNewMessage({ ...newMessage, attachmentsName: e.target.value })}
                  placeholder="ex: TD_Suites_Numeriques.pdf"
                  className="w-full p-2 text-[11px] bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 mb-2"
                />
                <input
                  type="text"
                  value={newMessage.attachmentsUrl}
                  onChange={e => setNewMessage({ ...newMessage, attachmentsUrl: e.target.value })}
                  placeholder="https://example.com/sujet.pdf"
                  className="w-full p-2 text-[11px] bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="chk_comments"
                  checked={newMessage.allowComments}
                  onChange={e => setNewMessage({ ...newMessage, allowComments: e.target.checked })}
                  className="rounded border-slate-200 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="chk_comments" className="text-xs font-semibold text-slate-700 select-none cursor-pointer">
                  Autoriser les questions/réponses des étudiants
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowAddMessageModal(false)} 
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-xs hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Send size={13} />
                  Dépêcher l'Annonce
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
