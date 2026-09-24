import type { LessonContent, LectureSlideData, MCQItem, VisualAidData } from "./types";

// Builds the maths modules' tests right here in the browser, so they appear
// the moment the student presses Start (no AI call to wait for). Every
// question is computed, so its answer, steps and explanation are always
// correct, and each generator is pinned to one grade's syllabus range
// (CBSE/NCERT and AP State Board), getting harder through the test but never
// dipping into another grade's level.

// 0 = easier, 1 = middle, 2 = hardest — all within the chosen grade.
type Band = 0 | 1 | 2;

interface Draft {
  label: string;
  question: string;
  answer: string;
  distractors: string[];
  understand: string;
  steps: string[];
  explanation: string;
  trick: string;
  visual?: VisualAidData;
}

type Generator = (grade: number, band: Band) => Draft;

// ---------- helpers ----------

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(items: T[]): T => items[rand(0, items.length - 1)];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const NAMES = ["Ravi", "Priya", "Anjali", "Arjun", "Meena", "Kiran", "Sita", "Rahul", "Lakshmi", "Vijay", "Divya", "Suresh", "Asha", "Imran", "Neha", "Gopal"];
const ITEMS = ["mangoes", "pencils", "marbles", "balloons", "books", "toffees", "flowers", "stickers", "bangles", "laddoos", "shells", "crayons"];
const PLACES = ["ones", "tens", "hundreds", "thousands", "ten thousands", "lakhs", "ten lakhs"];

const fmt = (n: number) => (n >= 1000 ? n.toLocaleString("en-IN") : String(n));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const digitsOf = (n: number) => String(n).split("").reverse().map(Number);
const withDigits = (d: number) => rand(10 ** (d - 1), 10 ** d - 1);

function numberDistractors(correct: number, likely: number[], format: (n: number) => string = fmt): string[] {
  const candidates = [...likely, correct + 1, correct - 1, correct + 10, correct - 10, correct + 2, correct + 100, correct - 100];
  const out: string[] = [];
  for (const value of candidates) {
    if (value < 0 || value === correct || !Number.isInteger(value)) continue;
    const text = format(value);
    if (!out.includes(text)) out.push(text);
    if (out.length === 3) break;
  }
  return out;
}

// Two numbers with the given digit counts whose column sums never reach 10.
function noCarryPair(digitsA: number, digitsB: number): [number, number] {
  let a = "";
  let b = "";
  for (let i = 0; i < Math.max(digitsA, digitsB); i++) {
    const first = i === digitsA - 1;
    const x = i < digitsA ? rand(first ? 1 : 0, 8) : 0;
    const maxY = 9 - x;
    const y = i < digitsB ? rand(i === digitsB - 1 ? Math.min(1, maxY) : 0, maxY) : 0;
    if (i < digitsA) a = x + a;
    if (i < digitsB) b = y + b;
  }
  return [Number(a), Number(b)];
}

function hasCarry(a: number, b: number): boolean {
  const da = digitsOf(a);
  const db = digitsOf(b);
  return da.some((x, i) => x + (db[i] ?? 0) >= 10);
}

function hasBorrow(a: number, b: number): boolean {
  const da = digitsOf(a);
  const db = digitsOf(b);
  return db.some((y, i) => (da[i] ?? 0) < y);
}

function retry<T>(make: () => T, ok: (value: T) => boolean): T {
  for (let i = 0; i < 80; i++) {
    const value = make();
    if (ok(value)) return value;
  }
  return make();
}

// ---------- addition ----------

function additionSteps(a: number, b: number): string[] {
  const da = digitsOf(a);
  const db = digitsOf(b);
  const columns = Math.max(da.length, db.length);
  const steps: string[] = [`Write ${fmt(a)} and ${fmt(b)} one below the other, lining up the ones.`];
  let carry = 0;
  for (let i = 0; i < columns; i++) {
    const x = da[i] ?? 0;
    const y = db[i] ?? 0;
    const sum = x + y + carry;
    const parts = carry ? `${x} + ${y} + 1 carried` : `${x} + ${y}`;
    if (sum >= 10 && i < columns - 1) {
      steps.push(`${cap(PLACES[i])}: ${parts} = ${sum}. Write ${sum % 10} and carry 1 to the ${PLACES[i + 1]}.`);
    } else {
      steps.push(`${cap(PLACES[i])}: ${parts} = ${sum}. Write ${sum}.`);
    }
    carry = sum >= 10 ? 1 : 0;
  }
  return steps;
}

function noCarrySum(a: number, b: number): number {
  const da = digitsOf(a);
  const db = digitsOf(b);
  const out = Array.from({ length: Math.max(da.length, db.length) }, (_, i) => ((da[i] ?? 0) + (db[i] ?? 0)) % 10);
  return Number(out.reverse().join(""));
}

const additionRanges: Record<number, Array<() => [number, number]>> = {
  1: [
    () => [rand(1, 5), rand(1, 5)],
    () => retry(() => [rand(5, 10), rand(3, 9)] as [number, number], ([a, b]) => a + b >= 10 && a + b <= 20),
    () => noCarryPair(2, 1),
  ],
  2: [
    () => noCarryPair(2, 2),
    () => retry(() => [withDigits(2), withDigits(2)] as [number, number], ([a, b]) => hasCarry(a, b) && a + b < 100),
    () => retry(() => [withDigits(3), withDigits(2)] as [number, number], ([a, b]) => hasCarry(a, b) && a + b <= 999),
  ],
  3: [
    () => noCarryPair(3, 3),
    () => retry(() => [withDigits(3), withDigits(3)] as [number, number], ([a, b]) => hasCarry(a, b) && a + b <= 999),
    () => retry(() => [withDigits(4), withDigits(3)] as [number, number], ([a, b]) => hasCarry(a, b) && a + b <= 9999),
  ],
  4: [
    () => [withDigits(4), withDigits(3)],
    () => retry(() => [withDigits(4), withDigits(4)] as [number, number], ([a, b]) => hasCarry(a, b) && a + b <= 99999),
    () => [withDigits(5), withDigits(4)],
  ],
  5: [
    () => [withDigits(5), withDigits(5)],
    () => [withDigits(6), withDigits(5)],
    () => retry(() => [withDigits(6), withDigits(6)] as [number, number], ([a, b]) => a + b <= 9999999),
  ],
};

