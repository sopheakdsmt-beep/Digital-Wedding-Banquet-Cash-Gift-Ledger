import { emptyBook, sanitizeBook } from "./model.js";

const BOOK_KEY = "jomnongdai.book.v1";
const IMAGE_KEY = "jomnongdai.khqrImage.v1";

export function loadState() {
  try {
    const raw = localStorage.getItem(BOOK_KEY);
    const image = localStorage.getItem(IMAGE_KEY) || "";
    if (!raw) return { book: emptyBook(), image };
    const parsed = sanitizeBook(JSON.parse(raw));
    return { book: parsed.book, image: parsed.image || image };
  } catch {
    return { book: emptyBook(), image: "" };
  }
}

export function saveState(book, image) {
  localStorage.setItem(BOOK_KEY, JSON.stringify(book));
  if (image) localStorage.setItem(IMAGE_KEY, image);
  else localStorage.removeItem(IMAGE_KEY);
}

export function backupPayload(book, image) {
  return JSON.stringify(image ? { ...book, khqrImage: image } : book, null, 2);
}
