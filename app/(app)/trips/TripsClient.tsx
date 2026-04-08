"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppBackButton } from "@/components/navigation/AppBackButton";
import {
    MapPin,
    MapPinned,
    Calendar,
    Plus,
    X,
    Plane,
    Compass,
    Trash2,
    Clock,
    Stars,
    MoveRight,
    NotebookText,
    PencilLine,
    Users,
    Bell,
    Check
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage, toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { createTrip, deleteTrip, updateTrip } from "@/lib/actions/trips";
import { useQueryClient } from "@tanstack/react-query";
import { TRIP_KEYS, TripRecord, TripStatusGroup, useInfiniteTrips } from "@/hooks/use-trips";
import {
    formatTripDateInputValue,
    formatTripLongDateLabel,
    formatTripShortDateLabel,
} from "@/lib/trip-dates";

type TripBudgetCurrency = "USD" | "KHR";

interface TripFormState {
    budget: string;
    budgetCurrency: TripBudgetCurrency;
    destination: string;
    endDate: string;
    isSolo: boolean;
    notes: string;
    remindDayBefore: boolean;
    startDate: string;
    title: string;
}

interface TripsClientProps {
    user: unknown;
    profile: {
        user_type?: string | null;
    } | null;
}

interface CambodiaDestinationOption {
    aliases?: string[];
    label: string;
    note?: string;
}

const CAMBODIA_DESTINATIONS: CambodiaDestinationOption[] = [
    { label: "Banteay Meanchey" },
    { label: "Battambang" },
    { label: "Kampong Cham" },
    { label: "Kampong Chhnang" },
    { label: "Kampong Speu" },
    { label: "Kampong Thom" },
    { label: "Kampot" },
    { label: "Kandal" },
    { label: "Kep" },
    { label: "Koh Kong" },
    { label: "Kratie" },
    { label: "Mondulkiri" },
    { label: "Oddar Meanchey" },
    { label: "Pailin" },
    { label: "Phnom Penh", aliases: ["Phnom Penh (Capital City)"], note: "Capital city" },
    { label: "Preah Sihanouk", aliases: ["Sihanoukville"] },
    { label: "Preah Vihear" },
    { label: "Prey Veng" },
    { label: "Pursat" },
    { label: "Rattanakiri", aliases: ["Ratanakiri"] },
    { label: "Siem Reap" },
    { label: "Stung Treng" },
    { label: "Svay Rieng" },
    { label: "Takeo" },
    { label: "Tbong Khmum", aliases: ["Tboung Khmum"] },
];

function normalizeDestination(value: string) {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function matchesCambodiaDestination(option: CambodiaDestinationOption, value: string) {
    const normalizedValue = normalizeDestination(value);

    if (!normalizedValue) return true;

    return [option.label, ...(option.aliases ?? [])].some((candidate) =>
        normalizeDestination(candidate).includes(normalizedValue),
    );
}

function findCambodiaDestination(value: string) {
    const normalizedValue = normalizeDestination(value);

    if (!normalizedValue) return null;

    return (
        CAMBODIA_DESTINATIONS.find((option) =>
            [option.label, ...(option.aliases ?? [])].some(
                (candidate) => normalizeDestination(candidate) === normalizedValue,
            ),
        ) ?? null
    );
}

function createEmptyTripForm(isSolo: boolean): TripFormState {
    return {
        title: "",
        destination: "",
        startDate: "",
        endDate: "",
        budget: "",
        budgetCurrency: "USD",
        notes: "",
        isSolo,
        remindDayBefore: false,
    };
}

function getTripBudgetCurrency(trip: Pick<TripRecord, "metadata"> | { metadata?: unknown }) {
    if (!trip.metadata || typeof trip.metadata !== "object" || Array.isArray(trip.metadata)) {
        return "USD";
    }

    const budgetCurrency = (trip.metadata as { budgetCurrency?: unknown }).budgetCurrency;

    return budgetCurrency === "KHR" ? "KHR" : "USD";
}

function formatTripBudget(amount: number | string, currency: TripBudgetCurrency) {
    const numericAmount = typeof amount === "number" ? amount : Number(amount);

    if (!Number.isFinite(numericAmount)) return "";

    if (currency === "KHR") {
        return `${new Intl.NumberFormat("en-US", {
            maximumFractionDigits: 0,
        }).format(numericAmount)}៛`;
    }

    const hasDecimals = Math.abs(numericAmount % 1) > 0.000001;

    return `$${new Intl.NumberFormat("en-US", {
        minimumFractionDigits: hasDecimals ? 2 : 0,
        maximumFractionDigits: 2,
    }).format(numericAmount)}`;
}

function parseTripBudgetInput(value: string, currency: TripBudgetCurrency) {
    const normalized = value.replace(/,/g, "").trim();

    if (!normalized) return null;

    const amount = currency === "KHR"
        ? Number(normalized.replace(/[^\d]/g, ""))
        : Number(normalized.replace(/[^\d.]/g, ""));

    if (!Number.isFinite(amount)) return null;

    return currency === "KHR"
        ? Math.round(amount)
        : Math.round(amount * 100) / 100;
}

function formatTripBudgetInput(value: string, currency: TripBudgetCurrency) {
    const trimmedValue = value.trim();

    if (!trimmedValue) return "";

    if (currency === "KHR") {
        const digits = trimmedValue.replace(/[^\d]/g, "");

        if (!digits) return "";

        return new Intl.NumberFormat("en-US", {
            maximumFractionDigits: 0,
        }).format(Number(digits));
    }

    const cleanValue = trimmedValue.replace(/[^\d.]/g, "");
    const hasDecimalPoint = cleanValue.includes(".");
    const [rawIntegerPart = "", rawDecimalPart = ""] = cleanValue.split(".");
    const integerPart = rawIntegerPart.replace(/^0+(?=\d)/, "") || (rawIntegerPart ? "0" : "");
    const formattedIntegerPart = integerPart
        ? new Intl.NumberFormat("en-US", {
            maximumFractionDigits: 0,
        }).format(Number(integerPart))
        : "";
    const decimalPart = rawDecimalPart.replace(/\./g, "").slice(0, 2);

    if (!formattedIntegerPart && !hasDecimalPoint) return "";

    if (hasDecimalPoint) {
        return `${formattedIntegerPart || "0"}.${decimalPart}`;
    }

    return formattedIntegerPart;
}

function toTripForm(trip: TripRecord, isSolo: boolean): TripFormState {
    const budgetCurrency = getTripBudgetCurrency(trip);

    return {
        title: trip.title,
        destination: trip.destination,
        startDate: formatTripDateInputValue(trip.start_date),
        endDate: formatTripDateInputValue(trip.end_date),
        budget: trip.budget ? formatTripBudgetInput(trip.budget.toString(), budgetCurrency) : "",
        budgetCurrency,
        notes: trip.notes ?? "",
        isSolo,
        remindDayBefore: Boolean(trip.trip_reminder_enabled),
    };
}

export function TripsClient({ user, profile }: TripsClientProps) {
    void user;

    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<TripStatusGroup>("upcoming");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDestinationMenuOpen, setIsDestinationMenuOpen] = useState(false);
    const [editingTripId, setEditingTripId] = useState<string | null>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const {
        trips,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteTrips(activeTab);

    const isSingle = profile?.user_type === 'SINGLE';
    const isEditingTrip = editingTripId !== null;

    const [newTrip, setNewTrip] = useState<TripFormState>(() => createEmptyTripForm(isSingle));

    useEffect(() => {
        if (!hasNextPage || isFetchingNextPage) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    void fetchNextPage();
                }
            },
            { rootMargin: "320px" }
        );

        if (sentinelRef.current) {
            observer.observe(sentinelRef.current);
        }

        return () => observer.disconnect();
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    useEffect(() => {
        if (!isAddModalOpen || typeof document === "undefined") {
            return;
        }

        const { body, documentElement } = document;
        const scrollY = window.scrollY;
        const previousBodyStyles = {
            overflow: body.style.overflow,
            position: body.style.position,
            top: body.style.top,
            width: body.style.width,
        };
        const previousHtmlOverflow = documentElement.style.overflow;

        documentElement.style.overflow = "hidden";
        body.style.overflow = "hidden";
        body.style.position = "fixed";
        body.style.top = `-${scrollY}px`;
        body.style.width = "100%";

        return () => {
            documentElement.style.overflow = previousHtmlOverflow;
            body.style.overflow = previousBodyStyles.overflow;
            body.style.position = previousBodyStyles.position;
            body.style.top = previousBodyStyles.top;
            body.style.width = previousBodyStyles.width;
            window.scrollTo(0, scrollY);
        };
    }, [isAddModalOpen]);

    const filteredDestinations = CAMBODIA_DESTINATIONS.filter((option) =>
        matchesCambodiaDestination(option, newTrip.destination),
    );
    const selectedDestination = findCambodiaDestination(newTrip.destination);

    const resetTripForm = () => {
        setNewTrip(createEmptyTripForm(isSingle));
        setEditingTripId(null);
        setIsDestinationMenuOpen(false);
    };

    const closeTripModal = () => {
        setIsAddModalOpen(false);
        resetTripForm();
    };

    const openCreateTripModal = () => {
        resetTripForm();
        setIsAddModalOpen(true);
    };

    const openEditTripModal = (trip: TripRecord) => {
        setEditingTripId(trip.id);
        setNewTrip(toTripForm(trip, isSingle));
        setIsDestinationMenuOpen(false);
        setIsAddModalOpen(true);
    };

    const selectDestination = (destination: CambodiaDestinationOption) => {
        setNewTrip((prevTrip) => ({
            ...prevTrip,
            destination: destination.label,
        }));
        setIsDestinationMenuOpen(false);
    };

    const handleBudgetInputChange = (value: string) => {
        setNewTrip((prevTrip) => ({
            ...prevTrip,
            budget: formatTripBudgetInput(value, prevTrip.budgetCurrency),
        }));
    };

    const handleBudgetCurrencyChange = (currency: TripBudgetCurrency) => {
        setNewTrip((prevTrip) => {
            if (prevTrip.budgetCurrency === currency) {
                return prevTrip;
            }

            const parsedBudget = parseTripBudgetInput(prevTrip.budget, prevTrip.budgetCurrency);

            if (prevTrip.budget) {
                toast.info(
                    "Currency updated",
                    "The number was kept as-is and not converted. Adjust it if needed.",
                );
            }

            return {
                ...prevTrip,
                budgetCurrency: currency,
                budget: parsedBudget == null
                    ? ""
                    : formatTripBudgetInput(parsedBudget.toString(), currency),
            };
        });
    };

    const handleAddTrip = async (e: React.FormEvent) => {
        e.preventDefault();

        const provinceDestination = findCambodiaDestination(newTrip.destination);

        if (!provinceDestination) {
            toast.error(
                "Choose a Cambodia destination",
                "Select one of Cambodia's 25 provinces or Phnom Penh from the search list.",
            );
            setIsDestinationMenuOpen(true);
            return;
        }

        const parsedBudget = parseTripBudgetInput(newTrip.budget, newTrip.budgetCurrency);

        if (newTrip.budget.trim() && parsedBudget == null) {
            toast.error(
                "Invalid budget amount",
                `Enter a valid ${newTrip.budgetCurrency === "KHR" ? "Riel" : "Dollar"} amount.`,
            );
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                title: newTrip.title,
                destination: provinceDestination.label,
                startDate: newTrip.startDate,
                endDate: newTrip.endDate,
                budget: parsedBudget ?? undefined,
                budgetCurrency: newTrip.budgetCurrency,
                notes: newTrip.notes,
                isSolo: newTrip.isSolo,
                remindDayBefore: newTrip.remindDayBefore,
            };
            const result = editingTripId
                ? await updateTrip(editingTripId, payload)
                : await createTrip(payload);

            if (result.success) {
                await queryClient.invalidateQueries({ queryKey: TRIP_KEYS.all });
                closeTripModal();
                toast.success(
                    editingTripId ? "Trip updated" : "Trip created",
                    editingTripId
                        ? `${result.data.title} was updated.`
                        : `${result.data.title} is now in your planner.`,
                );
            }
        } catch (error: unknown) {
            console.error(error);
            toast.error(
                editingTripId ? "Couldn't update trip" : "Couldn't create trip",
                getErrorMessage(error, "Please try again."),
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTrip = async (tripId: string) => {
        if (!confirm("Are you sure you want to delete this trip?")) return;
        try {
            const result = await deleteTrip(tripId);
            if (result.success) {
                await queryClient.invalidateQueries({ queryKey: TRIP_KEYS.all });
                if (editingTripId === tripId) {
                    closeTripModal();
                }
                toast.success("Trip deleted", "The trip was removed from your planner.");
            }
        } catch (error: unknown) {
            console.error(error);
            toast.error("Couldn't delete trip", getErrorMessage(error, "Please try again."));
        }
    };

    const filteredTrips = trips;

    return (
        <div className="min-h-[100dvh] bg-slate-50/50 pb-20">
            {/* Header */}
            <header className={`sticky top-0 z-20 border-b bg-white/92 md:bg-white/80 md:backdrop-blur-xl ${isSingle ? 'border-emerald-100' : 'border-romantic-blush/30'}`}>
                <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                        <AppBackButton
                            fallbackHref="/dashboard"
                        />
                        <h1 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2 text-left">
                            {isSingle ? <Stars className="text-emerald-500" size={20} /> : <Compass className="text-romantic-heart" size={20} />}
                            Trip Planner
                        </h1>
                    </div>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-4 space-y-8">
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
                    {isLoading && filteredTrips.length === 0 ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div key={index} className="h-36 rounded-3xl bg-white animate-pulse shadow-sm" />
                            ))}
                        </div>
                    ) : filteredTrips.length === 0 ? (
                        <div className="text-center py-20 space-y-4">
                            <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center ${isSingle ? 'bg-emerald-50' : 'bg-romantic-blush/20'}`}>
                                <Plane size={32} className={isSingle ? 'text-emerald-400' : 'text-romantic-heart/40'} />
                            </div>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                                {activeTab === "past" ? "No memories yet" : "No trips planned yet"}
                            </p>
                            {activeTab === "upcoming" && (
                                <Button
                                    onClick={openCreateTripModal}
                                    className={`rounded-full px-6 font-bold shadow-lg ${isSingle ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-romantic-heart hover:bg-romantic-heart/90'}`}
                                >
                                    Start Planning
                                </Button>
                            )}
                        </div>
                    ) : (
                        filteredTrips.map((trip, idx) => (
                            <motion.div
                                key={trip.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <Card
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => openEditTripModal(trip)}
                                    onKeyDown={(event) => {
                                        if (event.key !== "Enter" && event.key !== " ") return;
                                        event.preventDefault();
                                        openEditTripModal(trip);
                                    }}
                                    className="cursor-pointer overflow-hidden border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md"
                                >
                                    <div className={`h-1 w-full ${isSingle ? 'bg-emerald-500/80' : 'bg-romantic-heart/80'}`} />
                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="mb-2 flex items-center gap-2">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${isSingle ? 'bg-emerald-50 text-emerald-700' : 'bg-romantic-blush/25 text-romantic-heart'}`}>
                                                        {isSingle ? "My Trip" : "Our Trip"}
                                                    </span>
                                                    {trip.status === 'ONGOING' && (
                                                        <span className="inline-flex items-center rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                                                            Ongoing
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                                                    <span className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full ${isSingle ? 'bg-emerald-50 text-emerald-600' : 'bg-romantic-blush/25 text-romantic-heart'}`}>
                                                        {isSingle ? <Stars size={14} /> : <Users size={14} />}
                                                    </span>
                                                    <span className="shrink-0">{isSingle ? "My" : "Our"}</span>
                                                    <div className="flex min-w-8 flex-1 items-center">
                                                        <div className="h-px flex-1 bg-slate-200" />
                                                        <MoveRight size={18} className="shrink-0 text-slate-300" />
                                                    </div>
                                                    <span className={cn(
                                                        "inline-flex min-w-0 items-center justify-end gap-1.5 truncate text-right",
                                                        isSingle ? "text-emerald-600" : "text-romantic-heart"
                                                    )}>
                                                        <MapPinned size={15} className="shrink-0" />
                                                        <span className="truncate">{trip.destination}</span>
                                                    </span>
                                                </div>

                                                <p className="mt-1 inline-flex max-w-full items-center gap-1.5 truncate text-sm font-semibold text-slate-500">
                                                    <Plane size={13} className="shrink-0 text-slate-400" />
                                                    <span className="truncate">{trip.title}</span>
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        openEditTripModal(trip);
                                                    }}
                                                    className={`rounded-full p-2 transition-colors ${isSingle ? 'text-emerald-400 hover:bg-emerald-50 hover:text-emerald-600' : 'text-romantic-heart/60 hover:bg-romantic-blush/20 hover:text-romantic-heart'}`}
                                                >
                                                    <PencilLine size={16} />
                                                </button>
                                                <button
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        void handleDeleteTrip(trip.id);
                                                    }}
                                                    className="rounded-full p-2 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                            <div className="mt-4 grid gap-2.5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-600">
                                                        <Calendar size={12} className="text-slate-400" />
                                                        {formatTripShortDateLabel(trip.start_date)} - {formatTripLongDateLabel(trip.end_date)}
                                                    </div>
                                                    {trip.trip_reminder_enabled ? (
                                                        <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold ${isSingle ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                            <Bell size={12} />
                                                            Pushes day before
                                                        </div>
                                                    ) : null}
                                                    {trip.budget ? (
                                                        <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold ${isSingle ? 'bg-emerald-50 text-emerald-700' : 'bg-romantic-blush/25 text-romantic-heart'}`}>
                                                        {/* <span className="text-[10px] font-black">
                                                            {getTripBudgetCurrency(trip) === "KHR" ? "៛" : "$"}
                                                        </span> */}
                                                        {formatTripBudget(trip.budget, getTripBudgetCurrency(trip))}
                                                    </div>
                                                ) : null}
                                            </div>

                                            {trip.notes ? (
                                                <div className="flex items-start gap-2 rounded-2xl bg-slate-50 px-3 py-2.5">
                                                    <NotebookText size={14} className="mt-0.5 shrink-0 text-slate-400" />
                                                    <p className="text-[11px] font-medium leading-relaxed text-slate-500">
                                                        {trip.notes}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5">
                                                    <MapPin size={14} className="shrink-0 text-slate-400" />
                                                    <p className="text-[11px] font-medium text-slate-500">
                                                        {isSingle ? "Solo plan ready for this destination." : "Shared getaway ready for both of you."}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))
                    )}

                    <div ref={sentinelRef} className="py-2 text-center">
                        {isFetchingNextPage ? (
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                                Loading more trips...
                            </p>
                        ) : hasNextPage ? (
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                                Scroll for more
                            </p>
                        ) : filteredTrips.length > 0 ? (
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                                End of your planner
                            </p>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Floating Action Button */}
            {!isAddModalOpen && (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={openCreateTripModal}
                    className={`fixed bottom-24 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center z-40 border-2 border-white text-white ${isSingle ? 'bg-emerald-500' : 'bg-romantic-heart'}`}
                >
                    <Plus size={24} />
                </motion.button>
            )}

            {/* Add Trip Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-center sm:px-4 sm:py-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={closeTripModal}
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative flex w-full max-w-none flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-2xl [max-height:96dvh] sm:max-h-[min(90dvh,46rem)] sm:max-w-xl sm:rounded-[2rem]"
                            data-pan-y="true"
                        >
                            <div className="shrink-0 border-b border-slate-100 px-5 pb-4 pt-3 sm:px-6 sm:pt-4">
                                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />

                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "rounded-2xl p-2.5",
                                        isSingle ? "bg-emerald-100 text-emerald-600" : "bg-romantic-blush/30 text-romantic-heart"
                                    )}>
                                        {isSingle ? <Stars size={20} /> : <Compass size={20} />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h2 className="text-lg font-black text-slate-800">
                                            {isEditingTrip ? "Edit Trip" : "Plan New Trip"}
                                        </h2>
                                        <p className="text-xs font-medium text-slate-500">
                                            {isEditingTrip
                                                ? "Update the destination, dates, budget, or notes for this trip"
                                                : isSingle
                                                    ? "Map out your next solo adventure"
                                                    : "Set dates, place, and budget for your next trip"}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={closeTripModal}
                                        className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100"
                                        aria-label="Close trip modal"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleAddTrip} className="flex min-h-0 flex-1 flex-col">
                                <div
                                    className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6"
                                    data-scroll-region="true"
                                >
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="ml-1 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[9px]">Trip Name</label>
                                            <Input
                                                required
                                                placeholder="e.g. Kampot Beach"
                                                value={newTrip.title}
                                                onChange={e => setNewTrip({ ...newTrip, title: e.target.value })}
                                                className={`h-12 rounded-xl border-slate-100 text-base [font-size:16px] ${isSingle ? 'focus-visible:border-emerald-500 focus-visible:ring-emerald-100' : 'focus-visible:border-romantic-heart focus-visible:ring-romantic-blush/40'}`}
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="ml-1 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[9px]">Destination</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                                <Input
                                                    required
                                                    autoComplete="off"
                                                    placeholder="Search Cambodia province"
                                                    value={newTrip.destination}
                                                    onBlur={() => setIsDestinationMenuOpen(false)}
                                                    onChange={(e) => {
                                                        setNewTrip({ ...newTrip, destination: e.target.value });
                                                        setIsDestinationMenuOpen(true);
                                                    }}
                                                    onFocus={() => setIsDestinationMenuOpen(true)}
                                                    onKeyDown={(event) => {
                                                        if (event.key !== "Enter" || filteredDestinations.length === 0) return;

                                                        event.preventDefault();
                                                        selectDestination(selectedDestination ?? filteredDestinations[0]);
                                                    }}
                                                    className={`h-12 rounded-xl border-slate-100 pl-9 text-base [font-size:16px] ${isSingle ? 'focus-visible:border-emerald-500 focus-visible:ring-emerald-100' : 'focus-visible:border-romantic-heart focus-visible:ring-romantic-blush/40'}`}
                                                />

                                                {isDestinationMenuOpen && (
                                                    <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
                                                        <div className="max-h-56 overflow-y-auto p-1.5" data-scroll-region="true">
                                                            {filteredDestinations.length > 0 ? (
                                                                filteredDestinations.map((destination) => (
                                                                    <button
                                                                        key={destination.label}
                                                                        type="button"
                                                                        onMouseDown={(event) => {
                                                                            event.preventDefault();
                                                                            selectDestination(destination);
                                                                        }}
                                                                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors ${selectedDestination?.label === destination.label
                                                                            ? isSingle
                                                                                ? "bg-emerald-50 text-emerald-700"
                                                                                : "bg-romantic-blush/20 text-romantic-heart"
                                                                            : "text-slate-600 hover:bg-slate-50"
                                                                            }`}
                                                                    >
                                                                        <div className="min-w-0">
                                                                            <p className="truncate text-sm font-bold">
                                                                                {destination.label}
                                                                            </p>
                                                                            <p className="text-[11px] font-medium text-slate-400 sm:text-[10px]">
                                                                                {destination.note ?? "Province"}
                                                                            </p>
                                                                        </div>
                                                                        <MapPin size={14} className="shrink-0 opacity-60" />
                                                                    </button>
                                                                ))
                                                            ) : (
                                                                <div className="px-3 py-3 text-sm font-medium text-slate-500 sm:text-xs">
                                                                    No Cambodia province matches that search.
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="ml-1 flex flex-col items-start justify-between gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                                                <p className="text-[11px] font-medium text-slate-400 sm:text-[10px]">
                                                    Type to search Cambodia&apos;s 25 provinces and Phnom Penh.
                                                </p>
                                                <span className="text-[11px] font-semibold text-slate-400 sm:text-[10px]">
                                                    {filteredDestinations.length} match{filteredDestinations.length === 1 ? "" : "es"}
                                                </span>
                                            </div>
                                            {newTrip.destination.trim() && !selectedDestination && (
                                                <p className="ml-1 text-[11px] font-medium text-amber-500 sm:text-[10px]">
                                                    Choose a destination from the list before creating the trip.
                                                </p>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div className="space-y-1.5">
                                                <label className="ml-1 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[9px]">Start Date</label>
                                                <Input
                                                    required
                                                    type="date"
                                                    value={newTrip.startDate}
                                                    onChange={e => setNewTrip({ ...newTrip, startDate: e.target.value })}
                                                    className={cn(
                                                        "h-12 rounded-xl border-slate-100 px-3 text-sm [font-size:16px] sm:text-base",
                                                        "[&::-webkit-calendar-picker-indicator]:ml-2 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-datetime-edit]:min-w-0 [&::-webkit-datetime-edit]:overflow-hidden [&::-webkit-datetime-edit]:p-0",
                                                        isSingle
                                                            ? "focus-visible:border-emerald-500 focus-visible:ring-emerald-100"
                                                            : "focus-visible:border-romantic-heart focus-visible:ring-romantic-blush/40"
                                                    )}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="ml-1 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[9px]">End Date</label>
                                                <Input
                                                    required
                                                    type="date"
                                                    value={newTrip.endDate}
                                                    onChange={e => setNewTrip({ ...newTrip, endDate: e.target.value })}
                                                    className={cn(
                                                        "h-12 rounded-xl border-slate-100 px-3 text-sm [font-size:16px] sm:text-base",
                                                        "[&::-webkit-calendar-picker-indicator]:ml-2 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-datetime-edit]:min-w-0 [&::-webkit-datetime-edit]:overflow-hidden [&::-webkit-datetime-edit]:p-0",
                                                        isSingle
                                                            ? "focus-visible:border-emerald-500 focus-visible:ring-emerald-100"
                                                            : "focus-visible:border-romantic-heart focus-visible:ring-romantic-blush/40"
                                                    )}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="ml-1 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[9px]">Budget (Optional)</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-300">
                                                    {newTrip.budgetCurrency === "KHR" ? "៛" : "$"}
                                                </span>
                                                <Input
                                                    type="text"
                                                    inputMode={newTrip.budgetCurrency === "KHR" ? "numeric" : "decimal"}
                                                    placeholder={newTrip.budgetCurrency === "KHR" ? "0" : "0.00"}
                                                    value={newTrip.budget}
                                                    onChange={e => handleBudgetInputChange(e.target.value)}
                                                    className={`h-12 rounded-xl border-slate-100 pl-9 text-base [font-size:16px] ${isSingle ? 'focus-visible:border-emerald-500 focus-visible:ring-emerald-100' : 'focus-visible:border-romantic-heart focus-visible:ring-romantic-blush/40'}`}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {(["USD", "KHR"] as const).map((currency) => (
                                                    <button
                                                        key={currency}
                                                        type="button"
                                                        onClick={() => handleBudgetCurrencyChange(currency)}
                                                        className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors sm:text-xs ${newTrip.budgetCurrency === currency
                                                            ? isSingle
                                                                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                                                : "border-romantic-heart bg-romantic-blush/20 text-romantic-heart"
                                                            : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                                            }`}
                                                    >
                                                        {currency === "USD" ? "Dollar ($)" : "Riel (៛)"}
                                                    </button>
                                                ))}
                                            </div>
                                            {newTrip.budget && (
                                                <p className="ml-1 text-[11px] font-medium text-slate-400 sm:text-[10px]">
                                                    Displayed as {formatTripBudget(newTrip.budget, newTrip.budgetCurrency)}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="ml-1 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[9px]">Notes (Optional)</label>
                                            <textarea
                                                placeholder="Any plans, reminders, or ideas for this trip?"
                                                value={newTrip.notes}
                                                onChange={(e) => setNewTrip({ ...newTrip, notes: e.target.value })}
                                                className={`min-h-[112px] w-full resize-none rounded-xl border border-slate-100 px-3 py-3 text-base text-slate-800 outline-none transition-[color,box-shadow,border-color] [font-size:16px] ${isSingle ? 'focus:border-emerald-500 focus:ring-3 focus:ring-emerald-100' : 'focus:border-romantic-heart focus:ring-3 focus:ring-romantic-blush/40'}`}
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setNewTrip((prevTrip) => ({
                                                    ...prevTrip,
                                                    remindDayBefore: !prevTrip.remindDayBefore,
                                                }))
                                            }
                                            className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors ${newTrip.remindDayBefore
                                                ? isSingle
                                                    ? 'border-emerald-300 bg-emerald-50'
                                                    : 'border-amber-300 bg-amber-50'
                                                : 'border-slate-200 bg-slate-50 hover:bg-white'
                                                }`}
                                        >
                                            <div className={cn(
                                                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                                                newTrip.remindDayBefore
                                                    ? isSingle
                                                        ? "border-emerald-500 bg-emerald-500 text-white"
                                                        : "border-amber-500 bg-amber-500 text-white"
                                                    : "border-slate-300 bg-white text-transparent"
                                            )}>
                                                <Check size={12} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <Bell size={15} className={newTrip.remindDayBefore ? (isSingle ? "text-emerald-600" : "text-amber-600") : "text-slate-400"} />
                                                    <p className="text-sm font-bold text-slate-800">
                                                        Add trip reminder
                                                    </p>
                                                </div>
                                                <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                                                    Shows this trip on Calendar and Reminders, then sends a push notification the day before it starts.
                                                </p>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                <div className="shrink-0 border-t border-slate-100 bg-white/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-6 sm:pb-6">
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={closeTripModal}
                                            className="h-11 flex-1 rounded-xl text-sm sm:text-xs"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className={`h-11 flex-1 rounded-xl text-sm font-bold shadow-lg transition-all sm:text-xs ${isSingle ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-romantic-heart hover:bg-romantic-heart/90'}`}
                                        >
                                            <span className="flex items-center justify-center gap-2">
                                                {isSubmitting ? <Clock className="animate-spin" size={16} /> : isEditingTrip ? <PencilLine size={16} /> : <Plus size={16} />}
                                                {isSubmitting ? (isEditingTrip ? "Saving..." : "Creating...") : isEditingTrip ? "Save Trip" : "Create Trip"}
                                            </span>
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
