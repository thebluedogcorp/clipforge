import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const maxDuration = 120;

interface CaptionReq {
  transcript: string;
  duration: number; // seconds
  maxPerCaption?: number;
}

/**
 * POST /api/captions
 * Body: { transcript, duration, maxPerCaption? }
 * Uses the LLM to break a raw transcript into short, timed caption segments
 * distributed evenly across the video duration. Returns { segments: [{start,end,text}] }
 */
export async function POST(req: NextRequest) {
  try {
    const { transcript, duration, maxPerCaption = 7 } =
      (await req.json()) as CaptionReq;

    if (!transcript || !transcript.trim()) {
      return NextResponse.json(
        { error: "Transcript is required" },
        { status: 400 }
      );
    }
    if (!duration || duration <= 0) {
      return NextResponse.json(
        { error: "Valid duration is required" },
        { status: 400 }
      );
    }

    const words = transcript.trim().split(/\s+/);
    // estimate number of caption lines from word count / maxPerCaption
    const approxLines = Math.max(1, Math.ceil(words.length / maxPerCaption));

    const system = `You are a professional subtitle editor for short-form video (TikTok/Reels/Shorts style).
You split a raw spoken transcript into punchy, readable caption segments.
Each segment must be SHORT: 3 to ${maxPerCaption} words, never longer.
Timestamps are in SECONDS (float). Segments MUST be contiguous, non-overlapping,
monotonically increasing, and cover the full duration ${duration.toFixed(
      2
    )}s. The last segment must end at exactly ${duration.toFixed(2)}.
Distribute segments proportionally to the amount of speech.
Fix obvious speech-recognition errors, remove filler words (um, uh), and add
light capitalization/punctuation. Keep the original meaning.
Respond with ONLY a JSON array, no markdown, no commentary.
Schema: [{"start": number, "end": number, "text": string}]`;

    const user = `Transcript (video duration ${duration.toFixed(2)}s, ~${approxLines} caption lines expected):
"""
${transcript}
"""

Return the JSON array now.`;

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";

    // extract the JSON array defensively
    const match = raw.match(/\[[\s\S]*\]/);
    let segments: { start: number; end: number; text: string }[] = [];
    if (match) {
      try {
        segments = JSON.parse(match[0]);
      } catch {
        segments = [];
      }
    }

    // validate + sanitize
    segments = (segments || [])
      .filter(
        (s) =>
          typeof s.start === "number" &&
          typeof s.end === "number" &&
          typeof s.text === "string" &&
          s.text.trim().length > 0
      )
      .map((s) => ({
        start: Math.max(0, s.start),
        end: Math.min(duration, s.end),
        text: s.text.trim(),
      }))
      .filter((s) => s.end > s.start)
      .sort((a, b) => a.start - b.start);

    // fallback: if the model returned nothing usable, build even segments
    if (segments.length === 0) {
      const chunkSize = maxPerCaption;
      const chunks: string[] = [];
      for (let i = 0; i < words.length; i += chunkSize) {
        chunks.push(words.slice(i, i + chunkSize).join(" "));
      }
      const per = duration / chunks.length;
      segments = chunks.map((text, i) => ({
        start: i * per,
        end: i === chunks.length - 1 ? duration : (i + 1) * per,
        text,
      }));
    }

    return NextResponse.json({ segments });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Caption generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
