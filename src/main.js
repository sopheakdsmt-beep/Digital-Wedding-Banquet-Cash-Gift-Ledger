import "./styles.css";
import { playChime } from "./chime.js";
import { publishDisplay, readDisplay, subscribeDisplay } from "./displaySync.js";
import { exportFilename, ledgerText, telegramSummary, workbookXml } from "./exportBook.js";
import { downloadFile, formatAmount } from "./format.js";
import { t } from "./i18n.js";
import { generateIndividualQr } from "./khqr.js";
import {
  emptyBook,
  findSameGuest,
  normalizeEntry,
  sanitizeBook,
  validateKhqrProfile,
} from "./model.js";
import { qrToDataUrl } from "./qrImage.js";
import { exampleBook } from "./sample.js";
import { backupPayload, loadState, saveState } from "./store.js";
import { summarize } from "./totals.js";
import {
  bannerHtml,
  deskHtml,
  editorHtml,
  guestHtml,
  matchCount,
  modalHtml,
  printHtml,
  registerHtml,
  setupHtml,
  shell,
  totalsHtml,
  totalsPillHtml,
} from "./view.js";

const loaded = loadState();
let book = loaded.book;
let image = loaded.image;
const ui = {
  view: "desk",
  query: "",
  mobilePane: "entry",
  guestName: "",
  hometown: "",
  custom: false,
  currency: null,
  amount: null,
  digits: "",
  currencyPad: "USD",
  showcaseCurrency: "USD",
  flashId: null,
  undoStack: [],
  modalOk: null,
  edit: null,
  pending: null,
  displayPayload: null,
  guestOpen: false,
  renewing: false,
};

const tr = (key, vars) => t(book.prefs.lang, key, vars);

function persist() {
  try {
    saveState(book, image);
  } catch {
    toast(tr("imageBad"));
  }
}

function draftState() {
  return {
    mobilePane: ui.mobilePane,
    guestName: ui.guestName,
    hometown: ui.hometown,
    custom: ui.custom,
    currency: ui.currency,
    amount: ui.amount,
    digits: ui.digits,
    currencyPad: ui.currencyPad,
  };
}

function captureDesk() {
  const name = document.getElementById("guestName");
  if (!name) return;
  ui.guestName = name.value;
  ui.hometown = document.getElementById("hometown").value;
}

function selectedMoney() {
  if (ui.custom) {
    const amount = Number(ui.digits || "0");
    if (!Number.isSafeInteger(amount) || amount <= 0) return null;
    return { currency: ui.currencyPad === "KHR" ? "KHR" : "USD", amount };
  }
  if (!ui.currency || !Number.isSafeInteger(ui.amount) || ui.amount <= 0) return null;
  return { currency: ui.currency, amount: ui.amount };
}

function paintChrome() {
  const summary = summarize(book.entries);
  const coupleKm = [book.wedding.groomKm, book.wedding.brideKm].filter(Boolean).join(" · ");
  const coupleEn = [book.wedding.groomEn, book.wedding.brideEn].filter(Boolean).join(" & ");
  const title = document.getElementById("coupleTitle");
  const sub = document.getElementById("coupleSub");
  if (title) title.textContent = coupleKm || coupleEn || tr("coupleMissing");
  if (sub) {
    sub.textContent = [coupleKm && coupleEn ? coupleEn : "", book.wedding.venueKm || book.wedding.venueEn, book.wedding.date]
      .filter(Boolean)
      .join(" · ");
  }
  const pill = document.getElementById("totalsPill");
  if (pill) pill.innerHTML = totalsPillHtml(summary, book.prefs.lang);
  const langButton = document.getElementById("langButton");
  if (langButton) langButton.textContent = book.prefs.lang === "en" ? "ខ្មែរ" : "EN";
  document.documentElement.lang = book.prefs.lang;
  document.querySelectorAll(".nav-btn[data-view]").forEach((button) => {
    button.classList.toggle("is-current", button.dataset.view === ui.view);
  });
  const print = document.getElementById("printBook");
  if (print) print.innerHTML = printHtml(book);
  paintBanner();
}

