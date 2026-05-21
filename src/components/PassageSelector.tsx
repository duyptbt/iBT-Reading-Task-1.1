import React from "react";
import { Passage } from "../types";
import { BookOpen } from "lucide-react";

interface PassageSelectorProps {
  passages: Passage[];
  currentPassageId: string;
  onSelectPassage: (id: string) => void;
}

export function PassageSelector({
  passages,
  currentPassageId,
  onSelectPassage,
}: PassageSelectorProps) {
  return (
    <div className="w-full" id="passage-selector">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {passages.map((passage) => {
          const isSelected = passage.id === currentPassageId;
          return (
            <button
              key={passage.id}
              id={`btn-select-${passage.id}`}
              onClick={() => onSelectPassage(passage.id)}
              className={`p-5 rounded-2xl text-left border cursor-pointer transition-all duration-350 relative group ${
                isSelected
                  ? "border-[#b45309] bg-warm-ivory shadow-xs"
                  : "border-[#e6e2db] bg-[#faf8f5]/55 hover:border-charcoal-deep hover:bg-warm-ivory text-charcoal-deep"
              }`}
            >
              {isSelected && (
                <div className="absolute top-0 right-0 bg-[#b45309] text-warm-cream text-[8px] font-mono px-2.5 py-0.5 rounded-tr-xl rounded-bl-sm font-black uppercase tracking-widest">
                  Đang luyện tập
                </div>
              )}
              <div className="flex flex-col h-full justify-between gap-4">
                <div>
                  <span
                    className={`inline-block text-[9px] font-mono font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                      isSelected 
                        ? "bg-amber-100/60 text-[#b45309] border border-amber-200/50" 
                        : "bg-[#eae4da] text-[#6e685f]"
                    }`}
                  >
                    {passage.category}
                  </span>
                  <h3 className="text-sm font-serif font-black mt-3 leading-snug tracking-tight text-charcoal-deep group-hover:text-[#b45309] transition-colors">
                    {passage.title}
                  </h3>
                </div>
                
                <div className="flex items-center justify-between text-[10px] mt-1 pt-3 border-t border-[#f2ece3]">
                  <span className={`inline-flex items-center gap-1.5 font-medium ${isSelected ? "text-charcoal-deep/80" : "text-[#a49e94]"}`}>
                    <BookOpen className="w-3.5 h-3.5 text-[#b45309]" /> TOEFL Practice Task
                  </span>
                  <span className="font-mono text-[9px] text-[#a29b90]">10 Từ Khóa</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
