import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/transcribe
 * Accepts a multipart/form-data upload with an `audio` file (mp3/wav).
 * Returns { text: string } from the ASR model.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("audio");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // size guard — 25MB keeps us within sane limits
    const MAX = 25 * 1024 * 1024;
    if (file.size > MAX) {
      return NextResponse.json(
        { error: `Audio too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 25MB.` },
        { status: 413 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const base64 = buf.toString("base64");

    const zai = await ZAI.create();
    const response = await zai.audio.asr.create({ file_base64: base64 });
    const text = (response?.text ?? "").trim();

    if (!text) {
      return NextResponse.json(
        { error: "Transcription returned empty text" },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
