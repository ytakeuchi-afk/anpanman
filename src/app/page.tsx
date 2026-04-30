"use client";

import { useState } from "react";
import type { Character, Episode } from "@/lib/scraper";

type SearchState = "idle" | "searching" | "selecting" | "loading" | "done" | "error";

export default function Home() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>("idle");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setState("searching");
    setCharacters([]);
    setSelectedCharacter(null);
    setEpisodes([]);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "検索に失敗しました");
      if (data.characters.length === 0) {
        setErrorMsg("キャラクターが見つかりませんでした");
        setState("error");
      } else if (data.characters.length === 1) {
        setCharacters(data.characters);
        await loadEpisodes(data.characters[0]);
      } else {
        setCharacters(data.characters);
        setState("selecting");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "エラーが発生しました");
      setState("error");
    }
  }

  async function loadEpisodes(character: Character) {
    setSelectedCharacter(character);
    setState("loading");
    setEpisodes([]);

    try {
      const res = await fetch(`/api/episodes?slug=${encodeURIComponent(character.slug)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "データ取得に失敗しました");

      const char = data.character ?? character;
      setSelectedCharacter({ ...character, ...char });
      setEpisodes(data.episodes);
      setState("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "エラーが発生しました");
      setState("error");
    }
  }

  function handleReset() {
    setQuery("");
    setState("idle");
    setCharacters([]);
    setSelectedCharacter(null);
    setEpisodes([]);
    setErrorMsg("");
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-red-50 to-yellow-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* ヘッダー */}
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-red-600 mb-2">
            🍞 アンパンマン 登場話検索
          </h1>
          <p className="text-gray-600">
            キャラクター名を入力すると、アニメの登場話を調べられます
          </p>
        </header>

        {/* 検索フォーム */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例：アンパンマン、ばいきんまん、カレーパンマン"
            className="flex-1 px-4 py-3 rounded-xl border-2 border-red-300 focus:border-red-500 focus:outline-none text-gray-800 bg-white shadow-sm"
          />
          <button
            type="submit"
            disabled={state === "searching" || state === "loading"}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-bold rounded-xl shadow-sm transition-colors"
          >
            {state === "searching" || state === "loading" ? "検索中…" : "検索"}
          </button>
          {state !== "idle" && (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-colors"
            >
              リセット
            </button>
          )}
        </form>

        {/* ローディング */}
        {(state === "searching" || state === "loading") && (
          <div className="text-center py-12">
            <div className="inline-block w-10 h-10 border-4 border-red-400 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600">
              {state === "searching" ? "キャラクターを検索しています…" : "登場話を取得しています…"}
            </p>
          </div>
        )}

        {/* エラー */}
        {state === "error" && (
          <div className="bg-red-100 border border-red-300 rounded-xl p-4 text-red-700">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* キャラクター選択 */}
        {state === "selecting" && (
          <section>
            <h2 className="text-lg font-bold text-gray-700 mb-3">
              {characters.length}件のキャラクターが見つかりました。選択してください：
            </h2>
            <div className="grid gap-3">
              {characters.map((c) => (
                <button
                  key={c.slug}
                  onClick={() => loadEpisodes(c)}
                  className="flex items-center gap-4 p-4 bg-white rounded-xl border-2 border-yellow-300 hover:border-red-400 hover:shadow-md transition-all text-left"
                >
                  {c.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imageUrl} alt={c.name} className="w-14 h-14 object-contain rounded-lg bg-gray-100" />
                  )}
                  <div>
                    <p className="font-bold text-gray-800">{c.name}</p>
                    {c.firstAirDate && (
                      <p className="text-sm text-gray-500">初登場：{c.firstAirDate}</p>
                    )}
                    {c.description && (
                      <p className="text-sm text-gray-500 line-clamp-1">{c.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* エピソード一覧 */}
        {state === "done" && selectedCharacter && (
          <section>
            <div className="flex items-center gap-4 mb-6 p-4 bg-white rounded-xl shadow-sm border border-yellow-200">
              {selectedCharacter.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedCharacter.imageUrl}
                  alt={selectedCharacter.name}
                  className="w-16 h-16 object-contain rounded-lg bg-gray-100"
                />
              )}
              <div>
                <h2 className="text-2xl font-extrabold text-red-600">{selectedCharacter.name}</h2>
                {selectedCharacter.firstAirDate && (
                  <p className="text-sm text-gray-500">初登場：{selectedCharacter.firstAirDate}</p>
                )}
                <p className="text-sm text-gray-600 mt-1">
                  登場話数：<span className="font-bold text-red-500">{episodes.length}話</span>
                </p>
              </div>
            </div>

            {episodes.length === 0 ? (
              <p className="text-center text-gray-500 py-8">登場話が見つかりませんでした</p>
            ) : (
              <div className="space-y-2">
                {episodes.map((ep, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-yellow-300 transition-colors"
                  >
                    <span className="shrink-0 w-8 h-8 flex items-center justify-center bg-red-100 text-red-600 font-bold text-xs rounded-full">
                      {ep.episodeNumber || i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 leading-snug">{ep.title}</p>
                      {ep.airDate && (
                        <p className="text-xs text-gray-400 mt-0.5">{ep.airDate}</p>
                      )}
                    </div>
                    {ep.slug && (
                      <a
                        href={`https://tgws.plus/anpandb/${ep.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-xs text-blue-500 hover:underline"
                      >
                        詳細
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
