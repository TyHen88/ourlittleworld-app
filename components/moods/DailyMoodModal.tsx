"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, X } from "lucide-react";
import { submitDailyMood } from "@/lib/actions/moods";

const MOOD_EMOJIS = [
    { emoji: "😊", label: "Happy" },
    { emoji: "❤️", label: "Lovey" },
    { emoji: "🥱", label: "Tired" },
    { emoji: "🎉", label: "Excited" },
    { emoji: "🤔", label: "Thinking" },
    { emoji: "😌", label: "Peaceful" },
    { emoji: "🥰", label: "In Love" },
    { emoji: "💪", label: "Strong" },
];

interface DailyMoodModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DailyMoodModal({ open, onOpenChange }: DailyMoodModalProps) {
    const [selectedMood, setSelectedMood] = useState<string | null>(null);
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!selectedMood) return;

        setLoading(true);
        const result = await submitDailyMood({
            moodEmoji: selectedMood,
            note: note.trim() || undefined,
        });

        setLoading(false);

        if (result.success) {
            // Close with heart animation
            setSelectedMood(null);
            setNote("");
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md border-none shadow-2xl bg-white/95 backdrop-blur-xl rounded-4xl">
                <DialogHeader>
                    <DialogTitle className="text-center text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
                        How's your day, love? 😊
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Mood Emoji Picker */}
                    <div className="grid grid-cols-4 gap-3">
                        {MOOD_EMOJIS.map((mood) => (
                            <motion.button
                                key={mood.emoji}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSelectedMood(mood.emoji)}
                                className={`
                                    p-4 rounded-2xl text-3xl transition-all
                                    ${selectedMood === mood.emoji
                                        ? 'bg-gradient-button shadow-lg ring-2 ring-romantic-heart'
                                        : 'bg-romantic-blush/20 hover:bg-romantic-blush/40'
                                    }
                                `}
                                title={mood.label}
                            >
                                {mood.emoji}
                            </motion.button>
                        ))}
                    </div>

                    {/* Optional Note */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-600">
                            Add a note (optional)
                        </label>
                        <Input
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Feeling great today! 💕"
                            maxLength={100}
                            className="rounded-2xl border-romantic-blush bg-white/50"
                        />
                        <p className="text-xs text-slate-400 text-right">
                            {note.length}/100
                        </p>
                    </div>

                    {/* Submit Button */}
                    <Button
                        onClick={handleSubmit}
                        disabled={!selectedMood || loading}
                        className="w-full h-12 rounded-3xl bg-gradient-button text-white shadow-lg text-base"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin mr-2">💕</div>
                                Sending...
                            </>
                        ) : (
                            <>
                                <Heart className="mr-2" size={18} />
                                Share My Mood
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
