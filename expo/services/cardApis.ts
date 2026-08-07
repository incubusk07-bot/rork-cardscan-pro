import { APITCG_KEY, POKEMONTCG_API_KEY } from "@/constants/config";
import type { GameId, MatchedCard } from "@/types/card";
import { nameSimilarity } from "@/utils/similarity";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function fetchJson(
  url: string,
  headers?: Record<string, string>,
  timeoutMs: number = 12000,
): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      console.log("[cardApis] http", res.status, url.split("?")[0]);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.log("[cardApis] fetch failed", url.split("?")[0], e);
    return null;
  }
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function pokemonPrice(card: any): number | null {
  const tp = card?.tcgplayer?.prices;
  if (tp) {
    const variants = [
      "holofoil",
      "normal",
      "reverseHolofoil",
      "1stEditionHolofoil",
      "unlimitedHolofoil",
    ];
    for (const v of variants) {
      const market = toNumber(tp[v]?.market) ?? toNumber(tp[v]?.mid);
      if (market !== null) return market;
    }
  }
  return toNumber(card?.cardmarket?.prices?.averageSellPrice);
}

export async function searchPokemon(name: string): Promise<MatchedCard[]> {
  const quoted = `https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(name)}"&pageSize=8`;
  const headers = { "X-Api-Key": POKEMONTCG_API_KEY };
  let json = await fetchJson(quoted, headers);
  if (!json?.data?.length) {
    const first = name.split(" ")[0] ?? name;
    json = await fetchJson(
      `https://api.pokemontcg.io/v2/cards?q=name:${encodeURIComponent(first)}*&pageSize=8`,
      headers,
    );
  }
  const data: any[] = json?.data ?? [];
  return data.map((c) => ({
    id: `pokemon:${String(c.id)}`,
    game: "pokemon" as GameId,
    name: String(c.name ?? "Unknown"),
    setName: c.set?.name ? String(c.set.name) : undefined,
    number: c.number ? `${String(c.number)}/${String(c.set?.printedTotal ?? "")}` : undefined,
    rarity: c.rarity ? String(c.rarity) : undefined,
    imageUrl: c.images?.small ? String(c.images.small) : undefined,
    referenceText: [c.flavorText, (c.attacks ?? []).map((a: any) => a?.text ?? "").join(" ")]
      .filter(Boolean)
      .join(" "),
    marketPrice: pokemonPrice(c),
    priceSource: pokemonPrice(c) !== null ? ("api" as const) : ("community" as const),
  }));
}

export async function searchYugioh(name: string): Promise<MatchedCard[]> {
  const json = await fetchJson(
    `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(name)}&num=8&offset=0`,
  );
  const data: any[] = json?.data ?? [];
  return data.map((c) => {
    const price = toNumber(c.card_prices?.[0]?.tcgplayer_price);
    const set = c.card_sets?.[0];
    return {
      id: `yugioh:${String(c.id)}`,
      game: "yugioh" as GameId,
      name: String(c.name ?? "Unknown"),
      setName: set?.set_name ? String(set.set_name) : undefined,
      number: set?.set_code ? String(set.set_code) : undefined,
      rarity: set?.set_rarity ? String(set.set_rarity) : undefined,
      imageUrl: c.card_images?.[0]?.image_url_small
        ? String(c.card_images[0].image_url_small)
        : undefined,
      referenceText: c.desc ? String(c.desc) : undefined,
      marketPrice: price,
      priceSource: price !== null ? ("api" as const) : ("community" as const),
    };
  });
}

