import React, { useState, useEffect, useRef, useMemo } from "react";
import { curatedPassages } from "./data/passages";
import { Passage, UserProgress, AIFeedback } from "./types";
import { Header } from "./components/Header";
import { PassageSelector } from "./components/PassageSelector";
import { 
  GraduationCap, 
  Timer, 
  BookOpen, 
  Sparkles, 
  Loader2, 
  ArrowRight, 
  AlertTriangle, 
  RotateCcw, 
  CheckCircle2, 
  ChevronRight, 
  Info, 
  BrainCircuit, 
  Check, 
  HelpCircle, 
  Compass, 
  Pause, 
  Play, 
  Flame, 
  X,
  BookMarked,
  Layers,
  Sparkle
} from "lucide-react";

export default function App() {
  // Passages State
  const [passages, setPassages] = useState<Passage[]>(() => {
    try {
      const saved = localStorage.getItem("toefl_passages");
      return saved ? JSON.parse(saved) : curatedPassages;
    } catch {
      return curatedPassages;
    }
  });

  const [currentPassageId, setCurrentPassageId] = useState<string>(() => {
    return localStorage.getItem("toefl_current_passage_id") || "glaciers";
  });
  
  // Answers state: Maps word id (0 to 9) to user's custom filled letters string
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>(() => {
    try {
      const saved = localStorage.getItem("toefl_user_answers");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [isSubmitted, setIsSubmitted] = useState<boolean>(() => {
    return localStorage.getItem("toefl_is_submitted") === "true";
  });

  // UI state
  const [focusedWordId, setFocusedWordId] = useState<number | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showSelectorShelf, setShowSelectorShelf] = useState<boolean>(false);

  // Custom AI Generation States
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatorError, setGeneratorError] = useState<string | null>(null);

  // AI Tutor feedback states
  const [aiFeedback, setAiFeedback] = useState<AIFeedback | null>(null);
  const [isFetchingTutor, setIsFetchingTutor] = useState<boolean>(false);

  const [practiceMode, setPracticeMode] = useState<"practice" | "timed">(() => {
    return (localStorage.getItem("toefl_practice_mode") as "practice" | "timed") || "timed";
  });

  // Timer states
  const TIMER_START_SECONDS = 600; // 10 minutes default
  const [timeRemaining, setTimeRemaining] = useState<number>(() => {
    const saved = localStorage.getItem("toefl_time_remaining");
    return saved ? parseInt(saved, 10) : TIMER_START_SECONDS;
  });

  const [countUpTime, setCountUpTime] = useState<number>(() => {
    const saved = localStorage.getItem("toefl_count_up_time");
    return saved ? parseInt(saved, 10) : 0;
  });

  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(() => {
    return localStorage.getItem("toefl_is_timer_paused") === "true";
  });
  
  // Active Passage Ref
  const currentPassage = useMemo(() => {
    return passages.find((p) => p.id === currentPassageId) || passages[0];
  }, [passages, currentPassageId]);

  // Ref container for auto-focus progression with individual character positions
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Synchronize state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("toefl_passages", JSON.stringify(passages));
    } catch (e) {
      console.warn(e);
    }
  }, [passages]);

  useEffect(() => {
    localStorage.setItem("toefl_current_passage_id", currentPassageId);
  }, [currentPassageId]);

  useEffect(() => {
    try {
      localStorage.setItem("toefl_user_answers", JSON.stringify(userAnswers));
    } catch (e) {
      console.warn(e);
    }
  }, [userAnswers]);

  useEffect(() => {
    localStorage.setItem("toefl_is_submitted", isSubmitted ? "true" : "false");
  }, [isSubmitted]);

  useEffect(() => {
    localStorage.setItem("toefl_practice_mode", practiceMode);
  }, [practiceMode]);

  useEffect(() => {
    localStorage.setItem("toefl_time_remaining", timeRemaining.toString());
  }, [timeRemaining]);

  useEffect(() => {
    localStorage.setItem("toefl_count_up_time", countUpTime.toString());
  }, [countUpTime]);

  useEffect(() => {
    localStorage.setItem("toefl_is_timer_paused", isTimerPaused ? "true" : "false");
  }, [isTimerPaused]);

  // 1. Load predesigned exercises from API if desired, otherise fallback is fine.
  useEffect(() => {
    fetch("/api/passages")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.passages) {
          setPassages(data.passages);
        }
      })
      .catch((err) => console.log("Failed to fetch custom passages, using static default presets", err));
  }, []);

  // 2. Timer Hook: Handled based on practiceMode
  useEffect(() => {
    let interval: any = null;
    if (!isSubmitted && !isTimerPaused) {
      interval = setInterval(() => {
        if (practiceMode === "timed") {
          setTimeRemaining((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              // Auto-submit when countdown hits zero
              handleAutoSubmit();
              return 0;
            }
            return prev - 1;
          });
        } else {
          setCountUpTime((prev) => prev + 1);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [practiceMode, isSubmitted, isTimerPaused]);

  // 3. Reset Answers whenever passage changes
  const handleSelectPassage = (id: string) => {
    setCurrentPassageId(id);
    setUserAnswers({});
    setIsSubmitted(false);
    setTimeRemaining(TIMER_START_SECONDS);
    setCountUpTime(0);
    setIsTimerPaused(false);
    setFocusedWordId(null);
    setAiFeedback(null); // Clear previous AI evaluations
    setShowSelectorShelf(false); // Collapse selector shelf on select
  };

  // 4. Input changed handlers for individual char fields
  const handleCharChange = (wordId: number, charIdx: number, val: string, totalChars: number) => {
    // Only permit standard alphabetical letters
    const char = val.replace(/[^a-zA-Z]/g, "").toLowerCase().slice(-1);
    
    setUserAnswers((prev) => {
      const currentAns = prev[wordId] || "";
      const padded = currentAns.padEnd(totalChars, " ");
      const charArray = padded.split("");
      charArray[charIdx] = char || " ";
      const updated = charArray.join("");
      return {
        ...prev,
        [wordId]: updated,
      };
    });

    // Auto-focus move to next character cell
    if (char && charIdx < totalChars - 1) {
      const nextRef = inputRefs.current[`${wordId}-${charIdx + 1}`];
      if (nextRef) {
        nextRef.focus();
      }
    } else if (char && charIdx === totalChars - 1) {
      // Move to first char of the next word task (if exists)
      const nextWordId = wordId + 1;
      if (nextWordId <= 9) {
        const nextWordRef = inputRefs.current[`${nextWordId}-0`];
        if (nextWordRef) {
          nextWordRef.focus();
          setFocusedWordId(nextWordId);
        }
      }
    }
  };

  const handleCharKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    wordId: number,
    charIdx: number,
    totalChars: number
  ) => {
    const currentVal = userAnswers[wordId]?.[charIdx] || "";
    
    if (e.key === "Backspace") {
      if (currentVal && currentVal !== " ") {
        // Clear current box letter
        setUserAnswers((prev) => {
          const currentAns = prev[wordId] || "";
          const padded = currentAns.padEnd(totalChars, " ");
          const charArray = padded.split("");
          charArray[charIdx] = " ";
          return {
            ...prev,
            [wordId]: charArray.join(""),
          };
        });
      } else if (charIdx > 0) {
        // Current cell is empty, move backward and clear previous cell
        const prevRef = inputRefs.current[`${wordId}-${charIdx - 1}`];
        if (prevRef) {
          prevRef.focus();
          setUserAnswers((prev) => {
            const currentAns = prev[wordId] || "";
            const padded = currentAns.padEnd(totalChars, " ");
            const charArray = padded.split("");
            charArray[charIdx - 1] = " ";
            return {
              ...prev,
              [wordId]: charArray.join(""),
            };
          });
        }
      } else if (charIdx === 0 && wordId > 0) {
        // At first character of current word, move backward to last character of previous word
        const prevWordId = wordId - 1;
        const prevWordTotal = currentPassage?.wordTasks.find(t => t.id === prevWordId)?.missing.length || 0;
        if (prevWordTotal > 0) {
          const prevWordLastRef = inputRefs.current[`${prevWordId}-${prevWordTotal - 1}`];
          if (prevWordLastRef) {
            prevWordLastRef.focus();
            setFocusedWordId(prevWordId);
          }
        }
      }
    } else if (e.key === "ArrowLeft") {
      if (charIdx > 0) {
        inputRefs.current[`${wordId}-${charIdx - 1}`]?.focus();
      } else if (wordId > 0) {
        const prevWordId = wordId - 1;
        const prevWordTotal = currentPassage?.wordTasks.find(t => t.id === prevWordId)?.missing.length || 0;
        if (prevWordTotal > 0) {
          inputRefs.current[`${prevWordId}-${prevWordTotal - 1}`]?.focus();
          setFocusedWordId(prevWordId);
        }
      }
    } else if (e.key === "ArrowRight") {
      if (charIdx < totalChars - 1) {
        inputRefs.current[`${wordId}-${charIdx + 1}`]?.focus();
      } else if (wordId < 9) {
        const nextWordId = wordId + 1;
        inputRefs.current[`${nextWordId}-0`]?.focus();
        setFocusedWordId(nextWordId);
      }
    }
  };

  // 5. Build submission status
  const scoreResult = useMemo(() => {
    if (!currentPassage) return 0;
    let score = 0;
    currentPassage.wordTasks.forEach((task) => {
      const answer = (userAnswers[task.id] || "").replace(/\s/g, "").toLowerCase();
      if (answer === task.missing.toLowerCase().trim()) {
        score++;
      }
    });
    return score;
  }, [userAnswers, currentPassage]);

  // 6. Submit logic
  const handleSubmitQuiz = () => {
    if (isSubmitted) return;
    setIsSubmitted(true);
    setIsTimerPaused(true);
  };

  const handleAutoSubmit = () => {
    if (isSubmitted) return;
    handleSubmitQuiz();
  };

  // 7. Reset exercise action
  const handleResetChallenge = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa tiến trình hiện tạ và đặt lại đồng hồ tính giờ?")) {
      setUserAnswers({});
      setIsSubmitted(false);
      setTimeRemaining(TIMER_START_SECONDS);
      setCountUpTime(0);
      setIsTimerPaused(false);
      setFocusedWordId(null);
      setAiFeedback(null); // Clear previous AI answers
    }
  };

  // API Call: Fetch Tutor evaluation feedback
  const fetchAiTutorFeedback = async () => {
    if (!currentPassage || isFetchingTutor) return;
    setIsFetchingTutor(true);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passage: currentPassage,
          userAnswers: userAnswers,
        }),
      });
      const data = await res.json();
      if (data.success && data.feedback) {
        setAiFeedback(data.feedback);
      } else {
        alert(data.error || "Không thể tải nhận xét từ AI Tutor lúc này.");
      }
    } catch (error: any) {
      console.error("AI Tutor Error:", error);
      alert("Lỗi kết nối máy chủ khi gọi AI Tutor.");
    } finally {
      setIsFetchingTutor(false);
    }
  };

  // API Call: Generate Custom TOEFL Reading passage from a topic
  const handleGenerateCustom = async (topic: string) => {
    setIsGenerating(true);
    setGeneratorError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (data.success && data.passage) {
        const generatedPassage: Passage = {
          ...data.passage,
          id: `custom_${Date.now()}`
        };
        setPassages((prev) => [generatedPassage, ...prev]);
        setCurrentPassageId(generatedPassage.id);
        setUserAnswers({});
        setIsSubmitted(false);
        setTimeRemaining(TIMER_START_SECONDS);
        setCountUpTime(0);
        setIsTimerPaused(false);
        setFocusedWordId(null);
        setAiFeedback(null);
        setShowSelectorShelf(false); // Collapse selector shelf on select
      } else {
        setGeneratorError(data.error || "Không thể biên soạn chủ đề. Thử dùng chủ đề đơn giản hơn.");
      }
    } catch (error: any) {
      console.error("Lỗi biên tập AI:", error);
      setGeneratorError("Lỗi đường truyền hoặc máy chủ bận.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper formatting for seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Total blanks filled status
  const answersFilledCount = useMemo(() => {
    return Object.values(userAnswers).filter((val): val is string => typeof val === "string" && val.replace(/\s/g, "").length > 0).length;
  }, [userAnswers]);

  // Splitting passage logic dynamically to place custom inputs
  const renderedPassageText = useMemo(() => {
    if (!currentPassage) return null;
    const parts = currentPassage.rawTextWithPlaceholders.split(/(\{\d+\})/g);

    return parts.map((part, index) => {
      const match = part.match(/^\{(\d+)\}$/);
      if (match) {
        const id = parseInt(match[1], 10);
        const task = currentPassage.wordTasks.find((t) => t.id === id);
        if (task) {
          const isCorrectAnswer = (userAnswers[id] || "").replace(/\s/g, "").toLowerCase() === task.missing.toLowerCase();
          const isFilled = (userAnswers[id] || "").replace(/\s/g, "").length > 0;
          const isFocused = focusedWordId === id;

          return (
            <span 
              key={index} 
              id={`word-blank-wrapper-${id}`}
              className={`inline-flex items-center relative select-none mx-0.5 px-1.5 py-0.5 rounded-lg transition-all duration-300 cursor-pointer ${
                isFocused 
                  ? "bg-amber-100/40 outline outline-1.5 outline-[#b45309]/30" 
                  : "hover:bg-[#f6f2eb]"
              }`}
              onClick={() => {
                if (!isSubmitted) {
                  setFocusedWordId(id);
                  // Focus first unfilled character cell or the first cell
                  const ansStr = userAnswers[id] || "";
                  let focusIdx = 0;
                  for (let i = 0; i < task.missing.length; i++) {
                    if (!ansStr[i] || ansStr[i] === " ") {
                      focusIdx = i;
                      break;
                    }
                  }
                  inputRefs.current[`${id}-${focusIdx}`]?.focus();
                } else {
                  setFocusedWordId(id);
                }
              }}
            >
              <span className="flex items-center font-serif text-lg tracking-normal select-none">
                {/* Prefix part */}
                <strong className="text-charcoal-deep font-bold font-serif select-text mr-0.5">{task.prefix}</strong>
                
                {/* Sequential individual character input cells */}
                <span className="inline-flex gap-[2px] items-center">
                  {Array.from({ length: task.missing.length }).map((_, charIdx) => {
                    const cellVal = userAnswers[id]?.[charIdx] || "";
                    const displayChar = cellVal.trim();
                    const isCellCorrect = isSubmitted && displayChar.toLowerCase() === task.missing[charIdx].toLowerCase();

                    return (
                      <input
                        key={charIdx}
                        type="text"
                        id={`field-input-${id}-${charIdx}`}
                        ref={(el) => { inputRefs.current[`${id}-${charIdx}`] = el; }}
                        value={displayChar}
                        onChange={(e) => handleCharChange(id, charIdx, e.target.value, task.missing.length)}
                        onKeyDown={(e) => handleCharKeyDown(e, id, charIdx, task.missing.length)}
                        disabled={isSubmitted}
                        maxLength={1}
                        placeholder="_"
                        className={`w-4.5 sm:w-5 h-6.5 text-center font-mono focus:outline-none transition-all duration-300 outline-none font-bold text-sm border-b rounded-t ${
                          isSubmitted
                            ? isCellCorrect
                              ? "border-[#364d36] bg-[#edf4ed] text-[#2a3c2a]"
                              : "border-red-400 bg-[#fff5f5] text-red-900"
                            : isFocused
                              ? "border-[#b45309] bg-amber-50/50 text-[#b45309]"
                              : displayChar
                                ? "border-charcoal-deep bg-[#f2ede4] text-charcoal-deep"
                                : "border-[#ccc6be] bg-transparent text-[#b0a79d] hover:border-[#b45350]"
                        }`}
                        onFocus={() => setFocusedWordId(id)}
                      />
                    );
                  })}
                </span>
              </span>
              
              {/* Submission bubble feedback icon */}
              {isSubmitted && (
                <span className="absolute -top-2.5 -right-1 z-10 scale-90">
                  {isCorrectAnswer ? (
                    <span className="flex items-center justify-center w-3.5 h-3.5 bg-emerald-700 text-white rounded-full p-0.5 shadow-sm border border-[#fff]">
                      <Check className="w-2.5 h-2.5 stroke-[4]" />
                    </span>
                  ) : (
                    <span className="flex items-center justify-center w-3.5 h-3.5 bg-red-650 text-white rounded-full p-0.5 shadow-sm border border-[#fff]">
                      <X className="w-2.5 h-2.5 stroke-[4]" />
                    </span>
                  )}
                </span>
              )}
            </span>
          );
        }
      }
      return <span key={index} className="font-serif select-text text-[17px] leading-[2.1] text-[#423d38] font-normal">{part}</span>;
    });
  }, [currentPassage, userAnswers, isSubmitted, focusedWordId]);

  return (
    <div className="min-h-screen bg-[#faf7f2] text-charcoal-deep flex flex-col font-sans select-none" id="toefl-practice-box">
      
      {/* Dynamic modular Header using standard design */}
      <Header 
        category={currentPassage?.category || "Linguistics"} 
        total={10} 
        score={scoreResult} 
        isSubmitted={isSubmitted} 
        timeSpent={practiceMode === "timed" ? timeRemaining : countUpTime} 
      />

      {/* 2. Top Banner Menu: Dynamic configuration shelf & Always-Visible 3 Academic Passages */}
      <section className="bg-warm-ivory border-b border-[#e6e2db] px-5 sm:px-8 py-5 flex flex-col gap-5 shrink-0" id="controls-panel">
        
        {/* Row 1: Left label / Title & right settings options */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#b45309] rounded-full"></span>
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#8e877e] font-mono">
              Danh sách bài đọc iBT tuyển chọn (Curated academic curriculum)
            </h2>
          </div>
          
          {/* Settings and help */}
          <div className="flex items-center gap-3">
            <div className="flex bg-[#edeae3] p-0.5 rounded-xl border border-[#dcd6ca]">
              <button
                id="mode-timed"
                onClick={() => {
                  setPracticeMode("timed");
                  setIsTimerPaused(false);
                }}
                disabled={isSubmitted}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  practiceMode === "timed"
                    ? "bg-white text-charcoal-deep shadow-xs"
                    : "text-[#6e685f] hover:text-[#1c1a17] disabled:opacity-50"
                }`}
              >
                <Timer className="w-3.5 h-3.5 text-[#b45309]" /> Tính giờ (10 phút)
              </button>
              <button
                id="mode-practice"
                onClick={() => {
                  setPracticeMode("practice");
                  setIsTimerPaused(false);
                }}
                disabled={isSubmitted}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  practiceMode === "practice"
                    ? "bg-white text-charcoal-deep shadow-xs"
                    : "text-[#6e685f] hover:text-[#1c1a17] disabled:opacity-50"
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-[#b45309]" /> Luyện tự do
              </button>
            </div>

            {/* Pause Timer toggle in Practice Mode */}
            {!isSubmitted && (
              <button
                id="btn-pause-timer"
                onClick={() => setIsTimerPaused(!isTimerPaused)}
                className="text-[#6e685f] hover:text-charcoal-deep p-2 rounded-xl border border-transparent hover:border-[#e0dad1] hover:bg-white transition-all cursor-pointer"
                title={isTimerPaused ? "Tiếp tục" : "Tạm dừng"}
              >
                {isTimerPaused ? <Play className="w-4 h-4 fill-charcoal-deep" /> : <Pause className="w-4 h-4" />}
              </button>
            )}

            {/* Guided Help Modal toggle */}
            <button
              id="btn-help-modal"
              onClick={() => setShowHelpModal(true)}
              className="text-[#6e685f] hover:text-charcoal-deep hover:bg-white border border-[#e0dad1] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <HelpCircle className="w-4 h-4 text-[#8a8175]" /> Hướng dẫn
            </button>
          </div>
        </div>

        {/* Row 2: Always-Visible 3 Passages Display cards */}
        <div className="w-full">
          <PassageSelector 
            passages={passages}
            currentPassageId={currentPassageId}
            onSelectPassage={handleSelectPassage}
          />
        </div>
      </section>

      {/* 3. Main Workspace Editorial Split */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative" id="layout-body">
        
        {/* Left Side: Modern Academic Reading Paper sheet */}
        <section className="flex-1 p-6 md:p-14 overflow-y-auto bg-warm-cream flex flex-col justify-between" id="reading-passage-view">
          <div className="max-w-2.5xl mx-auto w-full bg-warm-ivory border border-[#eae4da] rounded-2xl p-6 sm:p-12 shadow-xs relative">
            
            {/* Elegant Top label and category */}
            <div className="flex items-center justify-between border-b border-[#f2ece3] pb-4 mb-6">
              <span className="text-[10px] font-mono tracking-widest uppercase font-black text-[#b45309] bg-amber-50 px-2.5 py-1 rounded border border-amber-200/50">
                Phân Loại Học Thuật • {currentPassage?.category}
              </span>
              <span className="text-xs text-[#a29b90] font-mono select-text italic">
                {currentPassageId.startsWith("custom_") ? "✨ Biên soạn bởi AI" : "📖 Curated Preset"}
              </span>
            </div>

            {/* Simulated Paused Cover */}
            {isTimerPaused && !isSubmitted ? (
              <div className="bg-[#FAF8F5]/98 rounded-2xl p-10 py-16 text-center border border-[#e0dac1] max-w-lg mx-auto flex flex-col items-center">
                <Timer className="w-12 h-12 text-[#b45309] animate-bounce mb-3" />
                <h3 className="text-lg font-serif font-black text-charcoal-deep">Đã tạm dừng bài luyện tập</h3>
                <p className="text-xs text-[#6e685f] max-w-sm mt-2 leading-relaxed font-sans">
                  Bộ tính thời gian đã dừng. Hãy thư giãn tinh thần, tập trung cao độ và tiếp tục khi bạn sẵn sàng cải thiện kỹ năng ngôn ngữ của mình.
                </p>
                <button
                  id="btn-resume-timer"
                  onClick={() => setIsTimerPaused(false)}
                  className="mt-6 px-6 py-2.5 bg-charcoal-deep hover:bg-[#34302c] text-warm-cream rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer border border-[#3e3b37]"
                >
                  <Play className="w-3.5 h-3.5 fill-warm-cream text-warm-cream" /> Tiếp tục bài đọc
                </button>
              </div>
            ) : (
              /* Beautiful Scholarly Editorial Paragraph Text */
              <div className="text-charcoal-deep relative select-text" id="editorial-paragraph">
                <h1 className="text-2.5xl sm:text-3.5xl font-serif font-black text-charcoal-deep mb-8 leading-tight tracking-tight">
                  {currentPassage?.title}
                </h1>
                <p className="leading-[2.2] select-text">
                  {renderedPassageText}
                </p>
              </div>
            )}

            {/* Hint Callout Card corresponding to the active focused word input */}
            {focusedWordId !== null && currentPassage && (
              <div className="mt-12 bg-[#FAF8F5] border border-[#dcd6ca] rounded-2xl p-5 shadow-xs relative animate-slide-up" id="active-hint-callout">
                <button
                  id="btn-close-hint"
                  onClick={() => setFocusedWordId(null)}
                  className="absolute top-3.5 right-3.5 text-[#a49e94] hover:text-charcoal-deep p-1.5 rounded-full hover:bg-[#edeae3] cursor-pointer"
                  title="Đóng gợi ý"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-start gap-3">
                  <div className="bg-amber-50 text-[#b45309]/80 p-2 rounded-xl mt-0.5 border border-amber-100">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[9px] font-mono uppercase tracking-wider text-[#9a9287] font-extrabold flex items-center gap-1">
                      <span>Gợi ý cho từ trống số #{focusedWordId + 1}</span>
                    </h4>
                    <p className="text-xs font-serif italic text-charcoal-deep mt-1 leading-relaxed max-w-xl font-medium select-text">
                      "{currentPassage.wordTasks[focusedWordId].hint}"
                    </p>
                    {isSubmitted ? (
                      <p className="text-xs text-[#b45309] font-mono mt-3.5 font-extrabold">
                        Đáp án: <strong className="underline decoration-wavy">{currentPassage.wordTasks[focusedWordId].prefix}</strong> + <strong className="bg-amber-50 border border-amber-200/60 px-1 py-0.5 rounded text-charcoal-deep font-sans">{currentPassage.wordTasks[focusedWordId].missing}</strong> = <strong className="underline">{currentPassage.wordTasks[focusedWordId].fullWord}</strong>
                      </p>
                    ) : (
                      <div className="flex items-center gap-3.5 mt-3 text-[11px] text-[#6e685f]">
                        <span className="font-sans">Tiền tố: <kbd className="font-mono bg-[#eae4da] text-charcoal-deep px-1.5 py-0.5 rounded font-black uppercase">{currentPassage.wordTasks[focusedWordId].prefix}</kbd></span>
                        <span className="font-sans">Độ dài cần điền: <strong className="text-charcoal-deep text-xs font-bold font-mono bg-[#eae4da] px-1.5 py-0.5 rounded">{currentPassage.wordTasks[focusedWordId].missing.length}</strong> ký tự</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Curated Scholarly Discourse Explanation shown once standard test is submitted */}
            {isSubmitted && currentPassage && (
              <div className="mt-12 border-t border-[#f2ece3] pt-8" id="scholarly-analysis">
                <h3 className="text-sm font-serif font-black text-charcoal-deep flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-[#b45309]" />
                  Phân Tích Diễn Ngôn Học Thuật
                </h3>
                <p className="text-xs sm:text-sm text-[#524c45] leading-relaxed mt-3 p-5 bg-[#FAF8F5] border border-[#e0dac1] rounded-2xl font-serif">
                  {currentPassage.explanation}
                </p>
              </div>
            )}
          </div>
          
          <div className="mt-8 text-center text-[11px] text-[#9a9287] font-serif tracking-wide">
            Bài thi đọc TOEFL iBT đánh giá năng lực phán đoán cấu trúc ngữ nghĩa và liên kết văn xuôi trong môi trường đại học.
          </div>
        </section>

        {/* Right Side: Sidebar Panel (Assessment, Vocabulary tracker, AI scholar tutor) */}
        <aside className="w-full lg:w-96 bg-[#FAF8F5] border-t lg:border-t-0 lg:border-l border-[#e6e2db] p-6 sm:p-7 flex flex-col gap-6 overflow-y-auto shrink-0" id="sidebar-panel">
          
          {/* Main Scoring evaluation (Active once submitted) */}
          {isSubmitted && (
            <div className="bg-charcoal-deep text-warm-cream rounded-2xl p-5 border border-[#3e3b37] shadow-sm animate-fade-in" id="local-evaluation-display">
              <h3 className="text-[9px] font-mono font-extrabold uppercase tracking-widest text-[#a29b90] mb-3 flex items-center gap-1.5 border-b border-[#3e3b37] pb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                Kết Quả Đánh Giá Sơ Bộ
              </h3>
              <div>
                <h4 className="text-4xl font-black font-serif text-[#fcfbfa] flex items-baseline gap-1">
                  {scoreResult} <span className="text-xl text-[#a29b90] font-normal">/ 10</span>
                </h4>
                <p className="text-xs text-[#eae7e2] leading-relaxed mt-2.5 select-text font-serif italic">
                  {scoreResult === 10
                    ? "Xuất sắc! Bạn hoàn toàn nắm bắt được mạch diễn ngôn của tác giả."
                    : scoreResult >= 8
                    ? "Ấn tượng! Phản xạ từ vựng của bạn cực kỳ linh hoạt."
                    : scoreResult >= 5
                    ? "Kết quả khá tốt! Hãy chú ý các phần phân tích ngữ pháp liên kết ở bên."
                    : "Cố gắng lên! Hãy nhấp vào các ô trống còn thiếu hoặc xem giải nghĩa để học thêm."}
                </p>
              </div>
            </div>
          )}

          {/* Vocabulary Completion Progress card */}
          <div className="bg-white rounded-2xl p-5 border border-[#e6e2db] shadow-xs flex flex-col" id="tracker-card">
            <h3 className="text-[10px] font-bold text-[#8e877e] uppercase tracking-wider mb-3.5 font-mono flex items-center justify-between">
              <span>Tiến trình hoàn thành từ</span>
              <span className="font-mono text-[11px] text-charcoal-deep bg-[#f5f1ea] px-2 py-0.5 rounded-md border border-[#e2dcd2]">
                {answersFilledCount} / 10
              </span>
            </h3>
            <div className="grid grid-cols-2 gap-2 text-[10.5px]">
              {currentPassage?.wordTasks.map((task) => {
                const answerValue = (userAnswers[task.id] || "").replace(/\s/g, "");
                const isCorrectAnswer = answerValue.toLowerCase() === task.missing.toLowerCase();
                const isFilledIn = answerValue.length > 0;
                
                let chipStyle = "";
                let indicatorText = "";

                if (isSubmitted) {
                  if (isCorrectAnswer) {
                    chipStyle = "bg-[#edf4ed] text-[#2a3c2a] border-[#bcccbc] font-bold";
                    indicatorText = `✓ ${task.fullWord}`;
                  } else {
                    chipStyle = "bg-[#fff5f5] text-red-900 border-[#f0c2c2] font-semibold";
                    indicatorText = `✗ ${task.prefix}${answerValue || "?"} (${task.fullWord})`;
                  }
                } else {
                  if (isFilledIn) {
                    chipStyle = "bg-amber-50/50 text-[#b45309] border-[#f0d6b2] font-semibold";
                    indicatorText = `${task.id + 1}. ${task.prefix}${answerValue}`;
                  } else {
                    chipStyle = "bg-[#faf8f5] text-[#9c9388] border-[#e0dad1] border-dashed italic hover:bg-white";
                    indicatorText = `${task.id + 1}. Gõ để điền...`;
                  }
                }

                return (
                  <button
                    key={task.id}
                    id={`vocabulary-tracker-btn-${task.id}`}
                    onClick={() => {
                      if (!isSubmitted) {
                        setFocusedWordId(task.id);
                        inputRefs.current[`${task.id}-0`]?.focus();
                      } else {
                        setFocusedWordId(task.id);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all duration-300 ${chipStyle}`}
                  >
                    <span className="truncate block font-sans">{indicatorText}</span>
                  </button>
                );
              })}
            </div>
          </div>


        </aside>
      </main>

      {/* 4. Footer Workspace with exact clean spacing */}
      <footer className="h-20 bg-warm-ivory border-t border-[#e6e2db] flex items-center justify-between px-6 sm:px-10 shrink-0 z-10" id="footer-actions">
        <div className="flex gap-4">
          <button 
            id="btn-footer-reset"
            onClick={handleResetChallenge}
            className="px-5 py-2.5 border border-[#d2ccd0] hover:border-charcoal-deep rounded-xl text-charcoal-deep text-xs font-bold bg-white hover:bg-neutral-50 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#8c857b]" /> Làm lại bài này
          </button>
        </div>

        <div className="flex items-center gap-6">
          <p className="text-[11px] text-[#8e877e] italic hidden md:block">
            Bài thi được lưu tạm thời trên trình duyệt của bạn.
          </p>
          
          {isSubmitted ? (
            <div className="flex items-center gap-3">
              {/* Reset challenge to do again, or proceed to next preset */}
              <button
                id="btn-do-again"
                onClick={() => {
                  setUserAnswers({});
                  setIsSubmitted(false);
                  setTimeRemaining(TIMER_START_SECONDS);
                  setCountUpTime(0);
                  setIsTimerPaused(false);
                  setFocusedWordId(null);
                  setAiFeedback(null);
                }}
                className="px-5 py-3 border border-[#e0dad1] bg-white hover:bg-[#faf8f5] text-[#1c1a17] text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Nhập lại từ đầu
              </button>
              
              {/* Next topic button */}
              <button
                id="btn-next-passage"
                onClick={() => {
                  const currentIndex = passages.findIndex((p) => p.id === currentPassageId);
                  const nextIndex = (currentIndex + 1) % passages.length;
                  handleSelectPassage(passages[nextIndex].id);
                }}
                className="px-6 py-3 bg-charcoal-deep hover:bg-[#34302c] text-warm-cream rounded-xl text-xs font-bold shadow-md transition-all duration-300 flex items-center gap-1.5 cursor-pointer border border-[#3e3b37]"
              >
                Bài đọc tiếp theo
                <ChevronRight className="w-4 h-4 text-warm-cream/80" />
              </button>
            </div>
          ) : (
            <button
              id="btn-submit-assessment"
              onClick={handleSubmitQuiz}
              disabled={answersFilledCount === 0}
              className="px-8 sm:px-10 py-3 bg-[#b45309] disabled:bg-[#ccc6be] text-warm-cream rounded-xl font-bold text-xs hover:bg-amber-750 transition-colors shadow-sm disabled:shadow-none cursor-pointer border border-[#c26218]"
            >
              Nộp bài & Kiểm tra đáp án
            </button>
          )}
        </div>
      </footer>

      {/* 5. Guided Help / Reference standard modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-[#1e1c19]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="help-modal-panel">
          <div className="bg-warm-ivory rounded-2xl max-w-lg w-full p-6 shadow-xl relative border border-[#e6e2db] animate-slide-up">
            <button
              id="btn-close-help-modal"
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4.5 right-4.5 text-[#8e877e] hover:text-charcoal-deep p-1.5 rounded-full hover:bg-[#f2ece3] cursor-pointer"
              title="Đóng hướng dẫn"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 mb-4 border-b border-[#f2ece3] pb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#b45309] flex items-center justify-center border border-amber-200/50">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-serif font-black text-charcoal-deep">
                Cẩm nang hoàn thành từ (TOEFL Micro-literacy)
              </h3>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-[#524c45] leading-relaxed font-sans">
              <p className="select-text">
                Dạng bài rèn luyện Micro-Literacy mô phỏng chuẩn xác Task 1 trong kỹ năng đọc hiểu của iBT TOEFL. Bằng cách ẩn bớt các chữ cái cuối của cấu trúc thuật ngữ, hệ thống kiểm toán chính xác năng lực phán đoán gốc liên kết, năng cú từ chuyên ngành và quán luật ngữ pháp văn cảnh.
              </p>
              
              <div className="bg-warm-cream p-4 rounded-xl border border-[#e0dad1] space-y-2.5">
                <h4 className="text-[10px] font-bold text-charcoal-deep uppercase font-mono tracking-wider flex items-center gap-1">
                  💡 Quy định & Cơ chế làm bài:
                </h4>
                <ul className="list-disc list-inside text-xs space-y-2 text-[#6e685f] pl-1 select-text">
                  <li>
                    <strong className="text-charcoal-deep">Đúng độ dài chữ cái:</strong> Mỗi vạch trống gạch dưới đại diện cho đúng một từ đơn vị chữ cái. Đọc kỹ đếm chính xác số ô còn trống của ô chọn!
                  </li>
                  <li>
                    <strong className="text-charcoal-deep">Lực phán vị chính xác:</strong> Tập trung giải quyết các liên từ cú thể (như <em>although, through, because</em>) hoặc đại hệ từ liên kết (như <em>they, these, which</em>) để tóm chặt ý luận văn cảnh.
                  </li>
                  <li>
                    <strong className="text-charcoal-deep">Tự động chuyển hộp tập trung:</strong> Sau khi nhập ký tự vào một hộp chữ cái riêng lẻ, tiêu điểm sẽ tự động dời sang ô kế cận giúp bạn hoàn toàn giữ mạch văn.
                  </li>
                </ul>
              </div>


            </div>

            <div className="mt-6 flex justify-end">
              <button
                id="btn-dismiss-help"
                onClick={() => setShowHelpModal(false)}
                className="px-6 py-2.5 bg-charcoal-deep hover:bg-[#34302c] text-warm-cream hover:text-white rounded-xl text-xs font-bold transition-all border border-[#3e3b37] cursor-pointer"
              >
                Nhất Trí & Bắt Đầu
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
