import test from "node:test";
import assert from "node:assert/strict";
import { decodeKhqr, generateIndividualQr } from "../src/khqr.js";
import { findSameGuest, sanitizeBook, validateKhqrProfile } from "../src/model.js";
import { exampleBook } from "../src/sample.js";
import { summarize } from "../src/totals.js";
import { ledgerText, workbookXml } from "../src/exportBook.js";

test("USD and KHR totals stay separate", () => {
  const summary = summarize(exampleBook().entries);
  assert.equal(summary.count, 8);
  assert.equal(summary.usd, 400);
  assert.equal(summary.khr, 350000);
  assert.deepEqual(summary.bySide.groom, { count: 4, usd: 280, khr: 100000 });
  assert.deepEqual(summary.bySide.bride, { count: 4, usd: 120, khr: 250000 });
  assert.deepEqual(summary.byMethod.cash, { count: 6, usd: 380, khr: 150000 });
  assert.deepEqual(summary.byMethod.khqr, { count: 2, usd: 20, khr: 200000 });
  assert.deepEqual(
    summary.denominations.USD.map((item) => item.amount),
    [20, 30, 50, 100, 200],
  );
});

test("invalid amounts are left out of the totals", () => {
  const summary = summarize([
    { currency: "USD", amount: 20, side: "groom", method: "cash" },
    { currency: "USD", amount: 1.5, side: "groom", method: "cash" },
    { currency: "EUR", amount: 20, side: "groom", method: "cash" },
  ]);
  assert.equal(summary.usd, 20);
  assert.equal(summary.count, 1);
});

test("same guest is detected by name and hometown", () => {
  const entries = exampleBook().entries;
  assert.ok(findSameGuest(entries, "  សុខ   វណ្ណា ", "ស្រុកស្វាយជ្រំ"));
  assert.equal(findSameGuest(entries, "សុខ វណ្ណា", "ភ្នំពេញ"), null);
});

test("imported books keep only real gifts", () => {
  const { book } = sanitizeBook({
    wedding: { groomKm: "សុភា", khqrMode: "dynamic", qrSource: "nope", bakongAccount: "name@abaa" },
    entries: [
      { id: "a", guestName: "ដា", hometown: "ស្រុក", side: "bride", currency: "KHR", amount: 50000, method: "khqr", createdAt: 10 },
      { guestName: "", currency: "USD", amount: 10, side: "groom" },
    ],
    prefs: { lang: "en", rush: true },
  });
  assert.equal(book.wedding.groomKm, "សុភា");
  assert.equal(book.wedding.khqrMode, "dynamic");
  assert.equal(book.wedding.qrSource, "account");
  assert.equal(book.entries.length, 1);
  assert.equal(book.entries[0].id, "a");
  assert.equal(book.prefs.lang, "en");
  assert.equal(book.prefs.rush, true);
});

test("KHQR profile rules match the Bakong field limits", () => {
  assert.equal(validateKhqrProfile({ bakongAccount: "sopheap@abaa", khqrName: "Sopheap", khqrCity: "Phnom Penh" }), null);
  assert.equal(validateKhqrProfile({ bakongAccount: "sopheap", khqrName: "Sopheap", khqrCity: "Phnom Penh" }), "accountInvalid");
  assert.equal(validateKhqrProfile({ bakongAccount: "sopheap@abaa", khqrName: "សុភាព", khqrCity: "Phnom Penh" }), "nameLatin");
  assert.equal(validateKhqrProfile({ bakongAccount: "sopheap@abaa", khqrName: "Sopheap", khqrCity: "ភ្នំពេញ" }), "cityLatin");
});

test("dynamic and static KHQR strings verify and carry the amount only when locked", () => {
  const dynamic = generateIndividualQr({
    bakongAccount: "sopheap@abaa",
    merchantName: "Sopheap",
    merchantCity: "Phnom Penh",
    currency: "USD",
    amount: 50,
    billNumber: "G0001",
    dynamic: true,
  });
  const dynamicData = decodeKhqr(dynamic.qr).data;
  assert.equal(dynamicData.transactionAmount, "50");
  assert.equal(dynamicData.transactionCurrency, "840");
  assert.equal(dynamicData.pointofInitiationMethod, "12");
  assert.equal(dynamicData.merchantName, "Sopheap");
  assert.ok(dynamic.expiresAt > Date.now());

  const stat = generateIndividualQr({
    bakongAccount: "sopheap@abaa",
    merchantName: "Sopheap",
    merchantCity: "Phnom Penh",
    currency: "KHR",
    dynamic: false,
  });
  const staticData = decodeKhqr(stat.qr).data;
  assert.equal(staticData.transactionAmount, null);
  assert.equal(staticData.transactionCurrency, "116");
  assert.equal(staticData.pointofInitiationMethod, "11");
});

test("excel and telegram exports keep searchable names, hometowns, and both currencies", () => {
  const book = exampleBook();
  const text = ledgerText(book);
  assert.match(text, /សុខ វណ្ណា/);
  assert.match(text, /ស្រុកស្វាយជ្រំ/);
  assert.match(text, /\$400/);
  assert.match(text, /350,000៛/);

  const xml = workbookXml(book);
  assert.match(xml, /សុខ វណ្ណា/);
  assert.match(xml, /ភូមិព្រែកលៀប/);
  assert.match(xml, /ss:Name="Register"/);
  assert.match(xml, /ss:Name="Summary"/);
  assert.match(xml, /SUMIF\(Register!F:F,&quot;USD&quot;,Register!G:G\)/);
  assert.match(xml, /<Data ss:Type="Number">400<\/Data>/);
  assert.match(xml, /<Data ss:Type="Number">350000<\/Data>/);
});
