import Groq from "groq-sdk";
import * as dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
    console.warn("GROQ_API_KEY is not defined in environment variables!");
}

const groq = new Groq({ apiKey });

interface SummarizeResult {
    title: string;
    summary: string;
}

export const summarizeArticle = async (
    title: string,
    content: string,
    fallbackSnippet: string
): Promise<SummarizeResult> => {
    const textToSummarize = content && content.length > 200 ? content : fallbackSnippet;

    if (!textToSummarize || textToSummarize.length < 50) {
        return {
        title,
        summary: "This article is too short or lacks sufficient content to generate a meaningful summary.",
        };
    }

    try {
        const trimmedText = textToSummarize.slice(0, 4000);

        const chatCompletion = await groq.chat.completions.create({
        messages: [
            {
            role: "system",
            content: "You are an expert news editor who creates accurate titles and summaries based on article content. Provide direct responses in JSON format matching the schema."
            },
            {
            role: "user",
            content: `Based on the following article content, generate:
1. A concise, accurate title
2. A brief 2-3 sentence summary (retaining key context and facts)

Format your response as a JSON object with keys "title" and "summary".

Here is the article content:
${trimmedText}`
        }
        ],
        model: "llama-3.1-8b-instant",
        response_format: { type: "json_object" }
    });

    const textResponse = chatCompletion.choices[0]?.message?.content;
    
    if (textResponse) {
        const data = JSON.parse(textResponse) as SummarizeResult;
        return {
            title: data.title || title,
            summary: data.summary || "Summary extraction failed.",
        };
    }
    
    throw new Error("Empty response from Groq");
    } catch (error) {
    console.error("Error generating Groq summary:", error);
    return {
        title,
        summary: fallbackSnippet.slice(0, 150) + "...",
    };
    }
};