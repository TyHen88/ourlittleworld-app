"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, Trash2, Zap, Palette, Award, LifeBuoy, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

import ReactMarkdown from "react-markdown";
import { Stats } from "fs";

interface Message {
  role: "user" | "assistant";
  content: string;
  isNew?: boolean;
}

// Sub-component for Typing Effect + Markdown
function TypewriterContent({ content = "", isNew, onComplete }: { content?: string, isNew?: boolean, onComplete?: () => void }) {
  const [displayedText, setDisplayedText] = useState(isNew ? "" : (content || ""));
  
  useEffect(() => {
    if (!isNew || !content) return;
    
    let index = 0;
    const cleanContent = content.replace(/undefined|null/gi, "").trim();
    if (!cleanContent) {
      setDisplayedText("");
      onComplete?.();
      return;
    }
    
    const timer = setInterval(() => {
      if (index < cleanContent.length) {
        setDisplayedText(cleanContent.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
        onComplete?.();
      }
    }, 15); // Faster character-by-character typing

    return () => clearInterval(timer);
  }, [content, isNew, onComplete]);

  return (
    <div className="prose prose-sm max-w-none prose-slate normal-case prose-p:my-2 prose-headings:text-slate-900 prose-strong:text-slate-900 prose-headings:mt-4 prose-headings:mb-2 prose-ul:my-2 prose-li:my-1" style={{ fontFamily: "'Mie Banjok', 'Battambang', serif" }}>
      <ReactMarkdown 
        components={{
          h1: ({...props}) => <h1 className="text-lg font-black tracking-tighter" {...props} />,
          h2: ({...props}) => <h2 className="text-sm font-bold tracking-tight text-slate-500" {...props} />,
          h3: ({...props}) => <h3 className="text-sm font-bold" {...props} />,
          p: ({...props}) => <p className="text-sm leading-relaxed text-slate-700 font-medium" {...props} />,
          ul: ({...props}) => <ul className="list-disc pl-5 space-y-1" {...props} />,
          ol: ({...props}) => <ol className="list-decimal pl-5 space-y-1" {...props} />,
          li: ({...props}) => <li className="text-sm text-slate-700 font-medium" {...props} />,
          strong: ({...props}) => <strong className="font-extrabold text-slate-900" {...props} />,
          blockquote: ({...props}) => <blockquote className="border-l-4 border-emerald-200 pl-4 italic text-slate-600 my-4" {...props} />,
          // Auto-animate any text that matches emoji patterns
          em: ({...props}) => <span className="inline-block animate-bounce-subtle mx-0.5" {...props} />,
        }}
      >
        {displayedText.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\uD83E[\uDC00-\uDFFF])/g, '*$1*')}
      </ReactMarkdown>
    </div>
  );
}

