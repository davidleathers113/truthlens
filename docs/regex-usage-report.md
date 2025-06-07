# Regular Expression Usage Report

This report summarizes all RegExp usages across the extractor and analyzer logic in the repository. Each entry includes the file location, the code snippet containing the regex, a plain‑language explanation of the pattern, and context on why it is used.

---

- **📄 File/Line**: `src/background/api/factCheckingService.ts:118-125`
- **🔍 Code Snippet**:
  ```ts
  const clickbaitPatterns = [
    /you won't believe/i,
    /shocking/i,
    /this one trick/i,
    /doctors hate/i,
  ];

  if (clickbaitPatterns.some(pattern => pattern.test(content.title!))) {
  ````
- **📘 Pattern Description**: Array of simple case‑insensitive phrases used to detect clickbait.
- **🎯 Use Case Context**: When fact‑checking article titles, the service lowers the credibility score if any clickbait phrase matches.
- **⚠️ Notes**: Straightforward phrase matching—does not cover more subtle clickbait variations.

---

- **📄 File/Line**: `src/background/api/enhancedFactCheckingService.ts:245-302`
- **🔍 Code Snippet**:
  ```ts
  const clickbaitPatterns = [
    /you won't believe/i,
    /shocking/i,
    /this one trick/i,
    /doctors hate/i,
    /will blow your mind/i,
    /what happens next/i
  ];

  if (clickbaitPatterns.some(pattern => pattern.test(content.title!))) {
    ...
  }

  if (/[!]{2,}/.test(content.title) || /[?]{2,}/.test(content.title)) {
    ...
  }

  const factualPatterns = [
    /according to/i,
    /studies show/i,
    /research indicates/i,
    /experts say/i,
    /data shows/i
  ];

  if (factualPatterns.some(pattern => pattern.test(content.content!))) {
    ...
  }

  const emotionalPatterns = [
    /outrageous/i,
    /scandal/i,
    /explosive/i,
    /devastating/i,
    /must see/i
  ];

  if (emotionalPatterns.some(pattern => pattern.test(content.content!))) {
    ...
  }
  ```
- **📘 Pattern Description**: Uses several arrays of case‑insensitive phrases for detecting clickbait, factual language, and emotionally manipulative wording. Also uses `/[!]{2,}/` and `/[?]{2,}/` to catch repeated punctuation.
- **🎯 Use Case Context**: Provides a more detailed assessment of an article by penalizing clickbait titles, boosting factual language, and reducing score for emotional manipulation.
- **⚠️ Notes**: Phrase‑based matching can miss nuanced language.

---

- **📄 File/Line**: `src/background/services/domainReputationService.ts:406-436`
- **🔍 Code Snippet**:
  ```ts
  const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\?#]+)/);
  ...
  return domain
    .toLowerCase()
    .replace(/^www\./, '') // Remove www prefix
    .trim();
  ...
  variant = this.database.get(domain.replace('.co.uk', '.com'));
  ```
- **📘 Pattern Description**:
  - `/(?:https?:\/\/)?(?:www\.)?([^\/\?#]+)/` extracts the hostname from a URL.
  - `/^www\./` removes a leading `www.`.
  - `'.co.uk'` → `'.com'` replace handles TLD variants.
- **🎯 Use Case Context**: Normalizes domains for reputation lookup, accommodating malformed URLs and common domain variants.
- **⚠️ Notes**: Regex for URL parsing is simplistic and may not handle all edge cases.

---

- **📄 File/Line**: `src/content/extractors/genericExtractor.ts:238-254`
- **🔍 Code Snippet**:
  ```ts
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.normalize('NFKD');
  cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  ...
  cleaned = cleaned.replace(/(\r\n|\n|\r)/gm, ' ');
  ```
- **📘 Pattern Description**:
  - `/\s+/g` collapses multiple whitespace characters.
  - `/[\u0000-\u001F\u007F-\u009F]/g` removes control characters.
  - `/(\r\n|\n|\r)/gm` replaces line breaks.
- **🎯 Use Case Context**: Normalizes and cleans raw HTML/text before readability processing.
- **⚠️ Notes**: Typical text‑cleanup regexes—performance impact minimal.

---

- **📄 File/Line**: `src/content/extractors/genericExtractor.ts:701-714`
- **🔍 Code Snippet**:
  ```ts
  const datePatterns = [
    /(\d{4}-\d{2}-\d{2})/,
    /(\w+ \d{1,2}, \d{4})/,
  ];

  const match = bodyText.match(pattern);
  ```
- **📘 Pattern Description**: Matches common date formats such as `YYYY-MM-DD` and "Month DD, YYYY" to detect publication dates.
- **🎯 Use Case Context**: Attempts to parse dates from generic article text when metadata isn’t available.
- **⚠️ Notes**: Limited set of patterns may miss other date formats.

---

- **📄 File/Line**: `src/content/extractors/instagramExtractor.ts:1005-1021`
- **🔍 Code Snippet**:
  ```ts
  return text
    .trim()
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 10000);

  return username
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '')
    .slice(0, 30);
  ```
- **📘 Pattern Description**:
  - Removes control characters and excess whitespace from text.
  - Username sanitization keeps letters, numbers, periods and underscores.
- **🎯 Use Case Context**: Cleans user‑generated content and usernames before analysis or storage.
- **⚠️ Notes**: Straightforward sanitization—could exclude valid Unicode usernames.

---

- **📄 File/Line**: `src/content/extractors/instagramExtractor.ts:1108-1110`
- **🔍 Code Snippet**:
  ```ts
  () => element.querySelector('a[href*="/p/"]')
        ?.getAttribute('href')
        ?.match(/\/p\/([^/]+)/)?.[1],
  ```
- **📘 Pattern Description**: Extracts the post ID from a URL segment matching `/p/<id>`.
- **🎯 Use Case Context**: Generates a unique identifier for posts when scraping page elements.
- **⚠️ Notes**: Assumes standard post URL structure.

---

- **📄 File/Line**: `src/content/extractors/instagramExtractor.ts:1381-1384`
- **🔍 Code Snippet**:
  ```ts
  const hashtags = (text.match(/#\w+/g) || []).map(tag => tag.slice(1));
  const mentions = (text.match(/@\w+/g) || []).map(mention => mention.slice(1));
  ```
- **📘 Pattern Description**: Extracts `#hashtags` and `@mentions` from post text.
- **🎯 Use Case Context**: Gathers entities referenced in an Instagram post for metadata analysis.
- **⚠️ Notes**: Does not support Unicode hashtags or mentions beyond `\w`.

---

- **📄 File/Line**: `src/content/extractors/tiktokExtractor.ts:982-985`
- **🔍 Code Snippet**:
  ```ts
  const cleaned = text.replace(/[^\d.,KMB]/gi, '').trim();
  const number = parseFloat(cleaned.replace(/[KMB]/i, ''));
  ```
- **📘 Pattern Description**:
  - `/[^\d.,KMB]/gi` strips everything except digits, punctuation and the suffix letters K/M/B.
  - `/[KMB]/i` removes the suffix before parsing.
- **🎯 Use Case Context**: Parses view/like counts that use TikTok’s "K/M/B" abbreviation.
- **⚠️ Notes**: Assumes only one suffix and may mis-handle localized number formats.

---

- **📄 File/Line**: `src/content/extractors/tiktokExtractor.ts:1003-1007`
- **🔍 Code Snippet**:
  ```ts
  const patterns = [
    { pattern: /(\d+)s?\s*ago/i, multiply: 1000 },    // seconds
    { pattern: /(\d+)m?\s*ago/i, multiply: 60 * 1000 }, // minutes
    { pattern: /(\d+)h?\s*ago/i, multiply: 60 * 60 * 1000 }, // hours
    { pattern: /(\d+)d?\s*ago/i, multiply: 24 * 60 * 60 * 1000 }, // days
    { pattern: /(\d+)w?\s*ago/i, multiply: 7 * 24 * 60 * 60 * 1000 } // weeks
  ];
  ```
- **📘 Pattern Description**: Detects relative time strings (e.g., "3h ago") and converts them to time intervals.
- **🎯 Use Case Context**: Parses TikTok timestamps when absolute time metadata isn’t available.
- **⚠️ Notes**: Only supports English "ago" phrases.

---

- **📄 File/Line**: `src/content/extractors/tiktokExtractor.ts:1027-1038`
- **🔍 Code Snippet**:
  ```ts
  const hashtagRegex = /#[\w\u00c0-\u024f\u1e00-\u1eff]+/g;
  const matches = text.match(hashtagRegex);

  const mentionRegex = /@[\w\u00c0-\u024f\u1e00-\u1eff]+/g;
  const matches = text.match(mentionRegex);
  ```
- **📘 Pattern Description**: Matches hashtags and mentions including extended Latin ranges.
- **🎯 Use Case Context**: Extracts tagged users and topics from TikTok descriptions.
- **⚠️ Notes**: Still limited to certain Unicode ranges.

---

- **📄 File/Line**: `src/content/extractors/twitterExtractor.ts:401-404`
- **🔍 Code Snippet**:
  ```ts
  const match = href.match(/\/([^\/]+)$/);
  if (match) {
    author.username = match[1];
  }
  ```
- **📘 Pattern Description**: Captures the final path segment of a profile URL to derive the username.
- **🎯 Use Case Context**: Resolves a user’s handle from tweet markup.
- **⚠️ Notes**: Assumes the username is always the last URL segment.

---

- **📄 File/Line**: `src/content/extractors/twitterExtractor.ts:734-735`
- **🔍 Code Snippet**:
  ```ts
  const threadPattern = /(\d+)\/(\d+)/g;
  const threadMatch = threadPattern.exec(tweetText);
  ```
- **📘 Pattern Description**: Looks for "1/5", "2/5", etc., to detect threaded tweets and total count.
- **🎯 Use Case Context**: Determines whether the tweet is part of a thread and how many posts are in it.
- **⚠️ Notes**: Works only when the format "n/m" appears in text.

---

- **📄 File/Line**: `src/content/extractors/twitterExtractor.ts:897-898`
- **🔍 Code Snippet**:
  ```ts
  const threadPattern = /(\d+)\/(\d+)/;
  const threadMatch = tweetText.match(threadPattern);
  ```
- **📘 Pattern Description**: Non‑global variant used when inspecting a single tweet element.
- **🎯 Use Case Context**: Extracts thread position (e.g., "2/5") for the current tweet.
- **⚠️ Notes**: Similar limitations as the global version.

---

- **📄 File/Line**: `src/content/extractors/twitterExtractor.ts:1073-1077`
- **🔍 Code Snippet**:
  ```ts
  const cleaned = text.replace(/[^\d.,KMB]/gi, '').trim();
  const number = parseFloat(cleaned.replace(/[KMB]/i, ''));
  ```
- **📘 Pattern Description**: Same approach as the TikTok extractor—cleans numeric strings and removes K/M/B suffix.
- **🎯 Use Case Context**: Parses retweet/like counts from tweet UI.
- **⚠️ Notes**: Locale‑dependent number formats may affect accuracy.

---

- **📄 File/Line**: `src/content/extractors/twitterExtractor.ts:988`
- **🔍 Code Snippet**:
  ```ts
  const tweetIdMatch = url.match(/\/status\/(\d+)/);
  ```
- **📘 Pattern Description**: Extracts the numeric tweet ID from the current URL.
- **🎯 Use Case Context**: Locates a specific tweet element by ID.
- **⚠️ Notes**: Simple but effective for standard URLs.

---

- **📄 File/Line**: `src/content/extractors/config/tiktokSelectors.ts:240-268`
- **🔍 Code Snippet**:
  ```ts
  domains: [
    /^https?:\/\/(www\.)?tiktok\.com/,
    /^https?:\/\/m\.tiktok\.com/,
    /^https?:\/\/[a-z]{2}\.tiktok\.com/, // Localized domains
    /^https?:\/\/vm\.tiktok\.com/ // Short URLs
  ],

  videoUrls: [
    /@[^\/]+\/video\/\d+/,
    /\/v\/\d+/,
    /\/video\/\d+/,
    /\/t\/[A-Za-z0-9]+/ // Share URLs
  ],

  profileUrls: [
    /@[^\/]+$/,
    /\/user\/[^\/]+$/,
    /@[^\/]+\?/
  ],

  embedUrls: [
    /embed\.tiktok\.com/,
    /tiktok\.com\/embed/
  ],

  tagUrls: [
    /\/tag\/[^\/]+/,
    /\/discover\/[^\/]+/
  ]
  ```
- **📘 Pattern Description**: Collection of URL matching patterns used to detect TikTok pages, videos, profiles, embeds, and tag pages.
- **🎯 Use Case Context**: Enables helper functions (`isTikTokUrl`, `isTikTokVideoUrl`, etc.) to validate and categorize TikTok URLs.
- **⚠️ Notes**: Regular expressions are straightforward but assume conventional URL layouts.

---

- **📄 File/Line**: `src/content/extractors/config/tiktokSelectors.ts:318-334`
- **🔍 Code Snippet**:
  ```ts
  validDescriptionPatterns: [
    /\S+/, // At least one non-whitespace character
  ],

  invalidContentIndicators: [
    /^loading/i,
    /^error/i,
    /unavailable/i,
    /private.*account/i,
    /video.*removed/i
  ],

  engagementPatterns: [
    /^\d+(\.\d+)?[KMB]?$/i, // Numbers with K, M, B suffixes
    /^\d+$/ // Plain numbers
  ]
  ```
- **📘 Pattern Description**: Validates descriptions and engagement counts while filtering out "loading" or "private account" placeholders.
- **🎯 Use Case Context**: Ensures extracted TikTok data meets minimum quality thresholds before processing.
- **⚠️ Notes**: Patterns are designed for quick checks, not exhaustive validation.

---

- **📄 File/Line**: `src/content/extractors/config/instagramSelectors.ts:254-283`
- **🔍 Code Snippet**:
  ```ts
  domains: [
    /^https?:\/\/(www\.)?instagram\.com/,
    /^https?:\/\/m\.instagram\.com/,
    /^https?:\/\/[a-z]{2}\.instagram\.com/ // Localized domains
  ],

  postUrls: [
    /\/p\/[A-Za-z0-9_-]+/,
    /\/tv\/[A-Za-z0-9_-]+/ // IGTV posts
  ],

  reelUrls: [
    /\/reel\/[A-Za-z0-9_-]+/,
    /\/reels\/[A-Za-z0-9_-]+/
  ],

  storyUrls: [
    /\/stories\/[^\/]+\/\d+/,
    /story_media_id=\d+/
  ],

  profileUrls: [
    /@?[^\/]+\/?$/,
    /\/[^\/]+\/?$/
  ],

  exploreUrls: [
    /\/explore\//,
    /\/explore\/tags\//
  ]
  ```
- **📘 Pattern Description**: URL patterns for detecting various Instagram page types (posts, reels, stories, profiles, explore pages).
- **🎯 Use Case Context**: Used by helper functions to classify Instagram URLs and enforce rate-limiting.
- **⚠️ Notes**: Relies on typical URL structures; may need updates if Instagram changes formats.

---

- **📄 File/Line**: `src/content/extractors/config/twitterSelectors.ts:207-227`
- **🔍 Code Snippet**:
  ```ts
  domains: [
    /^https?:\/\/(www\.)?(twitter|x)\.com/,
    /^https?:\/\/mobile\.(twitter|x)\.com/,
    /^https?:\/\/[a-z]{2}\.(twitter|x)\.com/ // Localized domains
  ],

  tweetUrls: [
    /\/status\/\d+/,
    /\/tweet\/\d+/,
    /\/i\/web\/status\/\d+/
  ],

  profileUrls: [
    /^https?:\/\/(twitter|x)\.com\/[^\/]+$/,
    /^https?:\/\/(twitter|x)\.com\/[^\/]+\/with_replies$/,
    /^https?:\/\/(twitter|x)\.com\/[^\/]+\/media$/
  ],

  embedUrls: [
    /platform\.twitter\.com\/embed/,
    /twitframe\.com/
  ]
  ```
- **📘 Pattern Description**: URL identification patterns for Twitter/X domains, tweets, profiles, and embeds.
- **🎯 Use Case Context**: Supports helper utilities that check whether a given URL belongs to Twitter/X and what kind of resource it represents.
- **⚠️ Notes**: Handles both "twitter.com" and "x.com" domains.

---

- **📄 File/Line**: `src/content/extractors/config/twitterSelectors.ts:260-277`
- **🔍 Code Snippet**:
  ```ts
  validTweetPatterns: [
    /\S+/,
  ],

  invalidContentIndicators: [
    /^\.{3,}$/, // Just dots
    /^-+$/,     // Just dashes
    /^loading/i,
    /^error/i,
    /unavailable/i
  ]
  ```
- **📘 Pattern Description**: Ensures extracted tweet text contains meaningful characters and filters obvious "loading" or error placeholders.
- **🎯 Use Case Context**: Part of Twitter extraction validation to discard blank or placeholder content.
- **⚠️ Notes**: Simple patterns that cover common cases.

---

- **📄 File/Line**: `src/content/analyzers/platformAnalyzer.ts:305-356`
- **🔍 Code Snippet** (excerpt):
  ```ts
  this.platformConfigs.set('twitter', {
    domainPatterns: [/twitter\.com/, /x\.com/],
    urlPatterns: [/\/status\/\d+/, /\/tweet\//],
    ...
  });

  this.platformConfigs.set('facebook', {
    domainPatterns: [/facebook\.com/, /fb\.com/],
    urlPatterns: [/\/posts\//, /\/photo\//, /\/video\//],
    ...
  });

  this.platformConfigs.set('instagram', {
    domainPatterns: [/instagram\.com/],
    urlPatterns: [/\/p\//, /\/reel\//, /\/tv\//],
    ...
  });

  this.platformConfigs.set('youtube', {
    domainPatterns: [/youtube\.com/, /youtu\.be/],
    urlPatterns: [/\/watch\?v=/, /\/shorts\//, /\/embed\//],
    ...
  });
  ```
- **📘 Pattern Description**: Lists simple domain and URL regexes for recognizing major platforms.
- **🎯 Use Case Context**: Helps automatically detect which platform a page belongs to for routing to the correct extractor.
- **⚠️ Notes**: Patterns may need adjustments if platforms change URL structures.

---

- **📄 File/Line**: `src/testing/SentimentAnalyzer.ts:266-291`
- **🔍 Code Snippet**:
  ```ts
  this.platformNormalizations.forEach((replacement, pattern) => {
    const regex = new RegExp(`\\b${pattern}\\b`, 'g');
    normalized = normalized.replace(regex, replacement);
  });

  normalized = normalized.replace(/[!]{2,}/g, '!');
  normalized = normalized.replace(/[?]{2,}/g, '?');
  normalized = normalized.replace(/\s+/g, ' ');

  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  const emojis = content.match(emojiRegex) || [];
  const text = content.replace(emojiRegex, ' ').replace(/\s+/g, ' ').trim();
  ```
- **📘 Pattern Description**:
  - Dynamically builds word‑boundary regexes for replacing platform abbreviations (e.g., "w/" → "with").
  - `/[!]{2,}/g` and `/[?]{2,}/g` compress repeated punctuation.
  - `/\s+/g` collapses whitespace.
  - The long Unicode `emojiRegex` captures a wide range of emoji code points.
- **🎯 Use Case Context**: Normalizes social‑media text and extracts emojis for sentiment analysis.
- **⚠️ Notes**: Heavy Unicode range could be costly but necessary for emoji support.

---

- **📄 File/Line**: `src/testing/SentimentAnalyzer.ts:315-404`
- **🔍 Code Snippet**:
  ```ts
  const positiveWords = /\b(good|great|amazing|awesome|love|like|best|perfect|excellent|wonderful)\b/gi;
  const negativeWords = /\b(bad|terrible|awful|hate|worst|horrible|disgusting|annoying|stupid)\b/gi;
  ...
  const formalWords = /\b(however|therefore|furthermore|nevertheless|consequently)\b/gi;
  const casualWords = /\b(don't|won't|can't|shouldn't|wouldn't|it's|that's|what's)\b/gi;
  const topics = {
    'usability': /\b(easy|hard|difficult|simple|complex|intuitive|confusing|clear)\b/gi,
    'design': /\b(beautiful|ugly|pretty|aesthetic|clean|messy|style|theme|color)\b/gi,
    'performance': /\b(fast|slow|quick|laggy|smooth|responsive|glitchy|buggy)\b/gi,
    'content': /\b(interesting|boring|engaging|relevant|useful|helpful|informative)\b/gi,
    'overall': /\b(good|bad|great|terrible|love|hate|recommend|avoid)\b/gi
  };
  ```
- **📘 Pattern Description**: Multiple word‑list regexes capturing sentiment-bearing terms and stylistic cues.
- **🎯 Use Case Context**: Used by the SentimentAnalyzer to score text sentiment and authenticity, and to detect topic‑specific opinions.
- **⚠️ Notes**: Word lists may need updates to handle slang or new expressions.

---

**Summary**

Across the extractor and analyzer logic, regular expressions are primarily used for:

- Matching known clickbait or emotional phrases.
- Cleaning and normalizing text (whitespace, control characters, emojis).
- Parsing usernames, IDs, hashtags, mentions, dates, and numeric strings.
- Recognizing URL structures to determine content type or platform.
- Validating that extracted content is meaningful (not “loading…” etc.).
- Detecting sentiment or slang in user text.

Most patterns are relatively simple and domain‑specific, with occasional more complex expressions for things like emoji ranges or relative time formats. Overall the regex usage focuses on light validation and string parsing rather than heavy text processing. The patterns may require maintenance as platform formats evolve or new slang emerges.

