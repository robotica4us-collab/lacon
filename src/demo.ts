import { encode, decode, utf8Bytes } from "./codec.ts";

const line = "The universe is under no obligation to make sense to you.";
const lacon = encode(line);
if (decode(lacon) !== line) throw new Error("round trip failed");
console.log(line);
console.log(lacon);
console.log(`${utf8Bytes(line)} bytes → ${utf8Bytes(lacon)} bytes`);