export function AIFloatingAdvisor({ isSingle }: { isSingle: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", content: input, isNew: false };
    // Mark old as assistant messages as NOT new
    setMessages((prev) => prev.map((m): Message => ({ ...m, isNew: false })).concat(userMsg));
    
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: messages.concat(userMsg).map(({role, content}) => ({role, content})),
          currentPath: pathname
        })
      });

      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.message, isNew: true }]);
      }
    } catch (err) {
      console.error("AI chat error:", err);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const markAsOld = (index: number) => {
    setMessages(prev => prev.map((m, i) => i === index ? { ...m, isNew: false } : m));
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100]"
          />
        )}
      </AnimatePresence>

      {/* Bottom Sheet Chat */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[101] flex items-end justify-center pointer-events-none">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-xl bg-white rounded-t-[1.5rem] shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[90vh]"
            >
              {/* Luxury Handle */}
              <div className="pt-3 pb-1 flex justify-center">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
              </div>

              {/* Header */}
              <div className="px-6 py-4 flex items-center justify-between border-b border-slate-50">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-2xl text-white shadow-lg",
                    isSingle ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-indigo-500 to-purple-700"
                  )}>
                    <Bot size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-lg tracking-tight">OurLittleWorld AI</h4>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Life & Energy Mentor</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={clearChat} 
                    title="Clear history"
                    className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Chat Content */}
              <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/30">
                {/* Suggestions - Only show when no messages */}
                {messages.length === 0 && (
                  <div className="px-6 py-6 space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Deep Context Advice</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { icon: Zap, label: "Energy Boost", prompt: "I'm feeling low on energy. Give me a healthy routine idea." },
                        { icon: Award, label: "Career Goal", prompt: "How can I better track my professional growth?" },
                        { icon: Palette, label: "Healthy Hobby", prompt: "Recommend a creative hobby for stress relief." },
                        { icon: LifeBuoy, label: "Life Balance", prompt: "Give me an advice for balancing work and family." },
                      ].map((item) => (
                        <button 
                          key={item.label}
                          onClick={() => setInput(item.prompt)}
                          className="p-3.5 bg-white hover:bg-slate-50 hover:border-slate-300 rounded-[1.25rem] text-left transition-all border border-slate-100 shadow-sm flex items-center gap-3 group relative overflow-hidden"
                        >
                          <div className={cn(
                            "p-2 rounded-xl transition-colors",
                            isSingle ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100" : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100"
                          )}>
                            <item.icon size={18} />
                          </div>
                          <span className="text-[11px] font-bold text-slate-700 leading-tight tracking-wider">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages List */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scroll-smooth"
                >
                  {messages.map((m, i) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={i} 
                      className={cn(
                        "flex",
                        m.role === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div 
                        className={cn(
                          "p-4 rounded-[1.5rem] text-sm leading-relaxed max-w-[90%] shadow-sm",
                          m.role === 'user' 
                            ? "bg-white text-slate-800 rounded-tr-none border border-slate-100" 
                            : (isSingle ? "bg-emerald-50 text-emerald-900 rounded-tl-none border border-emerald-100" : "bg-indigo-50 text-indigo-900 rounded-tl-none border border-indigo-100")
                        )}
                        style={{ fontFamily: "'Mie Banjok', 'Battambang', serif" }}
                      >
                        {m.role === 'assistant' ? (
                          <TypewriterContent 
                            content={m.content} 
                            isNew={m.isNew} 
                            onComplete={() => markAsOld(i)} 
                          />
                        ) : (
                          <p className="whitespace-pre-wrap font-medium">{m.content}</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="p-4 bg-white rounded-[1.5rem] rounded-tl-none border border-slate-100 shadow-sm">
                        <div className="flex gap-1.5">
                          <div className={cn("w-1.5 h-1.5 rounded-full animate-bounce", isSingle ? "bg-emerald-400" : "bg-indigo-400")} />
                          <div className={cn("w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.2s]", isSingle ? "bg-emerald-400" : "bg-indigo-400")} />
                          <div className={cn("w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.4s]", isSingle ? "bg-emerald-400" : "bg-indigo-400")} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-6 bg-white border-t border-slate-100">
                  <div className="relative flex items-center group">
                    <input 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Ask for advice..."
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-slate-100 rounded-[1.5rem] px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-slate-400/5 pr-14 transition-all"
                      style={{ fontFamily: "'Mie Banjok', 'Battambang', serif" }}
                    />
                    <button 
                      onClick={handleSend}
                      disabled={!input.trim() || loading}
                      className={cn(
                        "absolute right-2 p-3 rounded-2xl transition-all shadow-xl active:scale-90",
                        isSingle ? "bg-emerald-600 text-white shadow-emerald-500/20" : "bg-indigo-600 text-white shadow-indigo-500/20",
                        (!input.trim() || loading) && "opacity-50 grayscale"
                      )}
                    >
                      <Send size={20} />
                    </button>
                  </div>
                  <p className="text-center mt-3 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Context-Aware AI Intelligence</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Floating Trigger Button */}
      <div className="fixed bottom-24 right-6 z-[90]">
        <motion.button
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-16 h-16 rounded-full shadow-2xl flex items-center justify-center border-4 border-white transition-all transform",
            isSingle 
              ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30" 
              : "bg-gradient-to-br from-indigo-500 to-purple-700 shadow-indigo-500/30",
            isOpen ? "rotate-90 scale-0 opacity-0" : "scale-100 opacity-100"
          )}
        >
          <Sparkles className="text-white fill-white" size={30} />
        </motion.button>
      </div>
    </>
  );
}
