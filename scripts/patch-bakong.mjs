import fs from "node:fs";

const root = new URL("../node_modules/bakong-khqr/src/", import.meta.url);

function patch(relativePath, pairs) {
  const file = new URL(relativePath, root);
  let code = fs.readFileSync(file, "utf8");
  let changed = false;
  for (const [from, to] of pairs) {
    if (!code.includes(from)) continue;
    code = code.replaceAll(from, to);
    changed = true;
  }
  if (changed) fs.writeFileSync(file, code);
}

const assignments = [
  ["        sliceTagObject = cutString(KHQRString);", "        let sliceTagObject = cutString(KHQRString);"],
  ["                cutsubstring = cutString(value);", "                let cutsubstring = cutString(value);"],
];

patch("helper/crc16.js", [["        c = s[i];", "        var c = s[i];"]]);
patch("controller/decodeKHQR.js", assignments);
patch("controller/decodeValidation.js", assignments);