function paintRegister() {
  const list = document.getElementById("registerList");
  if (list) list.innerHTML = registerHtml(book, ui.query, ui.flashId);
  const totalsRows = document.getElementById("totalsRows");
  if (totalsRows) totalsRows.innerHTML = registerHtml(book, ui.query, null);
  const count = document.getElementById("matchCount");
  if (count) count.textContent = matchCount(book, ui.query, book.prefs.lang);
}

function paintAmountSelection() {
  const money = selectedMoney();
  document.querySelectorAll("[data-action='set-amount']").forEach((button) => {
    const selected =
      !ui.custom &&
      button.dataset.currency === ui.currency &&
      Number(button.dataset.amount) === ui.amount;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  });
  const shortcutWrap = document.getElementById("shortcutWrap");
  const customPad = document.getElementById("customPad");
  if (shortcutWrap) shortcutWrap.hidden = ui.custom;
  if (customPad) customPad.hidden = !ui.custom;
  const readout = document.getElementById("customReadout");
  if (readout) {
    readout.textContent = formatAmount(ui.currencyPad === "KHR" ? "KHR" : "USD", Number(ui.digits || 0));
  }
  document.querySelectorAll("[data-action='pad-currency']").forEach((button) => {
    const selected =
      (button.dataset.currency === "KHR" && ui.currencyPad === "KHR") ||
      (button.dataset.currency === "USD" && ui.currencyPad !== "KHR");
    button.classList.toggle("is-selected", selected);
  });
  const label = money ? formatAmount(money.currency, money.amount) : "";
  const cash = document.getElementById("saveCashAmount");
  const khqr = document.getElementById("saveKhqrAmount");
  if (cash) cash.textContent = label;
  if (khqr) khqr.textContent = label;
}

function paintBanner() {
  const banner = document.getElementById("pendingBanner");
  if (!banner) return;
  const show = ui.pending && !ui.guestOpen;
  banner.hidden = !show;
  if (show) banner.innerHTML = bannerHtml(ui.pending, book.prefs.lang);
}

function renderView() {
  captureDesk();
  const main = document.getElementById("main");
  if (!main) return;
  if (ui.view === "totals") main.innerHTML = totalsHtml(book, ui.query);
  else if (ui.view === "setup") main.innerHTML = setupHtml(book, image);
  else main.innerHTML = deskHtml(book, draftState(), ui.query);
  paintChrome();
  paintRegister();
  paintAmountSelection();
}

function toast(message, withUndo = false) {
  const node = document.getElementById("toast");
  if (!node) return;
  node.hidden = false;
  node.replaceChildren();
  const text = document.createElement("span");
  text.textContent = message;
  node.append(text);
  if (withUndo) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = "undo";
    button.textContent = tr("undo");
    node.append(button);
  }
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    node.hidden = true;
  }, 6000);
}

function pushUndo(item) {
  ui.undoStack.push(item);
  if (ui.undoStack.length > 20) ui.undoStack.shift();
}

function shake(id) {
  const field = document.getElementById(id);
  if (!field) return;
  field.classList.remove("is-invalid");
  void field.offsetWidth;
  field.classList.add("is-invalid");
  field.querySelector("input")?.focus();
}

function readGuestFields() {
  return {
    guestName: document.getElementById("guestName")?.value ?? ui.guestName,
    hometown: document.getElementById("hometown")?.value ?? ui.hometown,
  };
}

let saving = false;