export async function searchMtg(name: string): Promise<MatchedCard[]> {
  const json = await fetchJson(
    `https://api.scryfall.com/cards/search?q=${encodeURIComponent(name)}&unique=cards&order=released`,
  );
  const data: any[] = (json?.data ?? []).slice(0, 8);
  return data.map((c) => {
    const price = toNumber(c.prices?.usd) ?? toNumber(c.prices?.usd_foil);
    const image =
      c.image_uris?.normal ??
      c.image_uris?.small ??
      c.card_faces?.[0]?.image_uris?.normal ??
      c.card_faces?.[0]?.image_uris?.small;
    return {
      id: `mtg:${String(c.id)}`,
      game: "mtg" as GameId,
      name: String(c.name ?? "Unknown"),
      setName: c.set_name ? String(c.set_name) : undefined,
      number: c.collector_number ? String(c.collector_number) : undefined,
      rarity: c.rarity ? String(c.rarity) : undefined,
      imageUrl: image ? String(image) : undefined,
      referenceText: c.oracle_text ? String(c.oracle_text) : undefined,
      marketPrice: price,
      priceSource: price !== null ? ("api" as const) : ("community" as const),
    };
  });
}

export async function searchOnePiece(name: string): Promise<MatchedCard[]> {
  const json = await fetchJson(
    `https://apitcg.com/api/one-piece/cards?property=name&value=${encodeURIComponent(name)}`,
    { "x-api-key": APITCG_KEY },
  );
  const data: any[] = (json?.data ?? []).slice(0, 8);
  return data.map((c) => ({
    id: `onepiece:${String(c.id ?? c.code ?? c.name)}`,
    game: "onepiece" as GameId,
    name: String(c.name ?? "Unknown"),
    setName: c.set?.name ? String(c.set.name) : undefined,
    number: c.code ? String(c.code) : undefined,
    rarity: c.rarity ? String(c.rarity) : undefined,
    imageUrl: c.images?.small ?? c.images?.large ? String(c.images?.small ?? c.images?.large) : undefined,
    referenceText: c.ability ? String(c.ability) : undefined,
    marketPrice: null,
    priceSource: "community" as const,
  }));
}

export async function searchGame(game: GameId, name: string): Promise<MatchedCard[]> {
  if (!name || name.trim().length < 2) return [];
  switch (game) {
    case "pokemon":
      return searchPokemon(name);
    case "yugioh":
      return searchYugioh(name);
    case "mtg":
      return searchMtg(name);
    case "onepiece":
      return searchOnePiece(name);
    case "nba":
      return [];
    default:
      return [];
  }
}

/**
 * Search a hinted game first; if the best hit is weak, fan out to the rest.
 */
export async function searchAllGames(
  name: string,
  gameHint: GameId | null,
): Promise<MatchedCard[]> {
  if (!name || name.trim().length < 2) return [];
  const collected: MatchedCard[] = [];

  if (gameHint && gameHint !== "nba") {
    const hinted = await searchGame(gameHint, name);
    collected.push(...hinted);
    const best = hinted.reduce(
      (max, c) => Math.max(max, nameSimilarity(name, c.name)),
      0,
    );
    if (best >= 0.82) return collected;
  }

  const remaining: GameId[] = (["pokemon", "mtg", "yugioh", "onepiece"] as GameId[]).filter(
    (g) => g !== gameHint,
  );
  const results = await Promise.allSettled(remaining.map((g) => searchGame(g, name)));
  for (const r of results) {
    if (r.status === "fulfilled") collected.push(...r.value);
  }
  return collected;
}

/** Re-fetch a live price for a saved card (portfolio refresh). */
export async function refreshCardPrice(card: MatchedCard): Promise<number | null> {
  try {
    const rawId = card.id.split(":").slice(1).join(":");
    if (card.game === "pokemon") {
      const json = await fetchJson(`https://api.pokemontcg.io/v2/cards/${rawId}`, {
        "X-Api-Key": POKEMONTCG_API_KEY,
      });
      return json?.data ? pokemonPrice(json.data) : null;
    }
    if (card.game === "mtg") {
      const json = await fetchJson(`https://api.scryfall.com/cards/${rawId}`);
      return toNumber(json?.prices?.usd) ?? toNumber(json?.prices?.usd_foil);
    }
    if (card.game === "yugioh") {
      const json = await fetchJson(
        `https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${encodeURIComponent(rawId)}`,
      );
      return toNumber(json?.data?.[0]?.card_prices?.[0]?.tcgplayer_price);
    }
    return null;
  } catch (e) {
    console.log("[cardApis] price refresh failed", e);
    return null;
  }
}
