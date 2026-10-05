import QRCode from "qrcode";

export function qrToDataUrl(text) {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 640,
    color: { dark: "#141414", light: "#ffffff" },
  });
}
