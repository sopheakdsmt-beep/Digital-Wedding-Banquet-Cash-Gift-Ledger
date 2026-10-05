import { BakongKHQR, IndividualInfo, khqrData } from "bakong-khqr";

const CURRENCY = {
  USD: khqrData.currency.usd,
  KHR: khqrData.currency.khr,
};

/**
 * The published README shows an older IndividualInfo argument order.
 * bakong-khqr 1.0.20 expects (account, name, city, optional).
 * Currency and amount belong in optional, not in the positional arguments.
 */
export function generateIndividualQr({
  bakongAccount,
  merchantName,
  merchantCity,
  currency,
  amount = null,
  billNumber = "",
  dynamic = false,
  expirationMs = 15 * 60 * 1000,
}) {
  const optional = { currency: CURRENCY[currency] || CURRENCY.KHR };
  let expiresAt = null;
  if (dynamic) {
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new Error("Amount is invalid");
    }
    expiresAt = Date.now() + expirationMs;
    optional.amount = amount;
    optional.expirationTimestamp = expiresAt;
    optional.purposeOfTransaction = "Wedding gift";
    optional.storeLabel = "Gift desk";
    if (billNumber) optional.billNumber = String(billNumber).slice(0, 25);
  }

  let result;
  try {
    const info = new IndividualInfo(
      String(bakongAccount).trim(),
      String(merchantName).trim(),
      String(merchantCity).trim(),
      optional,
    );
    result = new BakongKHQR().generateIndividual(info);
  } catch (error) {
    const message = error?.status?.message || error?.message || "KHQR failed";
    throw new Error(message);
  }

  if (!result || result.status?.code !== 0 || !result.data?.qr) {
    throw new Error(result?.status?.message || "KHQR failed");
  }

  const qr = result.data.qr;
  if (!BakongKHQR.verify(qr)?.isValid) {
    throw new Error("KHQR failed verification");
  }

  return { qr, md5: result.data.md5, expiresAt };
}

export function decodeKhqr(qr) {
  return BakongKHQR.decode(qr);
}
