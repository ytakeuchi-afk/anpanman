import { NextRequest, NextResponse } from "next/server";
import { searchCharacters } from "@/lib/scraper";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query || query.trim().length === 0) {
    return NextResponse.json({ error: "検索キーワードを入力してください" }, { status: 400 });
  }

  try {
    const characters = await searchCharacters(query.trim());
    return NextResponse.json({ characters });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "データの取得に失敗しました" }, { status: 500 });
  }
}
