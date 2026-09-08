import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /youtube\.com\/v\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

/**
 * GET /api/youtube?url=...
 * Returns oEmbed metadata (title, author, thumbnail) for a YouTube URL.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }
  const id = extractYouTubeId(url);
  if (!id) {
    return NextResponse.json(
      { error: "Could not parse a YouTube video id from that URL" },
      { status: 400 }
    );
  }

  try {
    const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${id}`
    )}&format=json`;
    const res = await fetch(oembed, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { error: "YouTube video not found or is private" },
        { status: 404 }
      );
    }
    const data = await res.json();
    return NextResponse.json({
      id,
      title: data.title,
      author: data.author_name,
      thumbnail: data.thumbnail_url,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "YouTube lookup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
