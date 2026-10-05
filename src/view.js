import { USD_SHORTCUTS, KHR_SHORTCUTS } from "./amounts.js";
import { escapeHtml, formatAmount, formatClock, formatWhen } from "./format.js";
import { methodLabel, sideLabel, t } from "./i18n.js";
import { entryNumbers, matchesQuery, recentHometowns } from "./model.js";
import { summarize } from "./totals.js";

function amountButton(currency, amount, selected, action) {
  const label = formatAmount(currency, amount);
  return `<button type="button" class="amount-btn ${currency === "USD" ? "usd" : "khr"}${selected ? " is-selected" : ""}${label.length > 9 ? " is-long" : ""}" data-action="${action}" data-currency="${currency}" data-amount="${amount}" aria-pressed="${selected ? "true" : "false"}">${label}</button>`;
}

function shortcutGrid(action, draft) {
  const usd = USD_SHORTCUTS.map((amount) =>
    amountButton("USD", amount, !draft.custom && draft.currency === "USD" && draft.amount === amount, action),
  ).join("");
  const khr = KHR_SHORTCUTS.map((amount) =>
    amountButton("KHR", amount, !draft.custom && draft.currency === "KHR" && draft.amount === amount, action),
  ).join("");
  return `<div class="amount-block" id="shortcutBlock">
    <div class="currencies">
      <div>
        <p class="amount-label">USD <span>${t(draft.lang, "usd")}</span></p>
        <div class="amount-grid">${usd}</div>
      </div>
      <div>
        <p class="amount-label">KHR <span>${t(draft.lang, "khr")}</span></p>
        <div class="amount-grid">${khr}</div>
      </div>
    </div>
  </div>`;
}

function pad(lang, draft) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "back"];
  return `<div id="customPad" class="custom-pad" ${draft.custom ? "" : "hidden"}>
    <div class="pad-top">
      <button type="button" class="text-btn" data-action="close-custom">${escapeHtml(t(lang, "backAmounts"))}</button>
      <strong id="customReadout">${formatAmount(draft.currencyPad || "USD", Number(draft.digits || 0))}</strong>
    </div>
    <div class="pad-currency">
      <button type="button" class="amount-btn usd${draft.currencyPad !== "KHR" ? " is-selected" : ""}" data-action="pad-currency" data-currency="USD">USD</button>
      <button type="button" class="amount-btn khr${draft.currencyPad === "KHR" ? " is-selected" : ""}" data-action="pad-currency" data-currency="KHR">KHR</button>
    </div>
    <div class="pad-grid">
      ${keys
        .map((key) => {
          const label = key === "back" ? "⌫" : key;
          return `<button type="button" class="pad-key" data-action="digit" data-key="${key}">${label}</button>`;
        })
        .join("")}
    </div>
  </div>`;
}

export function shell() {
  return `<div class="app">
    <header class="topbar">
      <button type="button" class="brand" data-action="nav" data-view="setup">
        <p class="brand-kicker">សៀវភៅកត់ចំណងដៃ</p>
        <h1 id="coupleTitle"></h1>
        <p id="coupleSub"></p>
      </button>
      <button type="button" class="totals-pill" data-action="nav" data-view="totals" id="totalsPill"></button>
    </header>
    <nav class="nav">
      <button type="button" class="nav-btn" data-action="nav" data-view="desk"><span>កត់ចំណងដៃ</span><small>Desk</small></button>
      <button type="button" class="nav-btn" data-action="nav" data-view="totals"><span>ផ្ទៀងផ្ទាត់</span><small>Totals</small></button>
      <button type="button" class="nav-btn" data-action="open-showcase"><span>KHQR</span><small>Guest screen</small></button>
      <button type="button" class="nav-btn" data-action="nav" data-view="setup"><span>ការកំណត់</span><small>Setup</small></button>
      <button type="button" class="nav-btn lang-btn" data-action="toggle-lang" id="langButton">EN</button>
    </nav>
    <main id="main"></main>
    <div id="pendingBanner" class="pending-banner" hidden></div>
    <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
    <div id="modal" class="modal" hidden></div>
    <div id="editor" class="editor" hidden></div>
    <div id="guestLayer" class="guest-layer" hidden></div>
    <section id="printBook" class="print-book"></section>
  </div>`;
}