function commit(method, snapshot) {
  if (saving) return null;
  const fields = snapshot || { ...readGuestFields(), ...selectedMoney(), side: book.prefs.side };
  const entry = normalizeEntry({
    guestName: fields.guestName,
    hometown: fields.hometown,
    side: fields.side || book.prefs.side,
    currency: fields.currency,
    amount: fields.amount,
    method,
    createdAt: Date.now(),
  });
  if (!entry) {
    if (!String(fields.guestName || "").trim()) shake("nameField");
    else shake("amountArea");
    toast(!String(fields.guestName || "").trim() ? tr("needName") : tr("needAmount"));
    return null;
  }
  const duplicate = findSameGuest(book.entries, entry.guestName, entry.hometown);
  book.entries.push(entry);
  pushUndo({ type: "add", entry });
  saving = true;
  setTimeout(() => {
    saving = false;
  }, 400);
  ui.flashId = entry.id;
  clearTimeout(commit.flashTimer);
  commit.flashTimer = setTimeout(() => {
    if (ui.flashId === entry.id) ui.flashId = null;
    paintRegister();
  }, 1400);
  if (book.prefs.pinHometown) {
    book.prefs.pinnedHometown = entry.hometown;
    ui.hometown = entry.hometown;
  } else ui.hometown = "";
  ui.guestName = "";
  ui.custom = false;
  ui.currency = null;
  ui.amount = null;
  ui.digits = "";
  const nameInput = document.getElementById("guestName");
  const homeInput = document.getElementById("hometown");
  if (nameInput) nameInput.value = "";
  if (homeInput) homeInput.value = ui.hometown;
  persist();
  paintChrome();
  paintRegister();
  paintAmountSelection();
  if (book.prefs.chime) playChime();
  navigator.vibrate?.(12);
  toast(duplicate ? tr("duplicate") : tr("saved", { name: entry.guestName, amount: formatAmount(entry.currency, entry.amount) }), true);
  nameInput?.focus();
  return entry;
}

function saveCash() {
  captureDesk();
  const money = selectedMoney();
  if (!readGuestFields().guestName.trim()) {
    shake("nameField");
    toast(tr("needName"));
    return;
  }
  if (!money) {
    shake("amountArea");
    toast(tr("needAmount"));
    return;
  }
  commit("cash");
}

async function buildPayload({ dynamic, currency, amount, billNumber, pendingName }) {
  const wedding = book.wedding;
  const coupleKm = [wedding.groomKm, wedding.brideKm].filter(Boolean).join(" · ");
  const coupleEn = [wedding.groomEn, wedding.brideEn].filter(Boolean).join(" & ");
  const base = {
    lang: book.prefs.lang,
    coupleKm,
    coupleEn,
    venue: wedding.venueKm || wedding.venueEn,
    merchantName: wedding.khqrName,
    pendingName: pendingName || "",
    expiresAt: null,
    amount: amount || null,
    currency: currency || null,
    qrDataUrl: "",
    imageDataUrl: "",
  };
  if (wedding.qrSource === "image") {
    if (!image) return { ...base, mode: "error", error: tr("needAccount") };
    return { ...base, mode: "image", imageDataUrl: image, helpKey: "imageHelp" };
  }
  if (!wedding.bakongAccount.trim()) return { ...base, mode: "error", error: tr("needAccount") };
  const problem = validateKhqrProfile(wedding);
  if (problem) return { ...base, mode: "error", error: tr(problem) };
  try {
    const generated = generateIndividualQr({
      bakongAccount: wedding.bakongAccount,
      merchantName: wedding.khqrName,
      merchantCity: wedding.khqrCity,
      currency,
      amount,
      billNumber,
      dynamic,
    });
    return {
      ...base,
      mode: dynamic ? "dynamic" : "static",
      qrDataUrl: await qrToDataUrl(generated.qr),
      helpKey: dynamic ? "dynamicHelp" : "staticHelp",
      expiresAt: generated.expiresAt,
    };
  } catch (error) {
    return { ...base, mode: "error", error: error.message || tr("khqrFailed") };
  }
}

