# Lacon and Pith

Two reversible ways to write English. Each one wins a different bill.

| | What it spends | Universe sentence |
|---|---|---|
| English | the original | 57 bytes, 12 o200k tokens |
| **Lacon** | the fewest UTF-8 bytes | 30 bytes, 18 tokens |
| **Pith** | the fewest o200k tokens | 81 bytes, 9 tokens |

The sentence is “The universe is under no obligation to make sense to you.” Both scripts turn back into that same line.

You cannot win both scores at once. A character that is cheap in UTF-8 is often rare to the tokenizer, so it splits into several tokens. A piece the tokenizer already bills as one token is often a whole word, so it costs more bytes.

## Android

[Lacon.apk](https://github.com/robotica4us-collab/lacon/releases/download/v1.0/Lacon.apk) on the [v1.0 release](https://github.com/robotica4us-collab/lacon/releases/tag/v1.0). Open it on the phone and allow installs from this source if Android asks. It runs offline. The model list counts the same line on GPT-5 / 4o / gpt-oss, GPT-4 / 3.5, Davinci / Codex, and GPT-2 / GPT-3. Pith only shrinks the first of those.

## Lacon

One mark stands for one common word. Spaces, digits, and common punctuation stay themselves. The cheapest remaining one-byte characters go to the most common words. The next words take a two-byte letter. The rest of a 12,000-word list take one CJK character. Anything missing is spelled between `~` and `` ` ``.

## Pith

Pith is aimed at OpenAI’s o200k tokenizer, the one current GPT models use. It keeps 67,730 vocabulary pieces that stay exactly one token when written in a row, about 16 bits each. An arithmetic code packs the sentence into as few of those pieces as the English will allow.

The output looks like unrelated words. Those words are the shapes of the pieces, not a translation. Another company’s tokenizer will not see the same saving. A one-word line often ties English. A full sentence is where the tokens drop.

`Hello, other world.` is 19 bytes / 5 tokens in English, 11 bytes / 8 tokens in Lacon, and 29 bytes / 4 tokens in Pith.

## Try

```bash
node --experimental-strip-types src/demo.ts
```

```js
import { encode, decode } from "./src/codec.ts";
import { encode as pithEncode, decode as pithDecode } from "./src/pith/codec.ts";
```

Case is kept. Curly apostrophes fold to straight quotes. A carriage return folds into a newline.