export function deskHtml(book, draft, query) {
  const lang = book.prefs.lang;
  const names = recentHometowns(book.entries);
  const pinned = book.prefs.pinHometown ? book.prefs.pinnedHometown : "";
  const chips = [pinned, ...names.filter((name) => name !== pinned)].filter(Boolean).slice(0, 6);
  return `<section class="desk">
    <div class="pane-switch">
      <button type="button" class="pane-tab${draft.mobilePane !== "book" ? " is-selected" : ""}" data-action="pane" data-pane="entry">${escapeHtml(t(lang, "paneEntry"))}</button>
      <button type="button" class="pane-tab${draft.mobilePane === "book" ? " is-selected" : ""}" data-action="pane" data-pane="book">${escapeHtml(t(lang, "paneBook"))}</button>
    </div>
    <section class="pane pane-entry${draft.mobilePane !== "book" ? " is-on" : ""}" id="paneEntry">
      <div class="side-switch" role="group" aria-label="${escapeHtml(t(lang, "side"))}">
        <button type="button" class="side-btn groom${book.prefs.side !== "bride" ? " is-selected" : ""}" data-action="side" data-side="groom" aria-pressed="${book.prefs.side !== "bride"}">${escapeHtml(t(lang, "groom"))}</button>
        <button type="button" class="side-btn bride${book.prefs.side === "bride" ? " is-selected" : ""}" data-action="side" data-side="bride" aria-pressed="${book.prefs.side === "bride"}">${escapeHtml(t(lang, "bride"))}</button>
      </div>
      <div class="field" id="nameField">
        <label for="guestName">${escapeHtml(t(lang, "guestName"))}</label>
        <input id="guestName" value="${escapeHtml(draft.guestName || "")}" placeholder="${escapeHtml(t(lang, "guestName"))}" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="next" />
      </div>
      <div class="field" id="homeField">
        <div class="field-head">
          <label for="hometown">${escapeHtml(t(lang, "hometown"))}</label>
          <button type="button" class="pin-btn${book.prefs.pinHometown ? " is-on" : ""}" data-action="pin" aria-pressed="${book.prefs.pinHometown}">${escapeHtml(book.prefs.pinHometown ? t(lang, "pinned") : t(lang, "pin"))}</button>
        </div>
        <input id="hometown" value="${escapeHtml(draft.hometown || "")}" placeholder="${escapeHtml(t(lang, "hometown"))}" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="done" />
      </div>
      <div class="chips" id="chips">${chips.map((chip) => `<button type="button" class="chip" data-action="chip" data-hometown="${escapeHtml(chip)}">${escapeHtml(chip)}</button>`).join("")}</div>
      <div id="amountArea">
        <div id="shortcutWrap" ${draft.custom ? "hidden" : ""}>
          ${shortcutGrid("set-amount", { ...draft, lang })}
          <button type="button" class="other-btn${draft.custom ? " is-selected" : ""}" data-action="open-custom">${escapeHtml(t(lang, "other"))}</button>
        </div>
        ${pad(lang, draft)}
      </div>
      <label class="rush"><input type="checkbox" id="rushToggle"${book.prefs.rush ? " checked" : ""} /> <span>${escapeHtml(t(lang, "rush"))}</span></label>
      <div class="save-row">
        <button type="button" class="save-cash" data-action="save-cash" id="saveCash">
          <span class="btn-title">${escapeHtml(t(lang, "recordCash"))}</span>
          <span class="btn-en">Record cash</span>
          <span class="btn-amount" id="saveCashAmount"></span>
        </button>
        <button type="button" class="save-khqr" data-action="start-khqr" id="saveKhqr">
          <span class="btn-title">${escapeHtml(t(lang, "collectKhqr"))}</span>
          <span class="btn-en">KHQR</span>
          <span class="btn-amount" id="saveKhqrAmount"></span>
        </button>
      </div>
    </section>
    <section class="pane pane-book${draft.mobilePane === "book" ? " is-on" : ""}" id="paneBook">
      <div class="book-toolbar">
        <input id="search" value="${escapeHtml(query)}" placeholder="${escapeHtml(t(lang, "search"))}" autocomplete="off" enterkeyhint="search" />
        <span id="matchCount"></span>
      </div>
      <div id="registerList" class="register-list"></div>
    </section>
  </section>`;
}

