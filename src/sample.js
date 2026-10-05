const base = Date.parse("2026-02-14T05:00:00.000Z");

const rows = [
  ["សុខ វណ្ណា", "ស្រុកស្វាយជ្រំ", "groom", "USD", 50, "cash"],
  ["ចាន់ ដារា", "ភូមិព្រែកលៀប", "bride", "USD", 100, "cash"],
  ["លី ស្រីនាង", "ក្រុងបាត់ដំបង", "groom", "KHR", 100000, "cash"],
  ["ហេង សុភាព", "ស្រុកកំពង់សៀម", "bride", "USD", 20, "khqr"],
  ["មាស បូរ៉ា", "ភ្នំពេញ", "groom", "USD", 30, "cash"],
  ["អ៊ុក សុខា", "ស្រុកពញាឮ", "bride", "KHR", 50000, "cash"],
  ["ផល សុវណ្ណ", "ក្រុងកំពង់ឆ្នាំង", "groom", "USD", 200, "cash"],
  ["រស់ មករា", "សៀមរាប", "bride", "KHR", 200000, "khqr"],
];

export function exampleBook() {
  return {
    version: 1,
    wedding: {
      groomKm: "សុភាព",
      brideKm: "ចន្ទ្ថា",
      groomEn: "Sopheap",
      brideEn: "Chanthea",
      date: "2026-02-14",
      venueKm: "សាលាមង្គលភាព ភ្នំពេញ",
      venueEn: "Mongkul Pheap Hall, Phnom Penh",
      bakongAccount: "",
      khqrName: "Sopheap Chanthea",
      khqrCity: "Phnom Penh",
      khqrMode: "static",
      qrSource: "account",
    },
    entries: rows.map((row, index) => ({
      id: `example-${index + 1}`,
      createdAt: base + index * 3 * 60 * 1000,
      guestName: row[0],
      hometown: row[1],
      side: row[2],
      currency: row[3],
      amount: row[4],
      method: row[5],
      note: "",
    })),
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