function showGuest(payload) {
  ui.displayPayload = payload;
  ui.guestOpen = true;
  const layer = document.getElementById("guestLayer");
  if (!layer) return;
  layer.hidden = false;
  layer.innerHTML = guestHtml(payload);
  document.body.classList.add("guest-open");
  publishDisplay(payload);
  paintBanner();
}

function closeGuest() {
  ui.guestOpen = false;
  const layer = document.getElementById("guestLayer");
  if (layer) {
    layer.hidden = true;
    layer.innerHTML = "";
  }
  document.body.classList.remove("guest-open");
  paintBanner();
}

async function publishShowcase(currency = ui.showcaseCurrency) {
  ui.showcaseCurrency = currency === "KHR" ? "KHR" : "USD";
  const payload = await buildPayload({ dynamic: false, currency: ui.showcaseCurrency });
  ui.displayPayload = payload;
  publishDisplay(payload);
  return payload;
}

async function openShowcase(currency = ui.showcaseCurrency) {
  showGuest(await publishShowcase(currency));
}

async function startKhqr() {
  captureDesk();
  const fields = readGuestFields();
  const money = selectedMoney();
  if (!fields.guestName.trim()) {
    shake("nameField");
    toast(tr("needName"));
    return;
  }
  if (!money) {
    shake("amountArea");
    toast(tr("needAmount"));
    return;
  }
  const billNumber = `G${String(book.entries.length + 1).padStart(4, "0")}`;
  ui.pending = {
    guestName: fields.guestName.trim(),
    hometown: fields.hometown.trim(),
    side: book.prefs.side,
    currency: money.currency,
    amount: money.amount,
    billNumber,
  };
  const payload = await buildPayload({
    dynamic: book.wedding.qrSource !== "image",
    currency: money.currency,
    amount: money.amount,
    billNumber,
    pendingName: ui.pending.guestName,
  });
  showGuest(payload);
}

async function renewDynamic() {
  if (!ui.pending || ui.renewing || book.wedding.qrSource === "image") return;
  ui.renewing = true;
  const payload = await buildPayload({
    dynamic: true,
    currency: ui.pending.currency,
    amount: ui.pending.amount,
    billNumber: ui.pending.billNumber,
    pendingName: ui.pending.guestName,
  });
  ui.renewing = false;
  if (ui.guestOpen) showGuest(payload);
  else {
    ui.displayPayload = payload;
    publishDisplay(payload);
  }
}

function confirmPaid() {
  if (!ui.pending) return;
  const snapshot = { ...ui.pending };
  const reopen = ui.guestOpen;
  ui.pending = null;
  closeGuest();
  commit("khqr", snapshot);
  if (reopen) openShowcase(snapshot.currency);
  else publishShowcase(snapshot.currency);
}

function cancelPending() {
  const reopen = ui.guestOpen;
  ui.pending = null;
  closeGuest();
  if (reopen) openShowcase();
  else publishShowcase();
}

function openEditor(id) {
  const entry = book.entries.find((item) => item.id === id);
  if (!entry) return;
  ui.edit = { id: entry.id, side: entry.side, currency: entry.currency, method: entry.method, amount: entry.amount };
  const editor = document.getElementById("editor");
  editor.hidden = false;
  editor.innerHTML = editorHtml({ ...entry, ...ui.edit }, book.prefs.lang);
}

function paintEditor() {
  document.querySelectorAll("[data-action='edit-side']").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.side === ui.edit.side);
  });
  document.querySelectorAll("[data-action='edit-currency']").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.currency === ui.edit.currency);
  });
  document.querySelectorAll("[data-action='edit-method']").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.method === ui.edit.method);
  });
  document.querySelectorAll("[data-action='edit-amount']").forEach((button) => {
    const selected = button.dataset.currency === ui.edit.currency && Number(button.dataset.amount) === ui.edit.amount;
    button.classList.toggle("is-selected", selected);
  });
}