export function registerHtml(book, query, flashId) {
  const lang = book.prefs.lang;
  const numbers = entryNumbers(book.entries);
  const rows = [...book.entries]
    .filter((entry) => matchesQuery(entry, query))
    .sort((a, b) => b.createdAt - a.createdAt);
  if (!book.entries.length) {
    return `<div class="empty"><p>${escapeHtml(t(lang, "emptyTitle"))}</p><span>${escapeHtml(t(lang, "emptyBody"))}</span><button type="button" class="other-btn" data-action="ask-sample">${escapeHtml(t(lang, "loadSample"))}</button></div>`;
  }
  if (!rows.length) return `<div class="empty"><p>${escapeHtml(t(lang, "noMatches"))}</p></div>`;
  return rows
    .map((entry) => {
      const home = entry.hometown || t(lang, "noHometown");
      return `<button type="button" class="gift-row${entry.id === flashId ? " is-new" : ""}" data-action="edit" data-id="${escapeHtml(entry.id)}">
        <span class="gift-no">${numbers.get(entry.id)}</span>
        <span class="gift-copy">
          <strong>${escapeHtml(entry.guestName)}</strong>
          <em>${escapeHtml(home)} · ${escapeHtml(sideLabel(lang, entry.side))} · ${escapeHtml(formatClock(entry.createdAt))} · ${escapeHtml(methodLabel(lang, entry.method))}</em>
        </span>
        <span class="gift-amount ${entry.currency === "USD" ? "usd" : "khr"}">${formatAmount(entry.currency, entry.amount)}</span>
      </button>`;
    })
    .join("");
}

function bucketLine(lang, label, bucket) {
  return `<div class="bucket"><span>${escapeHtml(label)}</span><strong>${formatAmount("USD", bucket.usd)}</strong><strong>${formatAmount("KHR", bucket.khr)}</strong><em>${bucket.count}</em></div>`;
}

