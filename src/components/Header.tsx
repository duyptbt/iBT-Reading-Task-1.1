import React from "react";
import { GraduationCap, Timer, BookOpen } from "lucide-react";

interface HeaderProps {
  category: string;
  timeSpent: number;
  isSubmitted: boolean;
  score: number;
  total: number;
}

export function Header({ category, timeSpent, isSubmitted, score, total }: HeaderProps) {
  // Format seconds into MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <header className="border-b border-[#e6e2db] bg-warm-ivory/90 backdrop-blur-md sticky top-0 z-10 w-full" id="app-header">
      <div className="max-w-6xl mx-auto px-5 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left Side: Logo & Category tag */}
        <div className="flex items-center gap-3">
          <div className="bg-charcoal-deep text-warm-cream p-2.5 rounded-xl shadow-sm flex items-center justify-center border border-[#3e3b37]">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-charcoal-deep font-sans tracking-tight flex items-center gap-2">
              TOEFL iBT Reading
              <span className="text-[9px] bg-amber-50 text-[#b45309] border border-amber-200/55 font-mono px-2 py-0.5 rounded-md uppercase tracking-wider font-extrabold">
                Task 1
              </span>
            </h1>
            <p className="text-xs text-[#6e685f] font-medium font-sans flex items-center gap-1.5 mt-0.5">
              <BookOpen className="w-3.5 h-3.5 text-[#a49e94]" /> 
              Phân mục học thuật: <span className="font-serif font-semibold text-charcoal-deep italic">{category}</span>
            </p>
          </div>
        </div>

        {/* Right Side: Diagnostics & Timers */}
        <div className="flex items-center gap-3 border-t md:border-t-0 pt-2 md:pt-0 border-[#f2eeee] justify-between md:justify-end">
          {/* Active Timer */}
          <div className="flex items-center gap-2 bg-[#f4f1eb] border border-[#e4e0d7] px-3 py-1.5 rounded-xl text-xs text-[#524c45] font-mono">
            <Timer className="w-3.5 h-3.5 text-[#8c857b] animate-pulse" />
            <span className="font-semibold">{formatTime(timeSpent)}</span>
          </div>

          {/* Submitted Score status */}
          {isSubmitted ? (
            <div className="flex items-center gap-2 bg-[#edf4ed] border border-[#d2e4d2] px-3 py-1.5 rounded-xl text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#364d36] animate-pulse"></span>
              <span className="text-[#2a3c2a] font-semibold font-mono">
                KQ: <strong className="font-black text-[#2a3c2a]">{score}</strong> / {total}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-amber-50/70 border border-amber-200/60 px-3 py-1.5 rounded-xl text-xs text-amber-900 font-semibold font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
              <span>Đang làm bài...</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
