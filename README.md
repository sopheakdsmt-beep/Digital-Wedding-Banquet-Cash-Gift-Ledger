# សៀវភៅកត់ចំណងដៃ

Digital wedding and banquet cash-gift ledger for reception tablets. It replaces the paper notebook used to record ចំណងដៃ at Khmer weddings: large amount buttons, a live guest book, a guest-facing KHQR screen, and USD / KHR totals that export to Excel or Telegram.

Gifts stay on this tablet until someone exports them. There is no account and no server.

## Desk

The left pane is the entry form. Choose groom's side or bride's side, type the guest name and hometown, then tap an amount (`$20`, `$30`, `$50`, `$100`, `50,000៛`, `100,000៛`, and the other common envelopes). The right pane is the running book, newest gift first, searchable by name or hometown.

Pin a hometown when a whole village arrives together. Rush mode records the gift on the amount tap once the name is filled in. A wrong tap can be undone.

Tap a row to correct the name, hometown, amount, or side. That is the record the family will search years later when they reciprocate.

## KHQR

Setup stores the family's own Bakong account (`name@abaa`) or a KHQR picture from their bank. The guest screen can face the guest on this tablet, or open in a second window on the same tablet.

- **Static:** the guest types the amount in their banking app.
- **Dynamic:** the receptionist chooses the amount first, and that amount is locked into a Bakong KHQR that expires in 15 minutes.

Mark the gift paid only after the transfer succeeds. The book then stores it as KHQR, separate from cash.

## Totals and export

The header shows live USD, KHR, and guest counts. The totals page splits those by side, by cash versus KHQR, by envelope amount, and by hometown. Excel has a `Register` sheet and a `Summary` sheet whose currency totals are `SUMIF` formulas. Telegram receives the guest names and hometowns, either as a shared text file or a copied list.

The on-screen language toggles between Khmer and English. The nav stays bilingual.

## Run

```bash
npm install
npm test
npm run dev
```

Open the desk on a tablet in landscape. Add it to the home screen if the reception hall connection is unreliable; a production build caches the app for offline use after the first load.

```bash
npm run build
npm run preview
```

Load **example wedding** from the empty book or from Setup to see a full reception without typing. The example does not include a payable Bakong account.