const addition: Generator = (grade, band) => {
  const [a, b] = additionRanges[grade][band]();
  const sum = a + b;
  const name = pick(NAMES);
  const item = pick(ITEMS);
  const format = grade >= 3 && band === 2 && Math.random() < 0.5 ? "money" : pick(["plain", "plain", "word", "sum-of"]);
  const money = (n: number) => `₹${fmt(n)}`;

  let question = `What is ${fmt(a)} + ${fmt(b)}?`;
  if (format === "word") question = `${name} has ${fmt(a)} ${item}. ${name} gets ${fmt(b)} more. How many ${item} does ${name} have now?`;
  if (format === "sum-of") question = `Find the sum of ${fmt(a)} and ${fmt(b)}.`;
  if (format === "money") question = `${name} spends ${money(a)} on a school bag and ${money(b)} on books. How much money is spent in all?`;
  const show = format === "money" ? money : fmt;

  if (grade === 1 && sum <= 20) {
    const big = Math.max(a, b);
    const small = Math.min(a, b);
    const counts = Array.from({ length: small }, (_, i) => big + i + 1).join(", ");
    return {
      label: "Addition",
      question,
      answer: show(sum),
      distractors: numberDistractors(sum, [sum - 1, sum + 1, sum + 2], show),
      understand: `We need to put ${a} and ${b} together and find how many there are in all.`,
      steps: [`Start with the bigger number, ${big}.`, `Count on ${small} more: ${counts}.`, `We stop at ${sum}.`],
      explanation: `${a} + ${b} = ${sum}, so the answer is ${sum}.`,
      trick: "Always start from the bigger number and count on the smaller one — it's faster!",
      visual: { type: "number_line", param1: big, param2: sum, param3: 0, label: "" },
    };
  }

  return {
    label: hasCarry(a, b) ? "Addition with Carrying" : "Addition",
    question,
    answer: show(sum),
    distractors: numberDistractors(sum, [noCarrySum(a, b), sum + 10, sum - 1], show),
    understand: `We need to add ${fmt(a)} and ${fmt(b)} to find the total.`,
    steps: [...additionSteps(a, b), `So, ${fmt(a)} + ${fmt(b)} = ${fmt(sum)}.`],
    explanation: `Adding column by column from the ones place gives ${fmt(sum)}.`,
    trick: hasCarry(a, b)
      ? "When a column adds up to 10 or more, write the ones digit and carry 1 to the next column."
      : "Line up the digits by place value and add from the ones place first.",
    visual: { type: "column", param1: a, param2: b, param3: 1, label: "" },
  };
};

// ---------- subtraction ----------

function subtractionSteps(a: number, b: number): string[] {
  const da = digitsOf(a);
  const db = digitsOf(b);
  const steps: string[] = [`Write ${fmt(a)} on top and ${fmt(b)} below it, lining up the ones.`];
  let borrowed = 0;
  for (let i = 0; i < da.length; i++) {
    const y = db[i] ?? 0;
    let top = da[i] - borrowed;
    // Leading digit used up by borrowing — nothing left to write.
    if (i === da.length - 1 && i >= db.length && top === 0) break;
    const note = borrowed ? ` (it lent 1, so it is now ${top})` : "";
    if (top < 0) {
      top += 10;
      steps.push(`${cap(PLACES[i])}: this digit is 0 and has lent 1, so it borrows from the ${PLACES[i + 1]} and becomes 9: 9 − ${y} = ${9 - y}.`);
      borrowed = 1;
    } else if (top < y) {
      top += 10;
      steps.push(`${cap(PLACES[i])}: the top digit${note} is smaller than ${y}, so borrow 1 from the ${PLACES[i + 1]}: ${top} − ${y} = ${top - y}.`);
      borrowed = 1;
    } else {
      steps.push(`${cap(PLACES[i])}:${borrowed ? ` this digit lent 1, so it is now ${top}.` : ""} ${top} − ${y} = ${top - y}.`);
      borrowed = 0;
    }
  }
  return steps;
}

function borrowMistake(a: number, b: number): number {
  const da = digitsOf(a);
  const db = digitsOf(b);
  return Number(da.map((x, i) => Math.abs(x - (db[i] ?? 0))).reverse().join(""));
}

const subtractionRanges: Record<number, Array<() => [number, number]>> = {
  1: [
    () => retry(() => [rand(3, 10), rand(1, 5)] as [number, number], ([a, b]) => a > b),
    () => [rand(11, 20), rand(2, 9)],
    () => retry(() => [withDigits(2), rand(1, 9)] as [number, number], ([a, b]) => !hasBorrow(a, b)),
  ],
  2: [
    () => retry(() => [withDigits(2), withDigits(2)] as [number, number], ([a, b]) => a > b && !hasBorrow(a, b)),
    () => retry(() => [withDigits(2), withDigits(2)] as [number, number], ([a, b]) => a > b && hasBorrow(a, b)),
    () => retry(() => [withDigits(3), withDigits(2)] as [number, number], ([a, b]) => hasBorrow(a, b)),
  ],
  3: [
    () => retry(() => [withDigits(3), withDigits(3)] as [number, number], ([a, b]) => a > b && !hasBorrow(a, b)),
    () => retry(() => [withDigits(3), withDigits(3)] as [number, number], ([a, b]) => a > b && hasBorrow(a, b)),
    () => retry(() => [withDigits(4), withDigits(3)] as [number, number], ([a, b]) => hasBorrow(a, b)),
  ],
  4: [
    () => retry(() => [withDigits(4), withDigits(3)] as [number, number], ([a, b]) => hasBorrow(a, b)),
    () => retry(() => [withDigits(4), withDigits(4)] as [number, number], ([a, b]) => a > b && hasBorrow(a, b)),
    () => retry(() => [withDigits(5), withDigits(4)] as [number, number], ([a, b]) => hasBorrow(a, b)),
  ],
  5: [
    () => retry(() => [withDigits(5), withDigits(5)] as [number, number], ([a, b]) => a > b),
    () => retry(() => [withDigits(6), withDigits(5)] as [number, number], ([a, b]) => hasBorrow(a, b)),
    () => retry(() => [withDigits(6), withDigits(6)] as [number, number], ([a, b]) => a > b && hasBorrow(a, b)),
  ],
};

