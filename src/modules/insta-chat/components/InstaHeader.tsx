import React from 'react';
import { Heart, Send, PlusSquare, Compass } from 'lucide-react';

interface InstaHeaderProps {
  unreadCount: number;
  onOpenDM: () => void;
  onGoHome: () => void;
}

export const InstaHeader: React.FC<InstaHeaderProps> = ({ unreadCount, onOpenDM, onGoHome }) => {
  return (
    <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center justify-between select-none">
      {/* Brand Logo */}
      <div 
        onClick={onGoHome} 
        className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-80"
      >
        <span className="text-xl md:text-2xl font-bold italic tracking-tighter bg-gradient-to-r from-pink-500 via-purple-500 to-yellow-500 bg-clip-text text-transparent">
          Story
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
          Feed & Chat
        </span>
      </div>

      {/* Top Action Icons */}
      <div className="flex items-center gap-4 text-zinc-200">
        <button 
          title="สร้างโพสต์ใหม่ (Coming soon)" 
          className="hover:text-pink-400 transition-colors hidden sm:block opacity-60 cursor-not-allowed"
        >
          <PlusSquare className="w-6 h-6" />
        </button>

        <button 
          title="สำรวจ (Explore)" 
          className="hover:text-pink-400 transition-colors hidden sm:block"
        >
          <Compass className="w-6 h-6" />
        </button>

        <button 
          title="การแจ้งเตือน" 
          className="hover:text-pink-400 transition-colors relative"
        >
          <Heart className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-pink-500" />
        </button>

        {/* DM Icon with Unread Badge */}
        <button 
          onClick={onOpenDM}
          title="กล่องข้อความส่วนตัว (Direct Messages)" 
          className="hover:text-pink-400 transition-colors relative p-1"
        >
          <Send className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
