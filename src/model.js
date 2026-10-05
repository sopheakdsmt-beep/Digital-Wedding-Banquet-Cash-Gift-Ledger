import { normalizeSearch } from "./format.js";

const WEDDING_KEYS = [
  "groomKm",
  "brideKm",
  "groomEn",
  "brideEn",
  "date",
  "venueKm",
  "venueEn",
  "bakongAccount",
  "khqrName",
  "khqrCity",
  "khqrMode",
  "qrSource",
];

export function emptyBook() {
  return {
    version: 1,
    wedding: {
      groomKm: "",
      brideKm: "",
      groomEn: "",
      brideEn: "",
      date: "",
      venueKm: "",
      venueEn: "",
      bakongAccount: "",
      khqrName: "",
      khqrCity: "Phnom Penh",
      khqrMode: "static",
      qrSource: "account",
    },
    entries: [],
    prefs: {
      lang: "km",
      rush: false,
      chime: true,
      pinHometown: false,
      pinnedHometown: "",
      side: "groom",
    },
  };
}

export function normalizeEntry(raw) {
  if (!raw || typeof raw !== "object") return null;
  const guestName = String(raw.guestName ?? "").trim().slice(0, 80);
  const amount = Number(raw.amount);
  if (!guestName || !Number.isSafeInteger(amount) || amount <= 0) return null;
  if (raw.currency !== "USD" && raw.currency !== "KHR") return null;
  if (raw.side !== "groom" && raw.side !== "bride") return null;
  const createdAt = Number(raw.createdAt);
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : crypto.randomUUID();
  return {
    id,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    guestName,
    hometown: String(raw.hometown ?? "").trim().slice(0, 80),
    side: raw.side,
    currency: raw.currency,
    amount,
    method: raw.method === "khqr" ? "khqr" : "cash",
    note: String(raw.note ?? "").trim().slice(0, 140),
  };
}

export function entryNumbers(entries) {
  const ordered = [...entries].sort(
    (a, b) => a.createdAt - b.createdAt || String(a.id).localeCompare(String(b.id)),
  );
  return new Map(ordered.map((entry, index) => [entry.id, index + 1]));
}

export function findSameGuest(entries, guestName, hometown, exceptId) {
  const name = normalizeSearch(guestName);
  const home = normalizeSearch(hometown);
  if (!name) return null;
  return (
    entries.find(
      (entry) =>
        entry.id !== exceptId &&
        normalizeSearch(entry.guestName) === name &&
        normalizeSearch(entry.hometown) === home,
    ) || null
  );
}

export function recentHometowns(entries, limit = 6) {
  const seen = [];
  const ordered = [...entries].sort((a, b) => b.createdAt - a.createdAt);
  for (const entry of ordered) {
    const home = entry.hometown?.trim();
    if (!home || seen.includes(home)) continue;
    seen.push(home);
    if (seen.length === limit) break;
  }
  return seen;
}

export function matchesQuery(entry, query) {
  const needle = normalizeSearch(query);
  if (!needle) return true;
  return (
    normalizeSearch(entry.guestName).includes(needle) ||
    normalizeSearch(entry.hometown).includes(needle)
  );
}

function clipString(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

export function sanitizeBook(raw) {
  const book = emptyBook();
  if (!raw || typeof raw !== "object") return { book, image: "" };
  const wedding = raw.wedding && typeof raw.wedding === "object" ? raw.wedding : {};
  for (const key of WEDDING_KEYS) {
    if (typeof wedding[key] === "string") book.wedding[key] = clipString(wedding[key], 80);
  }
  if (book.wedding.khqrMode !== "dynamic") book.wedding.khqrMode = "static";
  if (book.wedding.qrSource !== "image") book.wedding.qrSource = "account";
  if (!book.wedding.khqrCity) book.wedding.khqrCity = "Phnom Penh";

  const prefs = raw.prefs && typeof raw.prefs === "object" ? raw.prefs : {};
  if (prefs.lang === "en") book.prefs.lang = "en";
  book.prefs.rush = Boolean(prefs.rush);
  book.prefs.chime = prefs.chime !== false;
  book.prefs.pinHometown = Boolean(prefs.pinHometown);
  if (typeof prefs.pinnedHometown === "string") {
    book.prefs.pinnedHometown = clipString(prefs.pinnedHometown, 80);
  }
  if (prefs.side === "bride") book.prefs.side = "bride";

  if (Array.isArray(raw.entries)) {
    book.entries = raw.entries.slice(0, 5000).map(normalizeEntry).filter(Boolean);
  }

  let image = "";
  if (typeof raw.khqrImage === "string" && raw.khqrImage.startsWith("data:image/")) {
    image = raw.khqrImage.length < 1_500_000 ? raw.khqrImage : "";
  }
  return { book, image };
}

export function validateKhqrProfile(wedding) {
  const account = String(wedding.bakongAccount || "").trim();
  const name = String(wedding.khqrName || "").trim();
  const city = String(wedding.khqrCity || "").trim();
  const parts = account.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1] || /\s/.test(account) || account.length > 32) {
    return "accountInvalid";
  }
  if (!/^[\x20-\x7E]+$/.test(name) || name.length < 1 || name.length > 25) return "nameLatin";
  if (!/^[\x20-\x7E]+$/.test(city) || city.length < 1 || city.length > 15) return "cityLatin";
  return null;
}