const subtraction: Generator = (grade, band) => {
  const [a, b] = subtractionRanges[grade][band]();
  const diff = a - b;
  const name = pick(NAMES);
  const item = pick(ITEMS);
  const format = grade >= 3 && band === 2 && Math.random() < 0.5 ? "money" : pick(["plain", "plain", "word", "difference"]);
  const money = (n: number) => `₹${fmt(n)}`;

  let question = `What is ${fmt(a)} − ${fmt(b)}?`;
  if (format === "word") question = `${name} had ${fmt(a)} ${item} and gave away ${fmt(b)}. How many ${item} are left?`;
  if (format === "difference") question = `What is the difference between ${fmt(a)} and ${fmt(b)}?`;
  if (format === "money") question = `${name} had ${money(a)} and spent ${money(b)}. How much money is left?`;
  const show = format === "money" ? money : fmt;

  if (grade === 1 && a <= 20) {
    const counts = Array.from({ length: b }, (_, i) => a - i - 1).join(", ");
    return {
      label: "Subtraction",
      question,
      answer: show(diff),
      distractors: numberDistractors(diff, [a + b, diff + 1, diff - 1], show),
      understand: `We start with ${a} and take away ${b}. We need to find how many are left.`,
      steps: [`Start at ${a}.`, `Count back ${b}: ${counts}.`, `We stop at ${diff}.`],
      explanation: `${a} − ${b} = ${diff}, so ${diff} are left.`,
      trick: "To take away, start at the bigger number and count backwards.",
      visual: { type: "number_line", param1: a, param2: diff, param3: 0, label: "" },
    };
  }

  const borrow = hasBorrow(a, b);
  return {
    label: borrow ? "Subtraction with Borrowing" : "Subtraction",
    question,
    answer: show(diff),
    distractors: numberDistractors(diff, [borrow ? borrowMistake(a, b) : diff + 10, diff - 10, diff + 1], show),
    understand: `We need to take ${fmt(b)} away from ${fmt(a)} and find what is left.`,
    steps: [...subtractionSteps(a, b), `So, ${fmt(a)} − ${fmt(b)} = ${fmt(diff)}.`],
    explanation: `Subtracting column by column from the ones place gives ${fmt(diff)}. Check: ${fmt(diff)} + ${fmt(b)} = ${fmt(a)}.`,
    trick: borrow
      ? "If the top digit is smaller, borrow 1 from the next column — it becomes 10 more."
      : "Check your answer by adding it back: answer + smaller number = bigger number.",
    visual: { type: "column", param1: a, param2: b, param3: 2, label: "" },
  };
};

// ---------- multiplication ----------

function multiplicationSteps(a: number, b: number): string[] {
  if (b < 10) {
    const parts = digitsOf(a)
      .map((d, i) => d * 10 ** i)
      .filter((p) => p > 0)
      .reverse();
    if (parts.length === 1) return [`${fmt(a)} × ${b} = ${fmt(a * b)}.`];
    return [
      `Break ${fmt(a)} into ${parts.map(fmt).join(" + ")}.`,
      ...parts.map((p) => `${fmt(p)} × ${b} = ${fmt(p * b)}.`),
      `Add them: ${parts.map((p) => fmt(p * b)).join(" + ")} = ${fmt(a * b)}.`,
    ];
  }
  const parts = digitsOf(b)
    .map((d, i) => d * 10 ** i)
    .filter((p) => p > 0)
    .reverse();
  return [
    `Break ${fmt(b)} into ${parts.map(fmt).join(" + ")}.`,
    ...parts.map((p) => `${fmt(a)} × ${fmt(p)} = ${fmt(a * p)}.`),
    `Add them: ${parts.map((p) => fmt(a * p)).join(" + ")} = ${fmt(a * b)}.`,
  ];
}

const multiplicationRanges: Record<number, Array<() => [number, number]>> = {
  2: [() => [pick([2, 5, 10]), rand(1, 10)], () => [pick([3, 4]), rand(1, 10)], () => [pick([2, 3, 4, 5, 10]), rand(6, 10)]],
  3: [
    () => [rand(6, 10), rand(2, 10)],
    () => retry(() => [withDigits(2), rand(2, 4)] as [number, number], ([a, b]) => (a % 10) * b < 10),
    () => retry(() => [withDigits(2), rand(3, 9)] as [number, number], ([a, b]) => (a % 10) * b >= 10),
  ],
  4: [() => [withDigits(3), rand(2, 9)], () => [withDigits(2), withDigits(2)], () => [withDigits(3), withDigits(2)]],
  5: [() => [withDigits(3), withDigits(2)], () => [withDigits(4), withDigits(2)], () => [withDigits(3), withDigits(3)]],
};