function closeEditor() {
  ui.edit = null;
  const editor = document.getElementById("editor");
  if (editor) {
    editor.hidden = true;
    editor.innerHTML = "";
  }
}

function saveEdit() {
  if (!ui.edit) return;
  const current = book.entries.find((entry) => entry.id === ui.edit.id);
  if (!current) return closeEditor();
  const amount = Number(String(document.getElementById("editAmount").value).replace(/[^\d]/g, ""));
  const next = normalizeEntry({
    ...current,
    guestName: document.getElementById("editName").value,
    hometown: document.getElementById("editHome").value,
    note: document.getElementById("editNote").value,
    side: ui.edit.side,
    currency: ui.edit.currency,
    method: ui.edit.method,
    amount,
  });
  if (!next) {
    toast(tr("needName"));
    return;
  }
  next.id = current.id;
  next.createdAt = current.createdAt;
  pushUndo({ type: "replace", before: current, after: next });
  book.entries = book.entries.map((entry) => (entry.id === current.id ? next : entry));
  persist();
  closeEditor();
  paintChrome();
  paintRegister();
  if (ui.view === "totals") renderView();
  toast(tr("updated", { name: next.guestName }), true);
}

function openModal({ title, body, ok, onOk }) {
  ui.modalOk = onOk;
  const modal = document.getElementById("modal");
  modal.hidden = false;
  modal.innerHTML = modalHtml({ title, body, ok, cancel: tr("cancel") });
}

function closeModal() {
  ui.modalOk = null;
  const modal = document.getElementById("modal");
  if (modal) {
    modal.hidden = true;
    modal.innerHTML = "";
  }
}

function undo() {
  const item = ui.undoStack.pop();
  if (!item) return;
  if (item.type === "add") book.entries = book.entries.filter((entry) => entry.id !== item.entry.id);
  if (item.type === "delete") book.entries.push(item.entry);
  if (item.type === "replace") {
    book.entries = book.entries.map((entry) => (entry.id === item.before.id ? item.before : entry));
  }
  persist();
  paintChrome();
  paintRegister();
  if (ui.view === "totals") renderView();
  toast(tr("undo"));
}

function applyBook(next, nextImage = image, message) {
  book = next;
  image = nextImage;
  ui.pending = null;
  ui.query = "";
  ui.view = "desk";
  persist();
  closeGuest();
  publishDisplay({
    lang: book.prefs.lang,
    coupleKm: [book.wedding.groomKm, book.wedding.brideKm].filter(Boolean).join(" · "),
    coupleEn: [book.wedding.groomEn, book.wedding.brideEn].filter(Boolean).join(" & "),
    helpKey: "idleKhqr",
  });
  renderView();
  toast(message);
}

function saveSetup() {
  const read = (id) => document.getElementById(id)?.value ?? "";
  const mode = document.querySelector("input[name='khqrMode']:checked")?.value;
  const source = document.querySelector("input[name='qrSource']:checked")?.value;
  book.wedding = {
    ...book.wedding,
    groomKm: read("groomKm").trim(),
    brideKm: read("brideKm").trim(),
    groomEn: read("groomEn").trim(),
    brideEn: read("brideEn").trim(),
    date: read("weddingDate").trim(),
    venueKm: read("venueKm").trim(),
    venueEn: read("venueEn").trim(),
    bakongAccount: read("bakongAccount").trim(),
    khqrName: read("khqrName").trim(),
    khqrCity: read("khqrCity").trim() || "Phnom Penh",
    khqrMode: mode === "dynamic" ? "dynamic" : "static",
    qrSource: source === "image" ? "image" : "account",
  };
  book.prefs.chime = Boolean(document.getElementById("chimeInput")?.checked);
  if (book.wedding.qrSource === "account" && book.wedding.bakongAccount) {
    const problem = validateKhqrProfile(book.wedding);
    if (problem) {
      toast(tr(problem));
      return;
    }
  }
  persist();
  paintChrome();
  toast(tr("savedSetup"));
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 800 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    img.src = url;
  });
}