export function totalsHtml(book, query) {
  const lang = book.prefs.lang;
  const summary = summarize(book.entries);
  return `<section class="totals-page">
    <div class="export-bar">
      <button type="button" class="save-cash" data-action="export-excel">${escapeHtml(t(lang, "exportExcel"))}</button>
      <button type="button" class="save-khqr" data-action="share-telegram">${escapeHtml(t(lang, "shareTelegram"))}</button>
      <button type="button" class="other-btn" data-action="print-book">${escapeHtml(t(lang, "printBook"))}</button>
    </div>
    <p class="hint">${escapeHtml(t(lang, "exportHint"))}</p>
    <div class="stat-grid">
      <article class="stat-card"><span>${escapeHtml(t(lang, "totalUsd"))}</span><strong>${formatAmount("USD", summary.usd)}</strong></article>
      <article class="stat-card"><span>${escapeHtml(t(lang, "totalKhr"))}</span><strong>${formatAmount("KHR", summary.khr)}</strong></article>
      <article class="stat-card"><span>${escapeHtml(t(lang, "count"))}</span><strong>${summary.count}</strong></article>
    </div>
    <div class="split-grid">
      <section class="panel"><h2>${escapeHtml(t(lang, "bySide"))}</h2>${bucketLine(lang, t(lang, "groom"), summary.bySide.groom)}${bucketLine(lang, t(lang, "bride"), summary.bySide.bride)}</section>
      <section class="panel"><h2>${escapeHtml(t(lang, "byMethod"))}</h2>${bucketLine(lang, t(lang, "cash"), summary.byMethod.cash)}${bucketLine(lang, t(lang, "khqr"), summary.byMethod.khqr)}</section>
    </div>
    <section class="panel">
      <h2>${escapeHtml(t(lang, "denominations"))}</h2>
      ${denomTable(summary)}
    </section>
    <section class="panel">
      <h2>${escapeHtml(t(lang, "hometowns"))}</h2>
      ${summary.hometowns
        .map(
          (home) =>
            `<div class="bucket"><span>${escapeHtml(home.name || t(lang, "noHometown"))}</span><strong>${formatAmount("USD", home.usd)}</strong><strong>${formatAmount("KHR", home.khr)}</strong><em>${home.count}</em></div>`,
        )
        .join("")}
    </section>
    <section class="panel">
      <h2>${escapeHtml(t(lang, "paneBook"))}</h2>
      <input id="totalsSearch" value="${escapeHtml(query)}" placeholder="${escapeHtml(t(lang, "search"))}" autocomplete="off" />
      <div id="totalsRows" class="register-list flat">${registerHtml(book, query, null)}</div>
    </section>
  </section>`;
}

function denomTable(summary) {
  const lines = [];
  for (const currency of ["USD", "KHR"]) {
    for (const item of summary.denominations[currency]) {
      lines.push(
        `<div class="bucket"><span>${formatAmount(currency, item.amount)} × ${item.count}</span><strong>${formatAmount(currency, item.total)}</strong></div>`,
      );
    }
  }
  return lines.join("") || `<p class="hint">—</p>`;
}

