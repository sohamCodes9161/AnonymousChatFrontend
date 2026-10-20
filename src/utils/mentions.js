// @mention helpers. A mention is the literal text "@username" (usernames are
// unique and have no spaces); the server re-validates every mention, so
// nothing here is a trust boundary — it just keeps client and server rules
// in step.
const WORD = /[A-Za-z0-9_]/;

// The "@que" fragment being typed right before the caret, if any.
export function findActiveMention(text, caret) {
  let i = caret - 1;
  while (i >= 0 && WORD.test(text[i])) i -= 1;
  if (i < 0 || text[i] !== '@') return null;
  if (i > 0 && !/\s/.test(text[i - 1])) return null; // "foo@bar" is an email, not a mention
  return { start: i, query: text.slice(i + 1, caret) };
}

// Split text into plain and @username segments. `usernames` is a Set of
// lowercase usernames that really are members.
export function splitMentions(text, usernames) {
  if (!text || !usernames?.size) return [{ text: text || '', mention: null }];
  const parts = [];
  const re = /@([A-Za-z0-9_]+)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    const before = m.index > 0 ? text[m.index - 1] : '';
    if (before && !/\s/.test(before)) continue;
    if (!usernames.has(m[1].toLowerCase())) continue;
    if (m.index > last) parts.push({ text: text.slice(last, m.index), mention: null });
    parts.push({ text: m[0], mention: m[1].toLowerCase() });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), mention: null });
  return parts.length ? parts : [{ text, mention: null }];
}

// Ids of members whose @username appears in the text.
export function extractMentions(text, members) {
  const present = new Set(
    splitMentions(text, new Set(members.map((m) => m.username.toLowerCase())))
      .filter((p) => p.mention)
      .map((p) => p.mention)
  );
  return members.filter((m) => present.has(m.username.toLowerCase())).map((m) => m.id);
}