const multiplication: Generator = (grade, band) => {
  const item = pick(ITEMS);

  if (grade === 1) {
    const groups = band === 0 ? rand(2, 3) : band === 1 ? rand(2, 4) : rand(3, 5);
    const each = band === 0 ? rand(1, 6) : rand(2, 6);
    const total = groups * each;
    const container = pick(["plates", "baskets", "boxes", "bags"]);
    return {
      label: "Groups of Things",
      question: pick([
        `There are ${groups} ${container}. Each has ${each} ${item}. How many ${item} are there in all?`,
        `How many are ${groups} groups of ${each}?`,
      ]),
      answer: String(total),
      distractors: numberDistractors(total, [groups + each, total + each, total - each]),
      understand: `We have ${groups} equal groups, with ${each} in each group. We need to count all of them together.`,
      steps: [`Each group has ${each}.`, `Add ${each} for every group: ${Array(groups).fill(each).join(" + ")}.`, `That makes ${total}.`],
      explanation: `${groups} groups of ${each} make ${total}.`,
      trick: "Equal groups can be counted quickly by adding the same number again and again.",
      visual: { type: "groups", param1: groups, param2: each, param3: 0, label: "" },
    };
  }

  const [a, b] = multiplicationRanges[grade][band]();
  const product = a * b;
  const format = grade >= 4 && band === 2 && Math.random() < 0.5 ? "money" : pick(["plain", "plain", "word", "product"]);
  const money = (n: number) => `₹${fmt(n)}`;
  let question = `What is ${fmt(a)} × ${fmt(b)}?`;
  if (format === "word") question = `There are ${fmt(b)} boxes with ${fmt(a)} ${item} in each box. How many ${item} are there in all?`;
  if (format === "product") question = `Find the product of ${fmt(a)} and ${fmt(b)}.`;
  if (format === "money") question = `One school bag costs ${money(a)}. What is the cost of ${fmt(b)} such bags?`;
  const show = format === "money" ? money : fmt;

  return {
    label: grade <= 2 ? "Multiplication Facts" : "Multiplication",
    question,
    answer: show(product),
    distractors: numberDistractors(product, [a * (b - 1), a * (b + 1), product + 10], show),
    understand:
      format === "word"
        ? `There are ${fmt(b)} equal groups of ${fmt(a)}, so we multiply ${fmt(a)} by ${fmt(b)}.`
        : `We need to multiply ${fmt(a)} by ${fmt(b)}.`,
    steps:
      grade === 2
        ? [`Count in ${a}s, ${b} times: ${Array.from({ length: b }, (_, i) => a * (i + 1)).join(", ")}.`, `So, ${a} × ${b} = ${product}.`]
        : [...multiplicationSteps(a, b), `So, ${fmt(a)} × ${fmt(b)} = ${fmt(product)}.`],
    explanation: `${fmt(a)} × ${fmt(b)} = ${fmt(product)}.`,
    trick:
      grade === 2
        ? `Multiplying by ${a} is the same as counting in ${a}s.`
        : "Break the bigger number into tens and ones, multiply each part, then add the answers.",
    visual:
      grade === 2 && a <= 5 && b <= 8
        ? { type: "groups", param1: b, param2: a, param3: 0, label: "" }
        : grade >= 3
          ? { type: "column", param1: a, param2: b, param3: 3, label: "" }
          : undefined,
  };
};

// ---------- division ----------

function longDivisionSteps(n: number, d: number): string[] {
  const digits = String(n).split("").map(Number);
  const steps: string[] = [];
  let current = 0;
  let started = false;
  for (let i = 0; i < digits.length; i++) {
    current = current * 10 + digits[i];
    if (!started && current < d && i < digits.length - 1) continue;
    started = true;
    const q = Math.floor(current / d);
    const r = current - q * d;
    steps.push(`${fmt(current)} ÷ ${d}: ${d} × ${q} = ${fmt(q * d)}, leaving ${r}.${i < digits.length - 1 ? " Bring down the next digit." : ""}`);
    current = r;
  }
  return steps;
}

