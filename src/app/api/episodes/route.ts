import { NextRequest, NextResponse } from "next/server";
import { getCharacterEpisodes } from "@/lib/scraper";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug || slug.trim().length === 0) {
    return NextResponse.json({ error: "キャラクターが指定されていません" }, { status: 400 });
  }

  try {
    const data = await getCharacterEpisodes(slug.trim());
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "データの取得に失敗しました" }, { status: 500 });
  }
}