export function setupHtml(book, image) {
  const lang = book.prefs.lang;
  const wedding = book.wedding;
  const input = (id, label, value, extra = "") =>
    `<label class="field"><span>${escapeHtml(label)}</span><input id="${id}" value="${escapeHtml(value)}" ${extra} /></label>`;
  return `<section class="setup-page">
    <p class="hint">${escapeHtml(t(lang, "setupLead"))}</p>
    <p class="hint">${escapeHtml(t(lang, "privateNote"))}</p>
    <div class="setup-grid">
      ${input("groomKm", t(lang, "groomKm"), wedding.groomKm)}
      ${input("brideKm", t(lang, "brideKm"), wedding.brideKm)}
      ${input("groomEn", t(lang, "groomEn"), wedding.groomEn)}
      ${input("brideEn", t(lang, "brideEn"), wedding.brideEn)}
      ${input("weddingDate", t(lang, "date"), wedding.date, 'type="date"')}
      ${input("venueKm", t(lang, "venueKm"), wedding.venueKm)}
      ${input("venueEn", t(lang, "venueEn"), wedding.venueEn)}
    </div>
    <div class="panel">
      <h2>KHQR</h2>
      ${input("bakongAccount", t(lang, "bakongId"), wedding.bakongAccount, 'maxlength="32" autocapitalize="off" autocorrect="off" spellcheck="false"')}
      <p class="hint">${escapeHtml(t(lang, "bakongHint"))}</p>
      ${input("khqrName", t(lang, "khqrName"), wedding.khqrName, 'maxlength="25"')}
      <p class="hint">${escapeHtml(t(lang, "khqrNameHint"))}</p>
      ${input("khqrCity", t(lang, "city"), wedding.khqrCity, 'maxlength="15"')}
      <p class="hint">${escapeHtml(t(lang, "cityHint"))}</p>
      <label class="choice"><input type="radio" name="qrSource" value="account"${wedding.qrSource !== "image" ? " checked" : ""} /> ${escapeHtml(t(lang, "sourceAccount"))}</label>
      <label class="choice"><input type="radio" name="qrSource" value="image"${wedding.qrSource === "image" ? " checked" : ""} /> ${escapeHtml(t(lang, "sourceImage"))}</label>
      <label class="choice"><input type="radio" name="khqrMode" value="static"${wedding.khqrMode !== "dynamic" ? " checked" : ""} /> ${escapeHtml(t(lang, "modeStatic"))}</label>
      <label class="choice"><input type="radio" name="khqrMode" value="dynamic"${wedding.khqrMode === "dynamic" ? " checked" : ""} /> ${escapeHtml(t(lang, "modeDynamic"))}</label>
      <label class="other-btn file-btn">${escapeHtml(t(lang, "uploadQr"))}<input id="khqrFile" type="file" accept="image/*" hidden /></label>
      ${image ? `<img class="qr-preview" alt="KHQR" src="${image}" /><button type="button" class="text-btn" data-action="remove-image">${escapeHtml(t(lang, "removeImage"))}</button>` : ""}
    </div>
    <label class="rush"><input type="checkbox" id="chimeInput"${book.prefs.chime ? " checked" : ""} /> <span>${escapeHtml(t(lang, "chime"))}</span></label>
    <button type="button" class="save-cash" data-action="save-setup">${escapeHtml(t(lang, "saveSetup"))}</button>
    <div class="panel">
      <h2>${escapeHtml(t(lang, "backup"))}</h2>
      <div class="export-bar">
        <button type="button" class="other-btn" data-action="export-json">${escapeHtml(t(lang, "exportJson"))}</button>
        <label class="other-btn file-btn">${escapeHtml(t(lang, "importJson"))}<input id="importFile" type="file" accept="application/json,.json" hidden /></label>
        <button type="button" class="other-btn" data-action="ask-sample">${escapeHtml(t(lang, "loadSample"))}</button>
        <button type="button" class="danger-btn" data-action="ask-clear">${escapeHtml(t(lang, "clearBook"))}</button>
      </div>
    </div>
  </section>`;
}

export function guestHtml(payload) {
  const lang = payload.lang === "en" ? "en" : "km";
  const amount =
    payload.amount && payload.currency
      ? `<p class="khqr-amount">${formatAmount(payload.currency, payload.amount)}</p>`
      : "";
  let body = "";
  if (payload.qrDataUrl) {
    body = `<img class="khqr-image" alt="KHQR" src="${payload.qrDataUrl}" />`;
  } else if (payload.imageDataUrl) {
    body = `<img class="khqr-image uploaded" alt="KHQR" src="${payload.imageDataUrl}" />`;
  } else if (payload.error) {
    body = `<p class="khqr-error">${escapeHtml(payload.error)}</p>${payload.standalone ? "" : `<button type="button" class="other-btn" data-action="nav" data-view="setup">${escapeHtml(t(lang, "openSetup"))}</button>`}`;
  } else {
    body = `<p class="khqr-error">${escapeHtml(t(lang, "makingQr"))}</p>`;
  }
  const help = payload.helpKey ? t(lang, payload.helpKey) : t(lang, "idleKhqr");
  const hatch = payload.standalone
    ? `<button type="button" class="guest-close" data-action="close-standalone">×</button>`
    : `<div class="hatch">
        <button type="button" class="hatch-tab" data-action="toggle-hatch">${escapeHtml(t(lang, "hatch"))}</button>
        <div id="hatchPanel" class="hatch-panel" hidden>
          <p>${escapeHtml(payload.pendingName ? t(lang, "confirmPaidHint") : t(lang, "idleKhqr"))}</p>
          ${
            payload.pendingName
              ? `<button type="button" class="save-cash" data-action="confirm-paid">${escapeHtml(t(lang, "paid"))}</button><button type="button" class="text-btn" data-action="cancel-pending">${escapeHtml(t(lang, "cancel"))}</button>`
              : `<div class="pad-currency">
                  <button type="button" class="amount-btn usd" data-action="showcase-currency" data-currency="USD">USD</button>
                  <button type="button" class="amount-btn khr" data-action="showcase-currency" data-currency="KHR">KHR</button>
                </div>`
          }
          <button type="button" class="other-btn" data-action="second-screen">${escapeHtml(t(lang, "secondScreen"))}</button>
          <button type="button" class="text-btn" data-action="close-guest">${escapeHtml(t(lang, "close"))}</button>
        </div>
      </div>`;
  return `<div class="guest-screen">
    <p class="guest-kicker">ចំណងដៃ</p>
    <h2 class="guest-couple">${escapeHtml(payload.coupleKm || t(lang, "coupleMissing"))}</h2>
    ${payload.coupleEn ? `<p class="guest-en">${escapeHtml(payload.coupleEn)}</p>` : ""}
    <p class="guest-invite">${escapeHtml(t(lang, "scanTitle"))}</p>
    <article class="khqr-card">
      <header class="khqr-head">KHQR</header>
      <div class="khqr-body">
        ${body}
        ${payload.merchantName ? `<p class="khqr-merchant">${escapeHtml(payload.merchantName)}</p>` : ""}
        ${amount}
        <p class="khqr-help">${escapeHtml(help)}</p>
        ${payload.expiresAt ? `<p id="expireClock" data-expires="${Number(payload.expiresAt)}"></p>` : ""}
      </div>
    </article>
    ${payload.venue ? `<p class="guest-venue">${escapeHtml(payload.venue)}</p>` : ""}
    ${hatch}
  </div>`;
}