const division: Generator = (grade, band) => {
  const name = pick(NAMES);
  const item = pick(ITEMS);

  if (grade === 1) {
    const groups = band === 0 ? rand(2, 3) : band === 1 ? rand(2, 4) : rand(3, 5);
    const each = band === 0 ? rand(1, 5) : rand(3, 6);
    const total = groups * each;
    return {
      label: "Equal Sharing",
      question: `Share ${total} ${item} equally between ${groups} children. How many does each child get?`,
      answer: String(each),
      distractors: numberDistractors(each, [total, each + 1, each - 1, total - groups]),
      understand: `We have ${total} ${item} to share fairly, so that all ${groups} children get the same number.`,
      steps: [`Give 1 to each child, again and again.`, `After sharing all ${total}, each child has ${each}.`, `Check: ${Array(groups).fill(each).join(" + ")} = ${total}.`],
      explanation: `${total} shared equally between ${groups} is ${each} each.`,
      trick: "Sharing equally means everyone gets the same — hand them out one at a time.",
      visual: { type: "groups", param1: groups, param2: each, param3: 0, label: "" },
    };
  }

  const exactRanges: Record<number, Array<() => [number, number] | null>> = {
    2: [() => [pick([2, 5, 10]), rand(1, 10)], () => [pick([3, 4]), rand(1, 10)], () => [pick([2, 3, 4, 5, 10]), rand(5, 10)]],
    3: [() => [rand(6, 10), rand(2, 10)], () => null, () => retry(() => [rand(2, 5), rand(11, 30)] as [number, number], ([d, q]) => d * q < 100)],
    4: [() => [rand(2, 9), rand(11, 30)], () => retry(() => [rand(2, 9), rand(12, 199)] as [number, number], ([d, q]) => d * q >= 100 && d * q <= 999), () => null],
    5: [() => retry(() => [rand(3, 9), rand(20, 199)] as [number, number], ([d, q]) => d * q >= 100 && d * q <= 999), () => retry(() => [rand(2, 9), rand(120, 1999)] as [number, number], ([d, q]) => d * q >= 1000 && d * q <= 9999), () => [rand(11, 25), rand(11, 40)]],
  };
  const exact = exactRanges[grade][band]();

  if (!exact) {
    // Division with a remainder (grade 3 middle band, grade 4 hardest band).
    const d = grade === 3 ? rand(3, 9) : rand(3, 9);
    const q = grade === 3 ? rand(2, 9) : rand(12, 99);
    const r = rand(1, d - 1);
    const n = d * q + r;
    const answer = `${q} remainder ${r}`;
    return {
      label: "Division with Remainder",
      question: pick([`What is ${fmt(n)} ÷ ${d}?`, `${name} shares ${fmt(n)} ${item} equally among ${d} friends. How many does each friend get, and how many are left over?`]),
      answer,
      distractors: [`${q + 1} remainder ${r}`, `${q} remainder ${r + 1 < d ? r + 1 : r - 1}`, `${q - 1} remainder ${r}`].filter((o) => o !== answer),
      understand: `We need to split ${fmt(n)} into ${d} equal groups. It won't split exactly, so some will be left over.`,
      steps: [...(grade === 3 ? [`Find the biggest number in the table of ${d} that is not more than ${n}: ${d} × ${q} = ${d * q}.`, `Left over: ${n} − ${d * q} = ${r}.`] : longDivisionSteps(n, d)), `So, ${fmt(n)} ÷ ${d} = ${q} remainder ${r}.`],
      explanation: `${d} × ${q} = ${fmt(d * q)}, and ${r} is left over, so the answer is ${q} remainder ${r}.`,
      trick: "The remainder must always be smaller than the number you divide by.",
    };
  }

  const [d, q] = exact;
  const n = d * q;
  const small = grade <= 3 && q <= 10;
  return {
    label: small ? "Division Facts" : "Long Division",
    question: pick([
      `What is ${fmt(n)} ÷ ${d}?`,
      `${fmt(n)} ${item} are packed equally into ${d} bags. How many ${item} go in each bag?`,
      `Divide ${fmt(n)} by ${d}.`,
    ]),
    answer: fmt(q),
    distractors: numberDistractors(q, [q + 1, q - 1, q * 10, q + 10]),
    understand: `We need to split ${fmt(n)} into ${d} equal parts and find the size of each part.`,
    steps: small
      ? [`Think of the table of ${d}.`, `${d} × ${q} = ${n}.`, `So, ${n} ÷ ${d} = ${q}.`]
      : [...longDivisionSteps(n, d), `So, ${fmt(n)} ÷ ${d} = ${fmt(q)}. Check: ${d} × ${fmt(q)} = ${fmt(n)}.`],
    explanation: `${d} × ${fmt(q)} = ${fmt(n)}, so ${fmt(n)} ÷ ${d} = ${fmt(q)}.`,
    trick: "Division is multiplication backwards — ask: which number times the divisor gives the total?",
    visual: small && d <= 6 && q <= 8 ? { type: "groups", param1: d, param2: q, param3: 0, label: "" } : undefined,
  };
};

// ---------- multiplication tables ----------

const TABLE_RANGE: Record<number, [number[], number]> = {
  2: [[2, 3, 4, 5, 10], 10],
  3: [[6, 7, 8, 9, 10], 10],
  4: [[11, 12, 13, 14, 15], 10],
  5: [[12, 13, 14, 15, 16, 17, 18, 19, 20], 10],
};

function tableSteps(n: number, m: number): string[] {
  if (n <= 10) {
    return [`Count in ${n}s, ${m} times: ${Array.from({ length: m }, (_, i) => n * (i + 1)).join(", ")}.`, `So, ${n} × ${m} = ${n * m}.`];
  }
  return [
    `Break ${n} into 10 + ${n - 10}.`,
    `10 × ${m} = ${10 * m} and ${n - 10} × ${m} = ${(n - 10) * m}.`,
    `Add them: ${10 * m} + ${(n - 10) * m} = ${n * m}.`,
  ];
}

const tables: Generator = (grade, band) => {
  if (grade === 1) {
    const step = pick([2, 5, 10]);
    if (band === 2) {
      const m = rand(2, 5);
      return {
        label: "Tables of 2, 5 and 10",
        question: `What is ${step} × ${m}?`,
        answer: String(step * m),
        distractors: numberDistractors(step * m, [step + m, step * (m + 1), step * (m - 1)]),
        understand: `${step} × ${m} means ${m} groups of ${step}.`,
        steps: tableSteps(step, m),
        explanation: `${step} × ${m} = ${step * m}.`,
        trick: `Counting in ${step}s gives the table of ${step}.`,
        visual: step === 2 ? { type: "groups", param1: m, param2: 2, param3: 0, label: "" } : undefined,
      };
    }
    const start = rand(band === 0 ? 0 : 3, band === 0 ? 3 : 6);
    const seq = [1, 2, 3].map((i) => step * (start + i));
    const next = step * (start + 4);
    return {
      label: `Counting in ${step}s`,
      question: `Count in ${step}s: ${seq.join(", ")}, ___. What comes next?`,
      answer: String(next),
      distractors: numberDistractors(next, [seq[2] + 1, next + step, seq[2]]),
      understand: `Each number is ${step} more than the one before it. We need the next one.`,
      steps: [`The numbers go up by ${step} each time.`, `The last number is ${seq[2]}.`, `${seq[2]} + ${step} = ${next}.`],
      explanation: `Adding ${step} to ${seq[2]} gives ${next}.`,
      trick: step === 10 ? "Counting in 10s, only the tens digit goes up by 1." : step === 5 ? "Counting in 5s, the numbers end in 5 or 0." : "Counting in 2s, the numbers are all even.",
      visual: { type: "number_line", param1: seq[2], param2: next, param3: 0, label: "" },
    };
  }

  const [list, maxM] = TABLE_RANGE[grade];
  const n = pick(list);
  const m = band === 0 ? rand(1, 5) : rand(6, maxM);
  const product = n * m;

  if (band === 2) {
    const missing = rand(3, maxM);
    const total = n * missing;
    return {
      label: "Missing Number",
      question: `${n} × ___ = ${total}. What is the missing number?`,
      answer: String(missing),
      distractors: numberDistractors(missing, [missing + 1, missing - 1, total - n]),
      understand: `We need the number that, multiplied by ${n}, gives ${total}.`,
      steps: [`Say the table of ${n} until you reach ${total}.`, ...tableSteps(n, missing).slice(-1), `So, the missing number is ${missing}.`],
      explanation: `${n} × ${missing} = ${total}, so the missing number is ${missing}.`,
      trick: `A missing number in a multiplication is a division: ${total} ÷ ${n} = ${missing}.`,
    };
  }

  return {
    label: `Table of ${n}`,
    question: pick([`What is ${n} × ${m}?`, `In the table of ${n}, what is ${n} × ${m}?`, `What is ${m} times ${n}?`]),
    answer: String(product),
    distractors: numberDistractors(product, [n * (m + 1), n * (m - 1), product + 1]),
    understand: `We need the answer to ${n} × ${m} from the table of ${n}.`,
    steps: tableSteps(n, m),
    explanation: `${n} × ${m} = ${product}.`,
    trick: n > 10 ? `For big tables, split ${n} into 10 and ${n - 10}, multiply both, then add.` : `Each step in the table of ${n} adds ${n} more.`,
  };
};

