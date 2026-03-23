import { NextRequest, NextResponse } from "next/server";
import { getCachedUser } from "@/lib/auth-cache";

export async function POST(request: NextRequest) {
    try {
        const user = await getCachedUser();

        if (!user || user.id === undefined) {
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

        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (!openaiApiKey) {
            return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
        }

        // OpenAI Vision API
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini", // Cost-effective vision model
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Extract the following information from this receipt image: Date (in YYYY-MM-DD format), Merchant/Store Name, Total Amount (number only, no currency symbol), and Currency. Return ONLY a valid JSON object with keys: date, name, amount, currency. If any field is not found, use null. Do not include any markdown formatting or code blocks, just the raw JSON.",
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:${file.type};base64,${base64Image}`,
                                },
                            },
                        ],
                    },
                ],
                max_tokens: 300,
                response_format: { type: "json_object" },
            }),
        });

        if (!openaiResponse.ok) {
            const error = await openaiResponse.json();
            console.error("OpenAI API error:", error);
            return NextResponse.json({ error: "Failed to process image with AI" }, { status: 500 });
        }

        const openaiData = await openaiResponse.json();
        const messageContent = openaiData.choices?.[0]?.message?.content;

        if (!messageContent) {
            return NextResponse.json({ error: "No data extracted from receipt" }, { status: 400 });
        }

        // Parse JSON response
        const extractedData = JSON.parse(messageContent);

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
