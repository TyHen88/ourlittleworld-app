"use client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Sparkles } from "lucide-react";

interface CoupleHeaderProps {
    couple: any;
    myNickname: string;
    partnerNickname: string;
    myInitial: string;
    partnerInitial: string;
}

export function CoupleHeader({ couple, myNickname, partnerNickname, myInitial, partnerInitial }: CoupleHeaderProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
        >
            <Card className="p-8 border-none shadow-2xl bg-white/80 backdrop-blur-xl rounded-4xl relative overflow-hidden">
                {/* Decorative background */}
                <div className="absolute inset-0 bg-gradient-to-br from-romantic-blush/20 via-romantic-lavender/20 to-transparent" />

                {/* Floating couple avatars */}
                <div className="relative flex items-center justify-center mb-6">
                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="relative"
                    >
                        <Avatar className="w-24 h-24 border-4 border-white shadow-xl">
                            {couple?.couple_photo_url ? (
                                <AvatarImage src={couple.couple_photo_url} />
                            ) : (
                                <AvatarFallback className="bg-gradient-button text-white text-2xl">
                                    {myInitial}
                                </AvatarFallback>
                            )}
                        </Avatar>
                        <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-lg">
                            <Heart className="text-romantic-heart fill-romantic-heart" size={16} />
                        </div>
                        {/* Nickname label */}
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                            <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-md border-2 border-romantic-blush">
                                <span className="text-xs font-bold text-romantic-heart">{myNickname}</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Heart connector */}
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="mx-4"
                    >
                        <Heart className="text-romantic-heart fill-romantic-heart" size={32} />
                    </motion.div>

                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                        className="relative"
                    >
                        <Avatar className="w-24 h-24 border-4 border-white shadow-xl">
                            <AvatarFallback className="bg-gradient-to-br from-romantic-lavender to-romantic-blush text-white text-2xl">
                                {partnerInitial}
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-lg">
                            <Sparkles className="text-purple-500 fill-purple-500" size={16} />
                        </div>
                        {/* Nickname label */}
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                            <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-md border-2 border-romantic-lavender">
                                <span className="text-xs font-bold text-purple-600">{partnerNickname}</span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Been Together Title */}
                <div className="text-center space-y-2 mt-12">
                    <motion.h1
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="text-5xl font-black text-slate-800 tracking-tight"
                    >
                        Been Together
                    </motion.h1>
                    <h2 className="text-3xl font-bold text-slate-600 opacity-60">
                        Been Together
                    </h2>
                    <h3 className="text-xl font-semibold text-slate-400 opacity-40">
                        Been Together
                    </h3>
                </div>
            </Card>
        </motion.div>
    );
}