// ---------- area and perimeter ----------

const SHAPES: Array<[string, number]> = [["triangle", 3], ["square", 4], ["rectangle", 4], ["circle", 0]];

const areaPerimeter: Generator = (grade, band) => {
  if (grade === 1) {
    if (band === 0) {
      const [shape, sides] = pick(SHAPES);
      const what = pick(["sides", "corners"]);
      return {
        label: "Shapes",
        question: `How many ${what} does a ${shape} have?`,
        answer: String(sides),
        distractors: numberDistractors(sides, [sides + 1, sides - 1, sides + 2, 5]),
        understand: `We need to count the ${what} of a ${shape}.`,
        steps: shape === "circle" ? ["A circle is round.", `It has no straight sides and no corners, so the answer is 0.`] : [`Draw a ${shape}.`, `Count each ${what === "sides" ? "straight side" : "corner"}: ${Array.from({ length: sides }, (_, i) => i + 1).join(", ")}.`, `A ${shape} has ${sides} ${what}.`],
        explanation: `A ${shape} has ${sides} ${what}.`,
        trick: "Touch each side or corner with your finger as you count, so you don't miss any.",
      };
    }
    if (band === 1) {
      const rows = rand(2, 4);
      const cols = rand(2, 4);
      return {
        label: "Counting Squares",
        question: `A shape is made of ${rows} rows of squares, with ${cols} squares in each row. How many squares are there in all?`,
        answer: String(rows * cols),
        distractors: numberDistractors(rows * cols, [rows + cols, rows * cols + 1, rows * cols - 1]),
        understand: `We need to count every small square in the shape.`,
        steps: [`Each row has ${cols} squares.`, `Add a row at a time: ${Array(rows).fill(cols).join(" + ")}.`, `That makes ${rows * cols} squares.`],
        explanation: `${rows} rows of ${cols} squares make ${rows * cols} squares.`,
        trick: "Count one row, then keep adding the same number for each row.",
        visual: { type: "rectangle", param1: cols, param2: rows, param3: 1, label: "" },
      };
    }
    const [s1, n1] = pick(SHAPES.slice(0, 3));
    const [s2, n2] = pick(SHAPES.slice(0, 3));
    const shapes = s1 === s2 ? `2 ${s1 === "square" ? "squares" : s1 + "s"}` : `a ${s1} and a ${s2}`;
    return {
      label: "Sides of Shapes",
      question: `How many sides do ${shapes} have in all?`,
      answer: String(n1 + n2),
      distractors: numberDistractors(n1 + n2, [n1, n2, n1 + n2 + 1]),
      understand: `We count the sides of each shape, then add them together.`,
      steps: [`A ${s1} has ${n1} sides.`, `A ${s2} has ${n2} sides.`, `${n1} + ${n2} = ${n1 + n2}.`],
      explanation: `${n1} + ${n2} = ${n1 + n2} sides in all.`,
      trick: "Triangle means 3 — 'tri' means three, like a tricycle's 3 wheels!",
    };
  }

  const unit = grade >= 4 && Math.random() < 0.5 ? "m" : "cm";
  const rectangle = (l: number, w: number): VisualAidData => ({ type: "rectangle", param1: l, param2: w, param3: 0, label: unit });

  const perimeterOfRectangle = (l: number, w: number): Draft => ({
    label: "Perimeter",
    question: pick([`A rectangle is ${l} ${unit} long and ${w} ${unit} wide. What is its perimeter?`, `Find the perimeter of a rectangle with length ${l} ${unit} and breadth ${w} ${unit}.`]),
    answer: `${fmt(2 * (l + w))} ${unit}`,
    distractors: [l * w, l + w, 2 * (l + w) + 2].filter((v) => v !== 2 * (l + w)).map((v) => `${fmt(v)} ${unit}`),
    understand: "Perimeter is the distance all the way around the outside of the shape.",
    steps: [`A rectangle has 2 lengths and 2 breadths.`, `Add all four sides: ${l} + ${w} + ${l} + ${w}.`, `That is ${2 * (l + w)} ${unit}.`],
    explanation: `Perimeter = 2 × (${l} + ${w}) = ${2 * (l + w)} ${unit}.`,
    trick: "Perimeter of a rectangle = 2 × (length + breadth).",
    visual: rectangle(l, w),
  });

  const areaOfRectangle = (l: number, w: number): Draft => ({
    label: "Area",
    question: pick([`A rectangle is ${l} ${unit} long and ${w} ${unit} wide. What is its area?`, `A ${l === w ? "square" : "rectangular"} garden is ${l} ${unit} by ${w} ${unit}. How much space does it cover?`]),
    answer: `${fmt(l * w)} sq ${unit}`,
    distractors: [2 * (l + w), l + w, l * w + l].filter((v) => v !== l * w).map((v) => `${fmt(v)} sq ${unit}`),
    understand: "Area is the amount of flat space inside the shape, measured in square units.",
    steps: [`Area of a rectangle = length × breadth.`, `${l} × ${w} = ${fmt(l * w)}.`, `So the area is ${fmt(l * w)} square ${unit === "m" ? "metres" : "centimetres"}.`],
    explanation: `${l} × ${w} = ${fmt(l * w)} sq ${unit}.`,
    trick: "Area multiplies (length × breadth); perimeter adds all the sides.",
    visual: rectangle(l, w),
  });

  if (grade === 2) {
    if (band === 0) {
      const [a, b, c] = [rand(2, 9), rand(2, 9), rand(2, 9)];
      return {
        label: "Perimeter",
        question: `A triangle has sides of ${a} cm, ${b} cm and ${c} cm. What is the distance all around it?`,
        answer: `${a + b + c} cm`,
        distractors: [a + b, a + b + c + 1, a + b + c - 2].map((v) => `${v} cm`),
        understand: "The distance around a shape is found by adding the lengths of all its sides.",
        steps: [`Add the first two sides: ${a} + ${b} = ${a + b}.`, `Add the third side: ${a + b} + ${c} = ${a + b + c}.`, `The distance around is ${a + b + c} cm.`],
        explanation: `${a} + ${b} + ${c} = ${a + b + c} cm.`,
        trick: "Go around the shape with your finger and add each side as you pass it.",
      };
    }
    if (band === 1) {
      const s = rand(2, 10);
      return {
        label: "Perimeter of a Square",
        question: `Each side of a square is ${s} cm. What is the distance all around it?`,
        answer: `${4 * s} cm`,
        distractors: [s * s, 2 * s, 4 * s + 4].filter((v) => v !== 4 * s).map((v) => `${v} cm`),
        understand: "A square has 4 equal sides, and we need to add them all.",
        steps: [`All 4 sides are ${s} cm.`, `${s} + ${s} + ${s} + ${s} = ${4 * s}.`, `The distance around is ${4 * s} cm.`],
        explanation: `4 sides of ${s} cm make ${4 * s} cm.`,
        trick: "A square has 4 equal sides, so just multiply one side by 4.",
        visual: { type: "rectangle", param1: s, param2: s, param3: 0, label: "cm" },
      };
    }
    return perimeterOfRectangle(rand(3, 12), rand(2, 8));
  }

  if (grade === 3) {
    if (band === 0) return perimeterOfRectangle(rand(4, 15), rand(2, 10));
    if (band === 1) {
      const rows = rand(3, 8);
      const cols = rand(3, 8);
      return {
        label: "Area by Counting Squares",
        question: `A rectangle is covered by ${rows} rows of 1 cm squares, with ${cols} squares in each row. What is its area?`,
        answer: `${rows * cols} sq cm`,
        distractors: [2 * (rows + cols), rows + cols, rows * cols + cols].filter((v) => v !== rows * cols).map((v) => `${v} sq cm`),
        understand: "Area is the number of unit squares that cover the shape.",
        steps: [`Each row has ${cols} squares.`, `There are ${rows} rows: ${rows} × ${cols} = ${rows * cols}.`, `The area is ${rows * cols} square centimetres.`],
        explanation: `${rows} × ${cols} = ${rows * cols} squares, so the area is ${rows * cols} sq cm.`,
        trick: "Instead of counting every square, multiply the rows by the squares in one row.",
        visual: { type: "rectangle", param1: cols, param2: rows, param3: 1, label: "cm" },
      };
    }
    const s = rand(5, 25);
    return {
      ...perimeterOfRectangle(s, s),
      label: "Perimeter of a Square",
      question: `Each side of a square park is ${s} ${unit}. What is its perimeter?`,
      distractors: [s * s, 2 * s, 4 * s + 4].filter((v) => v !== 4 * s).map((v) => `${fmt(v)} ${unit}`),
      steps: [`A square has 4 equal sides of ${s} ${unit}.`, `4 × ${s} = ${4 * s}.`, `The perimeter is ${4 * s} ${unit}.`],
      explanation: `4 × ${s} = ${4 * s} ${unit}.`,
      trick: "Perimeter of a square = 4 × side.",
    };
  }

  if (grade === 4) {
    if (band === 0) return areaOfRectangle(rand(4, 20), rand(3, 12));
    if (band === 1) return perimeterOfRectangle(rand(10, 60), rand(5, 40));
    const s = rand(6, 25);
    return { ...areaOfRectangle(s, s), label: "Area of a Square", question: `Each side of a square tile is ${s} ${unit}. What is its area?`, trick: "Area of a square = side × side." };
  }

  // grade 5
  if (band === 0) return pick([areaOfRectangle, perimeterOfRectangle])(rand(12, 60), rand(8, 45));
  if (band === 1) {
    const l = rand(10, 50);
    const w = rand(5, 40);
    if (Math.random() < 0.5) {
      return {
        label: "Missing Side",
        question: `The perimeter of a rectangle is ${2 * (l + w)} ${unit} and its length is ${l} ${unit}. What is its breadth?`,
        answer: `${w} ${unit}`,
        distractors: [l + w, 2 * (l + w) - l, w + 2].filter((v) => v !== w).map((v) => `${v} ${unit}`),
        understand: "We know the distance all around and one side. We need to find the other side.",
        steps: [`Length + breadth = half the perimeter = ${2 * (l + w)} ÷ 2 = ${l + w}.`, `Breadth = ${l + w} − ${l} = ${w}.`, `So the breadth is ${w} ${unit}.`],
        explanation: `${2 * (l + w)} ÷ 2 = ${l + w}, and ${l + w} − ${l} = ${w} ${unit}.`,
        trick: "Half the perimeter of a rectangle is length + breadth.",
        visual: rectangle(l, w),
      };
    }
    return {
      label: "Missing Side",
      question: `The area of a rectangle is ${fmt(l * w)} sq ${unit} and its length is ${l} ${unit}. What is its breadth?`,
      answer: `${w} ${unit}`,
      distractors: [w + 1, w + 10, l * w - l].filter((v) => v !== w).map((v) => `${fmt(v)} ${unit}`),
      understand: "We know the area and one side. We need the other side.",
      steps: [`Area = length × breadth, so breadth = area ÷ length.`, `${fmt(l * w)} ÷ ${l} = ${w}.`, `So the breadth is ${w} ${unit}.`],
      explanation: `${fmt(l * w)} ÷ ${l} = ${w} ${unit}.`,
      trick: "If you know the area and one side, divide to find the other side.",
      visual: rectangle(l, w),
    };
  }
  const l = rand(15, 60);
  const w = rand(10, 40);
  const rate = pick([5, 10, 12, 15, 20, 25, 50]);
  const cost = 2 * (l + w) * rate;
  return {
    label: "Cost of Fencing",
    question: `A field is ${l} m long and ${w} m wide. Fencing costs ₹${rate} per metre. What is the cost of fencing the whole field?`,
    answer: `₹${fmt(cost)}`,
    distractors: [l * w * rate, (l + w) * rate, cost + rate].map((v) => `₹${fmt(v)}`),
    understand: "Fencing goes all around the field, so we first need the perimeter, then the cost.",
    steps: [`Perimeter = 2 × (${l} + ${w}) = ${2 * (l + w)} m.`, `Cost = ${2 * (l + w)} × ₹${rate} = ₹${fmt(cost)}.`, `So the fencing costs ₹${fmt(cost)}.`],
    explanation: `The perimeter is ${2 * (l + w)} m, and ${2 * (l + w)} × ₹${rate} = ₹${fmt(cost)}.`,
    trick: "Fence and border problems use perimeter; floor and carpet problems use area.",
    visual: { type: "rectangle", param1: l, param2: w, param3: 0, label: "m" },
  };
};

