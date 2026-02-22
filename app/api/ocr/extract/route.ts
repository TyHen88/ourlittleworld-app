import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Convert file to base64
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64Image = buffer.toString("base64");

        // Use Google Gemini Vision API to extract receipt data
        const geminiApiKey = process.env.GEMINI_API_KEY || "AIzaSyDPBp8dNUlVciTCf0-ht7mPuARMOTWK8zo";
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: "Extract the following information from this receipt image: Date (in YYYY-MM-DD format), Merchant/Store Name, Total Amount (number only, no currency symbol), and Currency. Return ONLY a valid JSON object with keys: date, name, amount, currency. If any field is not found, use null. Do not include any markdown formatting or code blocks, just the raw JSON.",
                                },
                                {
                                    inline_data: {
                                        mime_type: file.type,
                                        data: base64Image,
                                    },
                                },
                            ],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 300,
                    },
                }),
            }
        );

        if (!geminiResponse.ok) {
            const error = await geminiResponse.json();
            console.error("Gemini API error:", error);
            return NextResponse.json(
                { error: "Failed to process image" },
                { status: 500 }
            );
        }

        const geminiData = await geminiResponse.json();
        const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) {
            return NextResponse.json(
                { error: "No data extracted from receipt" },
                { status: 400 }
            );
        }

        // Clean up response (remove markdown code blocks if present)
        const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

        // Parse the JSON response
        const extractedData = JSON.parse(cleanContent);

        return NextResponse.json({
            success: true,
            data: {
                date: extractedData.date || null,
                name: extractedData.name || null,
                amount: extractedData.amount ? parseFloat(extractedData.amount) : null,
                currency: extractedData.currency || "USD",
            },
        });
    } catch (error: any) {
        console.error("OCR extraction error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to extract receipt data" },
            { status: 500 }
        );
    }
}