async function shareTelegram() {
  const text = ledgerText(book);
  const file = new File([text], "cash-gifts.txt", { type: "text/plain" });
  const summary = telegramSummary(text);
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: tr("printTitle"), text: summary });
      toast(tr("shared"));
      return;
    }
  } catch (error) {
    if (error?.name === "AbortError") return;
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    downloadFile("cash-gifts.txt", text, "text/plain");
  }
  window.open(`https://t.me/share/url?text=${encodeURIComponent(summary)}`, "_blank", "noopener");
  toast(tr("copied"));
}

function pressDigit(key) {
  const max = ui.currencyPad === "KHR" ? 9 : 6;
  if (key === "back") ui.digits = ui.digits.slice(0, -1);
  else if ((ui.digits + key).replace(/^0+/, "").length <= max) ui.digits += key;
  ui.digits = ui.digits.replace(/^0+/, "");
  paintAmountSelection();
}

const handlers = {
  nav(button) {
    closeGuest();
    ui.view = button.dataset.view || "desk";
    renderView();
  },
  "toggle-lang"() {
    captureDesk();
    book.prefs.lang = book.prefs.lang === "en" ? "km" : "en";
    persist();
    renderView();
  },
  "open-showcase"() {
    openShowcase();
  },
  pane(button) {
    captureDesk();
    ui.mobilePane = button.dataset.pane === "book" ? "book" : "entry";
    document.getElementById("paneEntry")?.classList.toggle("is-on", ui.mobilePane !== "book");
    document.getElementById("paneBook")?.classList.toggle("is-on", ui.mobilePane === "book");
    document.querySelectorAll("[data-action='pane']").forEach((tab) => {
      tab.classList.toggle("is-selected", tab.dataset.pane === ui.mobilePane);
    });
  },
  side(button) {
    book.prefs.side = button.dataset.side === "bride" ? "bride" : "groom";
    persist();
    document.querySelectorAll("[data-action='side']").forEach((item) => {
      const selected = item.dataset.side === book.prefs.side;
      item.classList.toggle("is-selected", selected);
      item.setAttribute("aria-pressed", selected ? "true" : "false");
    });
  },
  pin() {
    captureDesk();
    book.prefs.pinHometown = !book.prefs.pinHometown;
    if (book.prefs.pinHometown) book.prefs.pinnedHometown = ui.hometown;
    persist();
    renderView();
  },
  chip(button) {
    const input = document.getElementById("hometown");
    if (input) input.value = button.dataset.hometown || "";
    ui.hometown = input?.value || "";
    input?.focus();
  },
  "set-amount"(button) {
    ui.custom = false;
    ui.currency = button.dataset.currency === "KHR" ? "KHR" : "USD";
    ui.amount = Number(button.dataset.amount);
    ui.digits = "";
    paintAmountSelection();
    captureDesk();
    if (book.prefs.rush && readGuestFields().guestName.trim()) saveCash();
  },
  "open-custom"() {
    ui.custom = true;
    if (!ui.digits && ui.amount) ui.digits = String(ui.amount);
    ui.currencyPad = ui.currency === "KHR" ? "KHR" : "USD";
    paintAmountSelection();
  },
  "close-custom"() {
    ui.custom = false;
    paintAmountSelection();
  },
  digit(button) {
    pressDigit(button.dataset.key || "");
  },
  "pad-currency"(button) {
    ui.currencyPad = button.dataset.currency === "KHR" ? "KHR" : "USD";
    const max = ui.currencyPad === "KHR" ? 9 : 6;
    ui.digits = ui.digits.slice(0, max);
    paintAmountSelection();
  },
  "save-cash": saveCash,
  "start-khqr": startKhqr,
  "confirm-paid": confirmPaid,
  "cancel-pending": cancelPending,
  "close-guest": closeGuest,
  "reopen-guest"() {
    if (ui.displayPayload) showGuest(ui.displayPayload);
  },
  "toggle-hatch"() {
    const panel = document.getElementById("hatchPanel");
    if (panel) panel.hidden = !panel.hidden;
  },
  "second-screen"() {
    if (ui.displayPayload) publishDisplay(ui.displayPayload);
    window.open(`${location.pathname}#display`, "jomnongdai-display");
  },
  "showcase-currency"(button) {
    openShowcase(button.dataset.currency);
  },
  "close-standalone"() {
    window.close();
  },
  edit(button) {
    openEditor(button.dataset.id);
  },
  "edit-side"(button) {
    if (!ui.edit) return;
    ui.edit.side = button.dataset.side === "bride" ? "bride" : "groom";
    paintEditor();
  },
  "edit-currency"(button) {
    if (!ui.edit) return;
    ui.edit.currency = button.dataset.currency === "KHR" ? "KHR" : "USD";
    paintEditor();
  },
  "edit-method"(button) {
    if (!ui.edit) return;
    ui.edit.method = button.dataset.method === "khqr" ? "khqr" : "cash";
    paintEditor();
  },
  "edit-amount"(button) {
    if (!ui.edit) return;
    ui.edit.currency = button.dataset.currency === "KHR" ? "KHR" : "USD";
    ui.edit.amount = Number(button.dataset.amount);
    const input = document.getElementById("editAmount");
    if (input) input.value = String(ui.edit.amount);
    paintEditor();
  },
  "save-edit": saveEdit,
  "close-editor": closeEditor,
  "ask-delete"() {
    if (!ui.edit) return;
    const entry = book.entries.find((item) => item.id === ui.edit.id);
    openModal({
      title: tr("deleteGift"),
      body: tr("confirmDelete", { name: entry?.guestName || "" }),
      ok: tr("yesDelete"),
      onOk() {
        if (!entry) return;
        book.entries = book.entries.filter((item) => item.id !== entry.id);
        pushUndo({ type: "delete", entry });
        persist();
        closeEditor();
        paintChrome();
        paintRegister();
        toast(tr("deleted", { name: entry.guestName }), true);
      },
    });
  },
  undo,
  "export-excel"() {
    downloadFile(exportFilename(book), workbookXml(book), "application/vnd.ms-excel");
  },
  "share-telegram": shareTelegram,
  "print-book"() {
    paintChrome();
    window.print();
  },
  "save-setup": saveSetup,
  "remove-image"() {
    image = "";
    persist();
    renderView();
    toast(tr("removeImage"));
  },
  "export-json"() {
    const who = ([book.wedding.groomEn, book.wedding.brideEn].filter(Boolean).join("-") || "book").replace(/[^\w.-]+/g, "");
    downloadFile(`cash-gifts-${who || "book"}.json`, backupPayload(book, image), "application/json");
  },
  "ask-clear"() {
    openModal({
      title: tr("clearBook"),
      body: tr("confirmClear"),
      ok: tr("yesClear"),
      onOk() {
        const fresh = emptyBook();
        fresh.prefs.lang = book.prefs.lang;
        applyBook(fresh, "", tr("cleared"));
      },
    });
  },
  "ask-sample"() {
    if (!book.entries.length && !book.wedding.groomKm && !book.wedding.brideKm) {
      const sample = exampleBook();
      sample.prefs.lang = book.prefs.lang;
      applyBook(sample, "", tr("sampleLoaded"));
      return;
    }
    openModal({
      title: tr("loadSample"),
      body: tr("confirmSample"),
      ok: tr("yesReplace"),
      onOk() {
        const sample = exampleBook();
        sample.prefs.lang = book.prefs.lang;
        applyBook(sample, "", tr("sampleLoaded"));
      },
    });
  },
  "modal-cancel": closeModal,
  "modal-ok"() {
    const action = ui.modalOk;
    closeModal();
    action?.();
  },
};