// ---------- lesson assembly ----------

const GENERATORS: Record<string, Generator> = {
  Addition: addition,
  Subtraction: subtraction,
  Multiplication: multiplication,
  Division: division,
  "Multiplication Tables": tables,
  "Area and Perimeter": areaPerimeter,
};

const MIXED = Object.values(GENERATORS);

export function isLocalMathTopic(topic: string): boolean {
  return topic in GENERATORS || topic.startsWith("Mixed Review: Addition");
}

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

// Two questions with the same numbers count as a repeat even if the wording
// or names differ ("What is 3 + 4?" vs "Ravi has 3 mangoes... 4 more").
export function questionKey(label: string, question: string): string {
  const numbers = question.match(/\d[\d,]*/g);
  return numbers ? `${normalize(label)}|${numbers.join(" ")}` : normalize(question);
}

function toMcq(draft: Draft, topic: string, number: number): MCQItem {
  // Pad with nearby numbers if a generator produced fewer than 3 distinct wrong answers.
  const wrong = [...new Set(draft.distractors.filter((d) => d !== draft.answer))];
  let bump = 3;
  while (wrong.length < 3) {
    const candidate = draft.answer.replace(/\d[\d,]*/, (m) => fmt(Number(m.replace(/,/g, "")) + bump++));
    if (candidate !== draft.answer && !wrong.includes(candidate)) wrong.push(candidate);
  }
  const options = shuffle([draft.answer, ...wrong.slice(0, 3)]);
  const letters = ["A", "B", "C", "D"];
  return {
    topic: draft.label || topic,
    question_number: number,
    question: draft.question,
    option_a: options[0],
    option_b: options[1],
    option_c: options[2],
    option_d: options[3],
    correct_answer: letters[options.indexOf(draft.answer)],
    explanation: draft.explanation,
    trick: draft.trick,
    visual: draft.visual ?? { type: "none", param1: 0, param2: 0, param3: 0, label: "" },
    question_explanation: draft.understand,
    solution_steps: draft.steps,
  };
}

