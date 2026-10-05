import { escapeXml, formatAmount, formatWhen } from "./format.js";
import { methodLabel, sideLabel } from "./i18n.js";
import { entryNumbers } from "./model.js";
import { summarize } from "./totals.js";

function cell(value, type = "String") {
  if (type === "Number") {
    return `<Cell><Data ss:Type="Number">${Number(value) || 0}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

function row(cells) {
  return `<Row>${cells.join("")}</Row>`;
}

function ordered(entries) {
  return [...entries].sort(
    (a, b) => a.createdAt - b.createdAt || String(a.id).localeCompare(String(b.id)),
  );
}

export function workbookXml(book) {
  const lang = book.prefs?.lang === "en" ? "en" : "km";
  const numbers = entryNumbers(book.entries);
  const summary = summarize(book.entries);
  const wedding = book.wedding || {};
  const couple = [wedding.groomKm, wedding.brideKm].filter(Boolean).join(" · ");
  const headers =
    lang === "en"
      ? ["No.", "Time", "Guest", "Hometown", "Side", "Currency", "Amount", "Method", "Note"]
      : ["លេខ", "ម៉ោង", "ឈ្មោះភ្ញៀវ", "ស្រុកកំណើត", "ខាង", "រូបិយប័ណ្ណ", "ចំនួន", "វិធី", "កំណត់សម្គាល់"];

  const registerRows = ordered(book.entries).map((entry) =>
    row([
      cell(numbers.get(entry.id), "Number"),
      cell(formatWhen(entry.createdAt)),
      cell(entry.guestName),
      cell(entry.hometown),
      cell(sideLabel(lang, entry.side)),
      cell(entry.currency),
      cell(entry.amount, "Number"),
      cell(methodLabel(lang, entry.method)),
      cell(entry.note || ""),
    ]),
  );

  const summaryRows = [
    row([cell(lang === "en" ? "Couple" : "គូស្វាមីភរិយា"), cell(couple)]),
    row([cell(lang === "en" ? "Latin names" : "ឈ្មោះឡាតាំង"), cell([wedding.groomEn, wedding.brideEn].filter(Boolean).join(" & "))]),
    row([cell(lang === "en" ? "Date" : "ថ្ងៃ"), cell(wedding.date || "")]),
    row([cell(lang === "en" ? "Venue" : "ទីតាំង"), cell(wedding.venueKm || wedding.venueEn || "")]),
    row([cell(lang === "en" ? "Guests" : "ភ្ញៀវ"), cell(summary.count, "Number")]),
    row([
      cell(lang === "en" ? "USD total" : "សរុបដុល្លារ"),
      cell("USD"),
      `<Cell ss:Formula="=SUMIF(Register!F:F,&quot;USD&quot;,Register!G:G)"><Data ss:Type="Number">${summary.usd}</Data></Cell>`,
    ]),
    row([
      cell(lang === "en" ? "KHR total" : "សរុបរៀល"),
      cell("KHR"),
      `<Cell ss:Formula="=SUMIF(Register!F:F,&quot;KHR&quot;,Register!G:G)"><Data ss:Type="Number">${summary.khr}</Data></Cell>`,
    ]),
    row([cell("")]),
    row([cell(lang === "en" ? "Side" : "ខាង"), cell("USD"), cell("KHR"), cell(lang === "en" ? "Guests" : "ភ្ញៀវ")]),
    ...["groom", "bride"].map((side) =>
      row([
        cell(sideLabel(lang, side)),
        cell(summary.bySide[side].usd, "Number"),
        cell(summary.bySide[side].khr, "Number"),
        cell(summary.bySide[side].count, "Number"),
      ]),
    ),
    row([cell("")]),
    row([cell(lang === "en" ? "Method" : "វិធី"), cell("USD"), cell("KHR"), cell(lang === "en" ? "Guests" : "ភ្ញៀវ")]),
    ...["cash", "khqr"].map((method) =>
      row([
        cell(methodLabel(lang, method)),
        cell(summary.byMethod[method].usd, "Number"),
        cell(summary.byMethod[method].khr, "Number"),
        cell(summary.byMethod[method].count, "Number"),
      ]),
    ),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:x="urn:schemas-microsoft-com:office:excel">
<Styles>
<Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFF8EE"/><Interior ss:Color="#4C1220" ss:Pattern="Solid"/></Style>
</Styles>
<Worksheet ss:Name="Register">
<Table>
<Row>${headers.map((header) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`).join("")}</Row>
${registerRows.join("\n")}
</Table>
<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane></WorksheetOptions>
</Worksheet>
<Worksheet ss:Name="Summary"><Table>
${summaryRows.join("\n")}
</Table></Worksheet>
</Workbook>`;
}

export function ledgerText(book) {
  const lang = book.prefs?.lang === "en" ? "en" : "km";
  const wedding = book.wedding || {};
  const summary = summarize(book.entries);
  const numbers = entryNumbers(book.entries);
  const couple = [wedding.groomKm, wedding.brideKm].filter(Boolean).join(" · ") ||
    [wedding.groomEn, wedding.brideEn].filter(Boolean).join(" & ");
  const lines = [
    lang === "en" ? "Wedding cash gift book" : "សៀវភៅចំណងដៃ",
    couple,
    [wedding.date, wedding.venueKm || wedding.venueEn].filter(Boolean).join(" · "),
    "",
    `USD: ${formatAmount("USD", summary.usd)}`,
    `KHR: ${formatAmount("KHR", summary.khr)}`,
    `${lang === "en" ? "Guests" : "ភ្ញៀវ"}: ${summary.count}`,
    "",
  ];
  for (const entry of ordered(book.entries)) {
    const home = entry.hometown || (lang === "en" ? "no hometown" : "មិនបានសរសេរស្រុក");
    lines.push(
      `${numbers.get(entry.id)}. ${entry.guestName} (${home}) ${sideLabel(lang, entry.side)} ${formatAmount(entry.currency, entry.amount)} ${methodLabel(lang, entry.method)}`,
    );
  }
  return lines.filter((line) => line !== undefined).join("\n");
}

export function telegramSummary(text, max = 1400) {
  if (text.length <= max) return text;
  const clipped = text.slice(0, max);
  const end = clipped.lastIndexOf("\n");
  return `${clipped.slice(0, end > 200 ? end : max)}\n…`;
}

export function exportFilename(book) {
  const wedding = book.wedding || {};
  const who = [wedding.groomEn, wedding.brideEn].filter(Boolean).join("-") || "wedding";
  const safe = who.replace(/[^\w.-]+/g, "");
  const date = wedding.date || "gifts";
  return `cash-gifts-${safe}-${date}.xls`;
}
