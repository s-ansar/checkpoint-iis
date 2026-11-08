// Task bank: each case is a coding task with a pre-scripted "AI suggestion".
// SIMULATED: these suggestions stand in for a live code model, so every
// participant sees the same code and the planted bugs are known in advance.
// bugLines lists the 1-based line numbers that contain a real defect.

const CASES = [
  {
    id: "sql-lookup",
    title: "Look up a user by username",
    task: "Write a function that returns the database row for a given username.",
    code: [
      "def get_user(conn, username):",
      "    query = \"SELECT * FROM users WHERE username = '\" + username + \"'\"",
      "    cursor = conn.cursor()",
      "    cursor.execute(query)",
      "    return cursor.fetchone()"
    ],
    bugLines: [2],
    bugNote: "Line 2 builds the SQL query by joining strings, so a crafted username can change the query (SQL injection). It should use a parameter: execute(\"... WHERE username = ?\", (username,))."
  },
  {
    id: "average",
    title: "Average of a list of scores",
    task: "Write a function that returns the average of a list of exam scores.",
    code: [
      "def average(scores):",
      "    total = 0",
      "    for i in range(len(scores) - 1):",
      "        total += scores[i]",
      "    return total / len(scores)"
    ],
    bugLines: [3, 5],
    bugNote: "Line 3 skips the last score (off-by-one). Line 5 crashes with ZeroDivisionError on an empty list."
  },
  {
    id: "leap-year",
    title: "Leap year check",
    task: "Write a function that returns True if a year is a leap year.",
    code: [
      "def is_leap_year(year):",
      "    if year % 400 == 0:",
      "        return True",
      "    if year % 100 == 0:",
      "        return False",
      "    return year % 4 == 0"
    ],
    bugLines: [],
    bugNote: "This suggestion is correct."
  },
  {
    id: "password-hash",
    title: "Store a password safely",
    task: "Write a function that hashes a password before it is saved.",
    code: [
      "import hashlib",
      "",
      "def hash_password(password):",
      "    return hashlib.md5(password.encode()).hexdigest()"
    ],
    bugLines: [4],
    bugNote: "Line 4 uses MD5 with no salt, which is fast to crack. A password hash such as bcrypt or hashlib.scrypt with a salt should be used."
  },
  {
    id: "discount",
    title: "Apply a percentage discount",
    task: "Write a function that applies a discount given as a percentage, e.g. 10 for 10%.",
    code: [
      "def apply_discount(price, percent):",
      "    return price - price * percent"
    ],
    bugLines: [2],
    bugNote: "Line 2 treats 10 as 1000%: percent must be divided by 100. No rule flags this, which shows that 'no highlight' does not mean 'no bug'."
  }
];
