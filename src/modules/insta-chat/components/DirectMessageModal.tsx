import React, { useState, useEffect, useRef } from 'react';
import { CharacterProfile, ChatThread } from '../types';
import {
  ArrowLeft,
  Send,
  Sparkles,
  Phone,
  Video,
  Info,
  Smile,
  Image as ImageIcon,
  Heart
} from 'lucide-react';

interface DirectMessageModalProps {
  character: CharacterProfile;
  thread: ChatThread;
  onClose: () => void;
  onSendMessage: (characterId: string, text: string) => void;
}

export const DirectMessageModal: React.FC<DirectMessageModalProps> = ({
  character,
  thread,
  onClose,
  onSendMessage
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [thread.messages, thread.isTyping]);

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (text.trim()) {
      onSendMessage(character.id, text.trim());
      if (!textToSend) setInputText('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col md:max-w-md md:mx-auto md:border-x md:border-zinc-800 shadow-2xl select-none">
      {/* DM Header */}
      <div className="sticky top-0 bg-black/95 backdrop-blur-md border-b border-zinc-800 px-3 py-2.5 flex items-center justify-between text-white z-10">
        <div className="flex items-center gap-2">
          <button 
            onClick={onClose} 
            className="p-1 -ml-1 text-zinc-300 hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="relative">
            <img
              src={character.avatarUrl}
              alt=""
              className="w-9 h-9 rounded-full object-cover border border-zinc-700"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-black" />
          </div>

          <div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold">{character.displayName}</span>
            </div>
            <span className="text-[10px] text-zinc-400 block -mt-0.5">
              {character.statusText || 'ออนไลน์อยู่'}
            </span>
          </div>
        </div>

        {/* Mock Call / Info Icons */}
        <div className="flex items-center gap-3 text-zinc-300">
          <button className="hover:text-white"><Phone className="w-5 h-5 opacity-70" /></button>
          <button className="hover:text-white"><Video className="w-5 h-5 opacity-70" /></button>
          <button className="hover:text-white"><Info className="w-5 h-5 opacity-70" /></button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-zinc-950/60">
        {/* Character Bio Card in Chat */}
        <div className="flex flex-col items-center justify-center p-6 text-center border-b border-zinc-900 mb-4">
          <img
            src={character.avatarUrl}
            alt=""
            className="w-16 h-16 rounded-full object-cover border-2 border-pink-500/40 p-0.5 mb-2"
          />
          <h3 className="text-sm font-bold text-white">{character.displayName}</h3>
          <p className="text-xs text-zinc-400 font-mono">@{character.username}</p>
          <p className="text-[11px] text-zinc-500 mt-1 max-w-xs">{character.bio}</p>
        </div>

        {/* Chat Bubbles */}
        {thread.messages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-xs md:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none'
                    : 'bg-zinc-800 text-zinc-100 rounded-tl-none border border-zinc-700/60 shadow-sm'
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[9px] text-zinc-500 px-1 mt-0.5">{msg.timestamp}</span>

              {/* Quick Reply Starter Chips */}
              {!isUser && msg.quickReplies && msg.quickReplies.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 max-w-[85%]">
                  {msg.quickReplies.map((replyText, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(replyText)}
                      className="px-2.5 py-1 rounded-full bg-zinc-900 border border-pink-500/30 text-pink-300 text-[11px] font-medium hover:bg-pink-950/40 transition-colors flex items-center gap-1"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-pink-400" />
                      <span>{replyText}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Typing Indicator */}
        {thread.isTyping && (
          <div className="flex items-center gap-2">
            <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-none bg-zinc-800 text-zinc-400 flex items-center gap-1.5 border border-zinc-700/60">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce [animation-delay:0.4s]" />
            </div>
            <span className="text-[10px] text-zinc-500 italic">กำลังพิมพ์...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Bottom Bar */}
      <div className="sticky bottom-0 bg-black border-t border-zinc-800 p-2.5 flex items-center gap-2">
        <button className="text-zinc-400 hover:text-white p-1">
          <Smile className="w-5 h-5" />
        </button>
        <button className="text-zinc-400 hover:text-white p-1">
          <ImageIcon className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={`ส่งข้อความหา ${character.displayName}...`}
          className="flex-1 bg-zinc-900 border border-zinc-700/70 rounded-full px-3.5 py-2 text-xs md:text-sm text-white placeholder-zinc-500 outline-none focus:border-pink-500 transition-colors"
        />

        {inputText.trim() ? (
          <button
            onClick={() => handleSend()}
            className="p-2 rounded-full bg-pink-600 text-white hover:bg-pink-500 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        ) : (
          <button 
            onClick={() => handleSend('❤️')} 
            className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
          >
            <Heart className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
