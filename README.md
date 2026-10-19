# Lacon

A reversible English script that spends the cheapest UTF-8 bytes first.

One mark stands for one word. Spaces, digits, and common punctuation stay themselves. The 60 most useful remaining one-byte characters go to the most common words (`the`, `to`, `a`, `and`…). The next words take a two-byte letter. The rest of a 12,000-word list take one CJK character. Anything missing is spelled between `~` and `` ` ``.

It is smaller on disk than English. It is usually *larger* on a current model token bill, because those rare marks split into several byte tokens. Both numbers are the point.

## Try

```bash
node --experimental-strip-types src/demo.ts
```

```js
import { encode, decode, utf8Bytes } from "./src/codec.ts";

const line = "The universe is under no obligation to make sense to you.";
const lacon = encode(line);
decode(lacon) === line;
utf8Bytes(lacon) / utf8Bytes(line); // about 0.53
```

## Measured on that sentence

| | UTF-8 bytes | o200k tokens |
|---|---|---|
| English | 57 | 12 |
| Lacon | 30 | 18 |

`Hello, other world.` is 19 bytes / 5 tokens in English and 11 bytes / 8 tokens in Lacon.

## Round trip

Case is kept (`The` vs `the`, `NASA` vs `Nasa`). Curly apostrophes fold to straight quotes. Newlines stay newlines.