export function bannerHtml(pending, lang) {
  if (!pending) return "";
  return `<p>${escapeHtml(t(lang, "waiting", { amount: formatAmount(pending.currency, pending.amount), name: pending.guestName }))}</p>
    <div class="banner-actions">
      <button type="button" class="save-cash" data-action="confirm-paid">${escapeHtml(t(lang, "paid"))}</button>
      <button type="button" class="other-btn" data-action="reopen-guest">${escapeHtml(t(lang, "showAgain"))}</button>
      <button type="button" class="text-btn" data-action="cancel-pending">${escapeHtml(t(lang, "cancel"))}</button>
    </div>`;
}

export function editorHtml(entry, lang) {
  const grid = (action) =>
    `${USD_SHORTCUTS.map((amount) => amountButton("USD", amount, entry.currency === "USD" && entry.amount === amount, action)).join("")}
     ${KHR_SHORTCUTS.map((amount) => amountButton("KHR", amount, entry.currency === "KHR" && entry.amount === amount, action)).join("")}`;
  return `<div class="editor-card" role="dialog" aria-modal="true">
    <h2>${escapeHtml(t(lang, "editGift"))}</h2>
    <label class="field"><span>${escapeHtml(t(lang, "guestName"))}</span><input id="editName" value="${escapeHtml(entry.guestName)}" /></label>
    <label class="field"><span>${escapeHtml(t(lang, "hometown"))}</span><input id="editHome" value="${escapeHtml(entry.hometown)}" /></label>
    <div class="side-switch">
      <button type="button" class="side-btn groom${entry.side !== "bride" ? " is-selected" : ""}" data-action="edit-side" data-side="groom">${escapeHtml(t(lang, "groom"))}</button>
      <button type="button" class="side-btn bride${entry.side === "bride" ? " is-selected" : ""}" data-action="edit-side" data-side="bride">${escapeHtml(t(lang, "bride"))}</button>
    </div>
    <div class="amount-grid">${grid("edit-amount")}</div>
    <label class="field"><span>${escapeHtml(t(lang, "amount"))}</span><input id="editAmount" inputmode="numeric" value="${entry.amount}" /></label>
    <div class="pad-currency">
      <button type="button" class="amount-btn usd${entry.currency !== "KHR" ? " is-selected" : ""}" data-action="edit-currency" data-currency="USD">USD</button>
      <button type="button" class="amount-btn khr${entry.currency === "KHR" ? " is-selected" : ""}" data-action="edit-currency" data-currency="KHR">KHR</button>
    </div>
    <div class="pad-currency">
      <button type="button" class="amount-btn${entry.method !== "khqr" ? " is-selected" : ""}" data-action="edit-method" data-method="cash">${escapeHtml(t(lang, "cash"))}</button>
      <button type="button" class="amount-btn${entry.method === "khqr" ? " is-selected" : ""}" data-action="edit-method" data-method="khqr">KHQR</button>
    </div>
    <label class="field"><span>${escapeHtml(t(lang, "note"))}</span><input id="editNote" value="${escapeHtml(entry.note || "")}" maxlength="140" /></label>
    <div class="banner-actions">
      <button type="button" class="save-cash" data-action="save-edit">${escapeHtml(t(lang, "saveChanges"))}</button>
      <button type="button" class="danger-btn" data-action="ask-delete">${escapeHtml(t(lang, "deleteGift"))}</button>
      <button type="button" class="text-btn" data-action="close-editor">${escapeHtml(t(lang, "close"))}</button>
    </div>
  </div>`;
}

