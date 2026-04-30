import * as cheerio from "cheerio";

const BASE_URL = "https://tgws.plus/anpandb";

export type Character = {
  name: string;
  slug: string;
  firstAirDate: string;
  description: string;
  imageUrl: string;
};

export type Episode = {
  title: string;
  airDate: string;
  episodeNumber: string;
  slug: string;
};

function toAbsoluteImg(src: string): string {
  if (!src) return "";
  if (src.startsWith("http")) return src;
  return `${BASE_URL}/${src}`;
}

export async function searchCharacters(query: string): Promise<Character[]> {
  const url = `${BASE_URL}/chara?search=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);
  const characters: Character[] = [];

  $("table tbody tr").each((_, tr) => {
    const $tr = $(tr);

    const $nameCell = $tr.find("td.item-name");
    const href = $nameCell.find("a").first().attr("href") || "";
    const slug = href.replace(/^\/anpandb\//, "").replace(/\?.*$/, "").trim();
    if (!slug) return;

    const name = $nameCell.find(".article-link").text().trim();
    const imgSrc = $nameCell.find("img").first().attr("src") || "";
    const firstAirDate = $tr.find("td.item-date time").text().trim();
    const description = $tr.find("td.item-oneword").text().trim();

    if (name) {
      characters.push({ name, slug, firstAirDate, description, imageUrl: toAbsoluteImg(imgSrc) });
    }
  });

  return characters;
}

export async function getCharacterEpisodes(slug: string): Promise<{ character: Character | null; episodes: Episode[] }> {
  const [charaRes, animeRes] = await Promise.all([
    fetch(`${BASE_URL}/${slug}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      next: { revalidate: 3600 },
    }),
    fetch(`${BASE_URL}/anime?chara=${slug}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      next: { revalidate: 3600 },
    }),
  ]);

  let character: Character | null = null;
  if (charaRes.ok) {
    const html = await charaRes.text();
    const $ = cheerio.load(html);
    const name = $("h1").first().text().trim();
    const imgSrc = $(".ref-image img").first().attr("src") || $("article img, main img").first().attr("src") || "";
    if (name) {
      character = { name, slug, firstAirDate: "", description: "", imageUrl: toAbsoluteImg(imgSrc) };
    }
  }

  const episodes: Episode[] = [];
  if (animeRes.ok) {
    const html = await animeRes.text();
    const $ = cheerio.load(html);

    $("table tbody tr").each((_, tr) => {
      const $tr = $(tr);

      const $titleCell = $tr.find("td.item-title");
      const episodeHref = $titleCell.find("a").first().attr("href") || "";
      const episodeSlug = episodeHref.replace(/^\/anpandb\//, "").replace(/\?.*$/, "").trim();

      // ".article-link"のテキスト全体（例："1話『アンパンマン誕生』"）
      const fullText = $titleCell.find(".article-link").text().trim();
      // 『』の間のタイトルを抽出、なければfullTextをそのまま使用
      const titleMatch = fullText.match(/『(.+?)』/);
      const title = titleMatch ? titleMatch[1] : fullText;

      const airDate = $tr.find("td.item-date time").text().trim();
      const episodeNumber = $tr.find("td.item-numpart").text().trim();

      if (title) {
        episodes.push({ title, airDate, episodeNumber, slug: episodeSlug });
      }
    });
  }

  return { character, episodes };
}