// `avoid` holds questionKey()s from this student's earlier tests on the same
// topic and grade, so a new test doesn't repeat them.
export function buildLocalMathLesson(topic: string, grade: number, count: number, avoid: string[] = []): LessonContent {
  const avoidSet = new Set(avoid);
  const used = new Set<string>();
  const mcqs: MCQItem[] = [];

  for (let i = 0; i < count; i++) {
    const band = Math.min(2, Math.floor((3 * i) / count)) as Band;
    const generator = GENERATORS[topic] ?? MIXED[i % MIXED.length];
    let draft = generator(grade, band);
    for (let attempt = 0; attempt < 300; attempt++) {
      const key = questionKey(draft.label, draft.question);
      if (!used.has(key) && (attempt >= 100 || !avoidSet.has(key))) break;
      // This band has run out of fresh questions — borrow from the grade's
      // other bands rather than repeat one (still the same grade).
      draft = generator(grade, attempt < 40 ? band : (rand(0, 2) as Band));
    }
    used.add(questionKey(draft.label, draft.question));
    mcqs.push(toMcq(draft, topic, i + 1));
  }

  const first = mcqs[0];
  const none: VisualAidData = { type: "none", param1: 0, param2: 0, param3: 0, label: "" };
  const slides: LectureSlideData[] = [
    { title: `What is ${topic.startsWith("Mixed") ? "this review" : topic}?`, content: first.question_explanation ?? "", visual: none },
    { title: "Simple Trick", content: first.trick, visual: none },
    { title: "Example", content: `${first.question}\n${(first.solution_steps ?? []).join("\n")}`, visual: first.visual },
    { title: "Quick Recap", content: first.explanation, visual: none },
  ];

  return {
    topic,
    grade,
    concept_explanation: `Grade ${grade} practice on ${topic}.`,
    lecture_slides: slides,
    mcqs,
  };
}
