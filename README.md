# Lacon and Pith

Two reversible scripts for English. Lacon is the small file. Pith is the short token bill. You cannot have both.

The line below is “The universe is under no obligation to make sense to you.”

| | UTF-8 | GPT-5 / 4o / gpt-oss | GPT-4 / 3.5 | Davinci / GPT-2 |
|---|---:|---:|---:|---:|
| English | 57 | 12 | 12 | 12 |
| **Lacon** | **30** | 18 | 19 | 22 |
| **Pith** | 81 | **9** | 24 | 35 |

Pith wins only on the o200k tokenizer the first column shares. On the older OpenAI tokenizers it costs more. Claude, Gemini, Llama, and Qwen use different tokenizers and are not in this table.

Both scripts turn back into the same English. Case is kept. Curly apostrophes fold to straight quotes. A carriage return folds into a newline.

## Android

[Lacon.apk](https://github.com/robotica4us-collab/lacon/releases/download/v1.0/Lacon.apk) on [release v1.0](https://github.com/robotica4us-collab/lacon/releases/tag/v1.0).

Open the file and allow installs from this source if the phone asks. The app runs offline. It translates both ways and shows the four counts above. Tap a row to see that model’s token ids.

## Lacon

One mark stands for one common word. Spaces, digits, and common punctuation stay themselves. The most common words take the cheapest one-byte characters still free. The next band is two bytes. The rest of a 12,000-word list is one CJK character. A missing word is spelled between `~` and a backtick.

`Hello, other world.` is 19 bytes in English and 11 in Lacon.

## Pith

Pith is cut for o200k. It keeps 67,730 vocabulary pieces that stay one token when written in a row, about 16 bits each. An arithmetic code packs the sentence into as few of those pieces as the English will allow.

The output looks like unrelated words. Those words are the shapes of the pieces, not a translation. The string starts with a space. Drop that space and it will not decode.

A one-word line often ties English. A full sentence is where the tokens drop. `Hello, other world.` is 5 o200k tokens in English and 4 in Pith, at 29 bytes against 19.

## Try

```bash
node --experimental-strip-types src/demo.ts
```

```js
import { encode, decode } from "./src/codec.ts";
import { encode as pithEncode, decode as pithDecode } from "./src/pith/codec.ts";
```

Nothing in this repository phones home. The table was counted with the o200k, cl100k, p50k, and r50k encodings.
