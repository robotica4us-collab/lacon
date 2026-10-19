import { decode as laconDecode, encode as laconEncode, utf8Bytes } from "./codec.ts";
import { PITH_PIECES, decode as pithDecode, encode as pithEncode } from "./pith/codec.ts";

const line = "The universe is under no obligation to make sense to you.";
const lacon = laconEncode(line);
const pith = pithEncode(line);
if (laconDecode(lacon) !== line) throw new Error("Lacon round trip failed");
if (pithDecode(pith) !== line) throw new Error("Pith round trip failed");

console.log(line);
console.log("Lacon", lacon);
console.log("Pith ", JSON.stringify(pith));
console.log(
  `bytes  English ${utf8Bytes(line)}  Lacon ${utf8Bytes(lacon)}  Pith ${utf8Bytes(pith)}`,
);
console.log(`Pith pieces ${PITH_PIECES}`);
console.log("o200k tokens on this line: English 12, Lacon 18, Pith 9");
