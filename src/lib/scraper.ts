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

export async function searchCharacters(query: string): Promise<Character[]> {
  const url = `${BASE_URL}/chara?search=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AnpanmanApp/1.0)" },
    next: { revalidate: 3600 },
  });

  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);
  const characters: Character[] = [];

  $("table.list tr, .chara-list .item, article, .entry").each((_, el) => {
    const $el = $(el);
    const linkEl = $el.find("a[href*='/anpandb/']").first();
    const href = linkEl.attr("href") || "";
    const slug = href.replace(/.*\/anpandb\//, "").replace(/\?.*$/, "").trim();

    if (!slug || slug === "chara" || slug === "") return;

    const name = $el.find(".name, .chara-name").first().text().trim() || linkEl.text().trim();
    const firstAirDate = $el.find("a[href*='date='], .date").first().text().trim();
    const description = $el.find(".description, .memo, td:last-child").first().text().trim();
    const imgSrc = $el.find("img").first().attr("src") || "";
    const imageUrl = imgSrc.startsWith("http") ? imgSrc : imgSrc ? `https://tgws.plus${imgSrc}` : "";

    if (name) {
      characters.push({ name, slug, firstAirDate, description, imageUrl });
    }
  });

  if (characters.length === 0) {
    $("a[href*='/anpandb/']").each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href") || "";
      const slug = href.replace(/.*\/anpandb\//, "").replace(/\?.*$/, "").trim();
      const pathParts = slug.split("/");

      if (
        !slug ||
        pathParts.length !== 1 ||
        ["chara", "anime", "item", "area", "music", "term", "staff", "column", "goods"].includes(slug)
      )
        return;

      const name = $el.text().trim();
      if (name && name.length > 0) {
        characters.push({ name, slug, firstAirDate: "", description: "", imageUrl: "" });
      }
    });
  }

  const seen = new Set<string>();
  return characters.filter((c) => {
    if (seen.has(c.slug)) return false;
    seen.add(c.slug);
    return true;
  });
}

export async function getCharacterEpisodes(slug: string): Promise<{ character: Character | null; episodes: Episode[] }> {
  const [charaRes, animeRes] = await Promise.all([
    fetch(`${BASE_URL}/${slug}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AnpanmanApp/1.0)" },
      next: { revalidate: 3600 },
    }),
    fetch(`${BASE_URL}/anime?chara=${slug}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AnpanmanApp/1.0)" },
      next: { revalidate: 3600 },
    }),
  ]);

  let character: Character | null = null;
  if (charaRes.ok) {
    const html = await charaRes.text();
    const $ = cheerio.load(html);
    const name = $("h1, .chara-name, .entry-title").first().text().trim();
    const imgSrc = $(".chara-image img, .entry-image img, article img").first().attr("src") || "";
    const imageUrl = imgSrc.startsWith("http") ? imgSrc : imgSrc ? `https://tgws.plus${imgSrc}` : "";
    if (name) {
      character = { name, slug, firstAirDate: "", description: "", imageUrl };
    }
  }

  const episodes: Episode[] = [];
  if (animeRes.ok) {
    const html = await animeRes.text();
    const $ = cheerio.load(html);

    $("table.list tr, .anime-list .item, article, .entry").each((_, el) => {
      const $el = $(el);
      const linkEl = $el.find("a[href*='/anpandb/anime/'], a[href*='/anpandb/story/']").first();
      const href = linkEl.attr("href") || "";
      const episodeSlug = href.replace(/.*\/anpandb\//, "").replace(/\?.*$/, "").trim();

      const title = $el.find(".title, .anime-title, .entry-title").first().text().trim() || linkEl.text().trim();
      const airDate = $el.find("a[href*='date='], .date, time").first().text().trim();
      const episodeNumber = $el.find(".episode-num, .num, td:nth-child(2)").first().text().trim();

      if (title) {
        episodes.push({ title, airDate, episodeNumber, slug: episodeSlug });
      }
    });

    if (episodes.length === 0) {
      $("a[href*='/anpandb/']").each((_, el) => {
        const $el = $(el);
        const href = $el.attr("href") || "";
        if (!href.includes("anime") && !href.includes("story")) return;
        const title = $el.text().trim();
        if (title && title.length > 1) {
          episodes.push({ title, airDate: "", episodeNumber: "", slug: "" });
        }
      });
    }
  }

  return { character, episodes };
}
