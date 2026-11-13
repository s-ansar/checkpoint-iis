// Risk detector: IMPLEMENTED as simple pattern rules.
// Each rule marks lines that are likely to need a human check and gives a
// short reason plus one concrete thing to check (kept short on purpose).
// PLANNED: replace or extend with a model that predicts which lines people
// are likely to edit, returning the same {line, level, reason, check} shape.

const RULES = [
  {
    id: "sql-concat",
    level: "high",
    test: line => /(SELECT|INSERT|UPDATE|DELETE)\b/i.test(line) && /["']\s*\+|\+\s*["']/.test(line),
    reason: "SQL is built by joining strings, so user input could change the query (SQL injection).",
    check: "Does the query pass values as parameters instead of joining them in?"
  },
  {
    id: "range-len-minus-one",
    level: "high",
    test: line => /range\(\s*len\([^)]*\)\s*-\s*1\s*\)/.test(line),
    reason: "The loop stops one item before the end (possible off-by-one).",
    check: "Should the last item be included?"
  },
  {
    id: "divide-by-len",
    level: "medium",
    test: line => /\/\s*len\(/.test(line),
    reason: "Divides by a length, which crashes if the list is empty.",
    check: "What happens when the input is empty?"
  },
  {
    id: "weak-hash",
    level: "high",
    test: line => /\b(md5|sha1)\b/i.test(line),
    reason: "MD5 and SHA-1 are fast hashes that are unsafe for passwords.",
    check: "Is a slow, salted password hash used (e.g. bcrypt or scrypt)?"
  },
  {
    id: "eval",
    level: "high",
    test: line => /\beval\(/.test(line),
    reason: "eval runs any text as code.",
    check: "Can the input ever come from a user?"
  },
  {
    id: "bare-except",
    level: "medium",
    test: line => /except\s*:/.test(line),
    reason: "A bare except hides every error, including bugs.",
    check: "Which specific error should be caught here?"
  }
];

// sensitivity: "fewer" shows high-risk flags only, "more" also shows medium.
function detectRisks(codeLines, sensitivity) {
  const flags = [];
  codeLines.forEach((text, i) => {
    RULES.forEach(rule => {
      if (rule.test(text)) {
        if (sensitivity === "fewer" && rule.level !== "high") return;
        flags.push({ line: i + 1, level: rule.level, ruleId: rule.id, reason: rule.reason, check: rule.check });
      }
    });
  });
  return flags;
}