export function modalHtml({ title, body, ok, cancel }) {
  return `<div class="modal-card" role="dialog" aria-modal="true">
    <h2>${escapeHtml(title)}</h2>
    <p>${escapeHtml(body)}</p>
    <div class="banner-actions">
      <button type="button" class="text-btn" data-action="modal-cancel">${escapeHtml(cancel)}</button>
      <button type="button" class="danger-btn" data-action="modal-ok">${escapeHtml(ok)}</button>
    </div>
  </div>`;
}

export function printHtml(book) {
  const lang = book.prefs.lang;
  const summary = summarize(book.entries);
  const numbers = entryNumbers(book.entries);
  const couple = [book.wedding.groomKm, book.wedding.brideKm].filter(Boolean).join(" · ");
  const rows = [...book.entries]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(
      (entry) =>
        `<tr><td>${numbers.get(entry.id)}</td><td>${escapeHtml(formatWhen(entry.createdAt))}</td><td>${escapeHtml(entry.guestName)}</td><td>${escapeHtml(entry.hometown)}</td><td>${escapeHtml(sideLabel(lang, entry.side))}</td><td>${formatAmount(entry.currency, entry.amount)}</td><td>${escapeHtml(methodLabel(lang, entry.method))}</td></tr>`,
    )
    .join("");
  return `<h1>${escapeHtml(t(lang, "printTitle"))}</h1>
    <p>${escapeHtml(couple)} · ${escapeHtml(book.wedding.date || "")} · ${escapeHtml(book.wedding.venueKm || "")}</p>
    <p>USD ${formatAmount("USD", summary.usd)} · KHR ${formatAmount("KHR", summary.khr)} · ${summary.count}</p>
    <table><thead><tr><th>#</th><th></th><th>${escapeHtml(t(lang, "guestName"))}</th><th>${escapeHtml(t(lang, "hometown"))}</th><th>${escapeHtml(t(lang, "side"))}</th><th>${escapeHtml(t(lang, "amount"))}</th><th>${escapeHtml(t(lang, "method"))}</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export function totalsPillHtml(summary, lang) {
  return `<span class="pill-stat"><em>${formatAmount("USD", summary.usd)}</em><small>USD</small></span>
    <span class="pill-stat"><em>${formatAmount("KHR", summary.khr)}</em><small>KHR</small></span>
    <span class="pill-stat"><em>${summary.count}</em><small>${escapeHtml(t(lang, "guests"))}</small></span>`;
}

export function matchCount(book, query, lang) {
  const shown = book.entries.filter((entry) => matchesQuery(entry, query)).length;
  return t(lang, "showing", { shown, total: book.entries.length });
}
