import { NextRequest, NextResponse } from "next/server";
import { getCachedUser } from "@/lib/auth-cache";
import { getCachedProfileWithCouple } from "@/lib/db-utils";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const user = await getCachedUser();
        if (!user || !user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { messages, currentPath } = await req.json();

        // 1. Gather Context for the AI
        const profile = await getCachedProfileWithCouple(user.id);
        const isSingle = profile?.user_type === 'SINGLE';
        const couple = profile?.couple;

        // Fetch recent budget status
        const budgets = await prisma.budget.findMany({
            where: isSingle ? { user_id: user.id } : { couple_id: couple?.id },
            orderBy: { created_at: 'desc' },
            take: 1
        }) as any[];

        // Fetch recent mood
        const recentMood = await prisma.dailyMood.findFirst({
            where: { user_id: user.id },
            orderBy: { created_at: 'desc' }
        }) as any;

        // Fetch active savings goals
        const savingsGoals = await prisma.savingsGoal.findMany({
            where: {
                ...(isSingle ? { user_id: user.id } : { couple_id: couple?.id }),
                is_completed: false
            },
            take: 3
        }) as any[];

        // Fetch upcoming trips
        const upcomingTrips = await prisma.trip.findMany({
            where: {
                ...(isSingle ? { user_id: user.id } : { couple_id: couple?.id }),
                status: 'PLANNED'
            },
            take: 2
        }) as any[];

        // 2. Build Context String with strict sanitization
        const context = `
            USER_CONTEXT:
            - Name: ${profile?.full_name || user.name || 'User'}
            - Mode: ${isSingle ? 'Single' : 'Couple'}
            - Current Location: ${currentPath || 'Dashboard'}
            - Partner Name: ${(!isSingle && couple) ? (couple.partner_1_nickname || 'Partner 1') + ' & ' + (couple.partner_2_nickname || 'Partner 2') : 'N/A'}
            - Current Mood: ${recentMood?.mood_emoji || 'Not set'} (${recentMood?.note || 'No note'})
            - Budget Status: ${budgets.length > 0 ? (budgets[0].monthly_total || '0.00') : 'No budget set'}
            - Savings Goals: ${savingsGoals.map((g: any) => `${g.title || 'Goal'} (${g.current_amount || 0}/${g.target_amount || 0})`).join(', ') || 'None'}
            - Upcoming Trips: ${upcomingTrips.map((t: any) => `${t.title || 'Trip'} to ${t.destination || 'Destination'}`).join(', ') || 'None'}
        `;

        const systemPrompt = `
            You are "OurLittleWorld-AI", a warm, empathetic, and hyper-intelligent Personal Life Mentor.
            Your voice should feel like a supportive, wise friend who truly knows and cares for the user.

            TONE & PERSONALITY (KHMER CULTURAL RULES):
            - BONG (បង) NOT NEAK (អ្នក): In Khmer, NEVER use the word "អ្នក" (Neak). It is too formal/cold. Always use "បង" (Bong) to refer to the user. It is much warmer and friendlier.
            - GREETINGS: ${messages.length === 0 ? 'Start the first conversation with a warm greeting like "សួស្តីបង" (Suesdei Bong) or "ជម្រាបសួរបង" for a warm, respectful connection.' : 'For ongoing conversations, jump straight into the wise and supportive advice without repeating the greeting.'}
            - POLITE PARTICLES: End Khmer sentences with polite particles like "បាទ" or "ចាស" where appropriate to sound polished and elite.
            - EMPOWERING: Your goal is to make the user feel motivated and seen. Use encouraging language.
            - NO CLINICAL JARGON: Never say "USER_CONTEXT" or refer to the data snapshots. Just weave the info into a natural conversation.

            STRICT FORMATTING & STRUCTURE:
            1. VISUAL HIERARCHY: Always use ## for main section headers and ** for key terms.
            2. NO ALL-CAPS: Never use all-caps for your responses or headers. Use natural mixed case.
            3. LISTS: Use bullet points for any lists of activities or advice points.
            4. RESPONSE STYLE: Provide detailed, high-value advice. Don't be too short.
            5. CONTEXT AWARENESS: Deeply analyze the conversation history. Refer back to things the user said earlier to show you are listening.
            6. NO UNDEFINED: Never use "undefined" or "null".

            DATA-FOCUS for ${profile?.full_name || 'the user'}:
            They are in ${isSingle ? 'Single' : 'Couple'} mode.
            Proactively help them reach their ${isSingle ? 'personal wellness' : 'shared relationship'} goals.
        `;

        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (!openaiApiKey) {
            return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
        }

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "system", content: `CURRENT DATA SNAPSHOT: ${context}` },
                    ...messages
                ],
                temperature: 0.7,
                max_tokens: 500,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("OpenAI API error:", error);
            return NextResponse.json({ error: "Failed to reach AI Advisor" }, { status: 500 });
        }

        const data = await response.json();
        const aiMessage = data.choices?.[0]?.message?.content || "";
        
        // Final safety check to remove any literal "undefined" strings that might leak
        const sanitizedMessage = aiMessage.replace(/undefined/gi, "").trim();

        return NextResponse.json({
            success: true,
            message: sanitizedMessage || "I'm here to help! How are you feeling today?"
        });

    } catch (error: unknown) {
        console.error("AI Advisor error:", error);
        return NextResponse.json({ 
            error: "Internal server error",
            message: "I'm having a small technical moment. Let's try again in a second!"
        }, { status: 500 });
    }
}