function onClick(event) {
  if (event.target.id === "modal") {
    closeModal();
    return;
  }
  if (event.target.id === "editor") {
    closeEditor();
    return;
  }
  const button = event.target.closest("[data-action]");
  if (!button) return;
  handlers[button.dataset.action]?.(button, event);
}

function onInput(event) {
  if (event.target.id === "search" || event.target.id === "totalsSearch") {
    ui.query = event.target.value;
    paintRegister();
    return;
  }
  if (event.target.id === "editAmount" && ui.edit) {
    ui.edit.amount = Number(String(event.target.value).replace(/[^\d]/g, "")) || 0;
    paintEditor();
  }
}

function onChange(event) {
  if (event.target.id === "rushToggle") {
    book.prefs.rush = event.target.checked;
    persist();
  }
  if (event.target.id === "khqrFile" && event.target.files?.[0]) {
    compressImage(event.target.files[0])
      .then((dataUrl) => {
        image = dataUrl;
        book.wedding.qrSource = "image";
        persist();
        renderView();
        toast(tr("imageReady"));
      })
      .catch(() => toast(tr("imageBad")));
  }
  if (event.target.id === "importFile" && event.target.files?.[0]) {
    event.target.files[0].text().then((text) => {
      try {
        const sanitized = sanitizeBook(JSON.parse(text));
        if (!sanitized.book.entries.length && !sanitized.book.wedding.groomKm && !sanitized.book.wedding.brideKm) {
          toast(tr("invalidBook"));
          return;
        }
        applyBook(sanitized.book, sanitized.image || "", tr("imported"));
      } catch {
        toast(tr("invalidBook"));
      }
    });
  }
}

