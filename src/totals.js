function emptyBucket() {
  return { count: 0, usd: 0, khr: 0 };
}

function add(bucket, entry) {
  bucket.count += 1;
  if (entry.currency === "USD") bucket.usd += entry.amount;
  if (entry.currency === "KHR") bucket.khr += entry.amount;
}

function valid(entry) {
  return (
    entry &&
    (entry.currency === "USD" || entry.currency === "KHR") &&
    Number.isSafeInteger(entry.amount) &&
    entry.amount > 0
  );
}

export function summarize(entries) {
  const list = Array.isArray(entries) ? entries.filter(valid) : [];
  const bySide = { groom: emptyBucket(), bride: emptyBucket() };
  const byMethod = { cash: emptyBucket(), khqr: emptyBucket() };
  const denom = { USD: new Map(), KHR: new Map() };
  const homes = new Map();
  const totals = emptyBucket();

  for (const entry of list) {
    add(totals, entry);
    const side = entry.side === "bride" ? "bride" : "groom";
    add(bySide[side], entry);
    const method = entry.method === "khqr" ? "khqr" : "cash";
    add(byMethod[method], entry);
    const map = denom[entry.currency];
    map.set(entry.amount, (map.get(entry.amount) || 0) + 1);
    const home = String(entry.hometown || "").trim();
    if (!homes.has(home)) homes.set(home, emptyBucket());
    add(homes.get(home), entry);
  }

  const denominations = {};
  for (const currency of ["USD", "KHR"]) {
    denominations[currency] = [...denom[currency].entries()]
      .map(([amount, count]) => ({ amount, count, total: amount * count }))
      .sort((a, b) => a.amount - b.amount);
  }

  const hometowns = [...homes.entries()]
    .map(([name, bucket]) => ({ name, ...bucket }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    count: totals.count,
    usd: totals.usd,
    khr: totals.khr,
    bySide,
    byMethod,
    denominations,
    hometowns,
  };
}
