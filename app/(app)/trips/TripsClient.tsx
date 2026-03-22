"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    MapPin, 
    Calendar, 
    DollarSign, 
    Plus, 
    ArrowLeft, 
    X, 
    Plane, 
    Compass, 
    History,
    MoreVertical,
    Trash2,
    CheckCircle2,
    Clock,
    Sparkles,
    Heart,
    Stars
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { createTrip, deleteTrip } from "@/lib/actions/trips";
import { useRouter } from "next/navigation";

interface TripsClientProps {
    user: any;
    profile: any;
    initialTrips: any[];
}

export function TripsClient({ user, profile, initialTrips }: TripsClientProps) {
    const router = useRouter();
    const [trips, setTrips] = useState(initialTrips);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

    const isSingle = profile?.user_type === 'SINGLE';
    const themeColor = isSingle ? "emerald" : "romantic";
    const accentColor = isSingle ? "emerald-600" : "romantic-heart";

    const [newTrip, setNewTrip] = useState({
        title: "",
        destination: "",
        startDate: "",
        endDate: "",
        budget: "",
        notes: "",
        isSolo: isSingle
    });

    const handleAddTrip = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const result = await createTrip({
                title: newTrip.title,
                destination: newTrip.destination,
                startDate: new Date(newTrip.startDate),
                endDate: new Date(newTrip.endDate),
                budget: newTrip.budget ? parseFloat(newTrip.budget) : undefined,
                notes: newTrip.notes,
                isSolo: newTrip.isSolo
            });

            if (result.success) {
                setTrips([result.data, ...trips]);
                setIsAddModalOpen(false);
                setNewTrip({
                    title: "",
                    destination: "",
                    startDate: "",
                    endDate: "",
                    budget: "",
                    notes: "",
                    isSolo: isSingle
                });
                router.refresh();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTrip = async (tripId: string) => {
        if (!confirm("Are you sure you want to delete this trip?")) return;
        try {
            const result = await deleteTrip(tripId);
            if (result.success) {
                setTrips(trips.filter(t => t.id !== tripId));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const upcomingTrips = trips.filter(t => new Date(t.end_date) >= new Date());
    const pastTrips = trips.filter(t => new Date(t.end_date) < new Date());
    const filteredTrips = activeTab === "upcoming" ? upcomingTrips : pastTrips;

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            {/* Header */}
            <header className={`sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b ${isSingle ? 'border-emerald-100' : 'border-romantic-blush/30'}`}>
                <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <h1 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                        {isSingle ? <Stars className="text-emerald-500" size={20} /> : <Compass className="text-romantic-heart" size={20} />}
                        Trip Planner
                    </h1>
                    <div className="w-10" /> {/* Spacer */}
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
                {/* Stats / Welcome */}
                <div className="text-center space-y-2">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${isSingle ? 'bg-emerald-50 text-emerald-600' : 'bg-romantic-blush/30 text-romantic-heart'}`}>
                        {isSingle ? 'Solo Adventures' : "Our Shared Travels"}
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 leading-tight">
                        {isSingle ? "Where to next, Explorer?" : "Where's our next adventure?"}
                    </h2>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-2xl w-full">
                    <button 
                        onClick={() => setActiveTab("upcoming")}
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === "upcoming" ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                    >
                        Upcoming
                    </button>
                    <button 
                        onClick={() => setActiveTab("past")}
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === "past" ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                    >
                        Memories
                    </button>
                </div>

                {/* Trip List */}
                <div className="space-y-4">
                    {filteredTrips.length === 0 ? (
                        <div className="text-center py-20 space-y-4">
                            <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center ${isSingle ? 'bg-emerald-50' : 'bg-romantic-blush/20'}`}>
                                <Plane size={32} className={isSingle ? 'text-emerald-400' : 'text-romantic-heart/40'} />
                            </div>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No trips planned yet</p>
                            <Button 
                                onClick={() => setIsAddModalOpen(true)}
                                className={`rounded-full px-6 font-bold shadow-lg ${isSingle ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-romantic-heart hover:bg-romantic-heart/90'}`}
                            >
                                Start Planning
                            </Button>
                        </div>
                    ) : (
                        filteredTrips.map((trip, idx) => (
                            <motion.div
                                key={trip.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow group">
                                    <div className="p-5 flex gap-4">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${isSingle ? 'bg-emerald-50 text-emerald-600' : 'bg-romantic-blush/40 text-romantic-heart'}`}>
                                            <MapPin size={24} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h3 className="text-lg font-bold text-slate-800 truncate">{trip.title}</h3>
                                                    <p className="text-sm font-medium text-slate-500 truncate">{trip.destination}</p>
                                                </div>
                                                <button 
                                                    onClick={() => handleDeleteTrip(trip.id)}
                                                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            
                                            <div className="mt-4 flex flex-wrap gap-3">
                                                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-slate-400">
                                                    <Calendar size={12} />
                                                    {format(new Date(trip.start_date), 'MMM d')} - {format(new Date(trip.end_date), 'MMM d, yyyy')}
                                                </div>
                                                {trip.budget && (
                                                    <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-emerald-500">
                                                        <DollarSign size={12} />
                                                        Budget: ${parseFloat(trip.budget.toString()).toLocaleString()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {trip.status === 'ONGOING' && (
                                        <div className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest text-center py-1">
                                            Currently Traveling
                                        </div>
                                    )}
                                </Card>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

            {/* Floating Action Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsAddModalOpen(true)}
                className={`fixed bottom-24 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center z-40 border-2 border-white text-white ${isSingle ? 'bg-emerald-500' : 'bg-romantic-heart'}`}
            >
                <Plus size={24} />
            </motion.button>

            {/* Add Trip Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => setIsAddModalOpen(false)}
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl p-6"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-black text-slate-800">Plan New Trip</h2>
                                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                    <X size={20} className="text-slate-400" />
                                </button>
                            </div>

                            <form onSubmit={handleAddTrip} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Trip Name</label>
                                    <Input 
                                        required
                                        placeholder="e.g. Summer in Kyoto"
                                        value={newTrip.title}
                                        onChange={e => setNewTrip({...newTrip, title: e.target.value})}
                                        className="rounded-2xl border-slate-100 focus:ring-emerald-500"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Destination</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                        <Input 
                                            required
                                            placeholder="Where are you going?"
                                            value={newTrip.destination}
                                            onChange={e => setNewTrip({...newTrip, destination: e.target.value})}
                                            className="pl-12 rounded-2xl border-slate-100 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Start Date</label>
                                        <Input 
                                            required
                                            type="date"
                                            value={newTrip.startDate}
                                            onChange={e => setNewTrip({...newTrip, startDate: e.target.value})}
                                            className="rounded-2xl border-slate-100 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">End Date</label>
                                        <Input 
                                            required
                                            type="date"
                                            value={newTrip.endDate}
                                            onChange={e => setNewTrip({...newTrip, endDate: e.target.value})}
                                            className="rounded-2xl border-slate-100 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Budget (Optional)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                        <Input 
                                            type="number"
                                            placeholder="0.00"
                                            value={newTrip.budget}
                                            onChange={e => setNewTrip({...newTrip, budget: e.target.value})}
                                            className="pl-12 rounded-2xl border-slate-100 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 pb-2">
                                    <Button 
                                        type="submit"
                                        disabled={isSubmitting}
                                        className={`w-full py-6 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${isSingle ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-romantic-heart hover:bg-romantic-heart/90'}`}
                                    >
                                        {isSubmitting ? <Clock className="animate-spin" size={18} /> : <Plus size={18} />}
                                        {isSubmitting ? "Creating Trip..." : "Create Trip"}
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