function onKeydown(event) {
  if (event.key === "Enter" && event.target.id === "guestName") {
    event.preventDefault();
    document.getElementById("hometown")?.focus();
  } else if (event.key === "Enter" && event.target.id === "hometown") {
    event.preventDefault();
    saveCash();
  } else if (event.key === "Escape") {
    closeModal();
    closeEditor();
  }
}

function mountDesk() {
  const app = document.getElementById("app");
  app.innerHTML = shell();
  document.body.addEventListener("click", onClick);
  document.body.addEventListener("input", onInput);
  document.body.addEventListener("change", onChange);
  document.body.addEventListener("keydown", onKeydown);
  renderView();
  setInterval(() => {
    tickClocks();
    const expires = ui.displayPayload?.expiresAt;
    if (!expires || ui.displayPayload?.mode !== "dynamic") return;
    if (Date.now() > expires - 800) renewDynamic();
  }, 1000);
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

function tickClocks() {
  document.querySelectorAll("[data-expires]").forEach((node) => {
    const left = Number(node.dataset.expires) - Date.now();
    const lang = document.documentElement.lang === "en" ? "en" : "km";
    if (left <= 0) node.textContent = t(lang, "expired");
    else {
      const minutes = Math.floor(left / 60000);
      const seconds = Math.floor((left % 60000) / 1000);
      node.textContent = t(lang, "expires", { time: `${minutes}:${String(seconds).padStart(2, "0")}` });
    }
  });
}

function mountStandalone() {
  document.body.classList.add("is-standalone");
  const app = document.getElementById("app");
  const paint = (payload) => {
    const lang = payload?.lang === "en" ? "en" : "km";
    document.documentElement.lang = lang;
    app.innerHTML = guestHtml({ ...(payload || {}), lang, standalone: true, helpKey: payload?.helpKey || "idleKhqr" });
  };
  paint(readDisplay());
  subscribeDisplay(paint);
  setInterval(tickClocks, 1000);
  document.body.addEventListener("click", (event) => {
    if (event.target.closest("[data-action='close-standalone']")) window.close();
  });
}

if (location.hash === "#display") mountStandalone();
else mountDesk();
