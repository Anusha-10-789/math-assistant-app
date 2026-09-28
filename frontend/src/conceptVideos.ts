// Short animated concept videos, played in the browser (see
// components/ConceptVideoPlayer.tsx). Each scene's narration is spoken one
// sentence at a time, and the sentence being spoken is the scene's "beat" —
// the animation reveals its next part on each beat, so the picture moves in
// step with the voice.

export type SceneMotion = "grow" | "float" | "pulse" | "rise" | "fall" | "push" | "pull" | "chain";

export interface SceneFrame {
  items: string[];
  motion: SceneMotion;
  caption?: string;
}

export type ConceptAnim =
  // beat 0: first group, 1: second group joins, 2: merged with the total
  | { kind: "join"; a: number; b: number; item: string }
  // beat 0: all items, 1: some fly away, 2: what's left is counted
  | { kind: "takeaway"; total: number; remove: number; item: string }
  // beat 0: number line, 1: hops drawn one by one, 2: landing number
  | { kind: "hops"; start: number; step: number; count: number; direction: 1 | -1 }
  // beat 0: groups appear, 1: skip-count labels, 2: total
  | { kind: "groups"; groups: number; each: number; item: string }
  // beat 0: pile, 1: dealt out one at a time, 2: each share (and remainder)
  | { kind: "share"; total: number; groups: number; item: string }
  // one row of the table per ~beat, all rows by the last beat
  | { kind: "table"; n: number; upto: number }
  // beat 0: shape, 1: squares fill (area) or edge traced (perimeter), 2: formula
  | { kind: "area"; w: number; h: number; show: "area" | "perimeter" }
  // beat 0: the sum, 1: ones column (+ carry/borrow), 2: tens column
  | { kind: "column"; a: number; b: number; op: "+" | "-" | "×" }
  // one frame per beat (the last frame holds for any extra beats)
  | { kind: "scene"; frames: SceneFrame[] };

export interface ConceptScene {
  title: string;
  narration: string[];
  anim: ConceptAnim;
}

export interface ConceptVideo {
  id: string;
  topic: string;
  title: string;
  icon: string;
  scenes: ConceptScene[];
}

const f = (items: string[], motion: SceneMotion = "grow", caption?: string): SceneFrame => ({ items, motion, caption });

const VIDEOS: ConceptVideo[] = [
  // ---------- Mathematics ----------
  {
    id: "addition-together",
    topic: "Addition",
    title: "Adding Means Putting Together",
    icon: "🍎",
    scenes: [
      {
        title: "Two groups become one",
        narration: [
          "Riya has 3 apples.",
          "Her friend gives her 2 more apples.",
          "Put them together and count: 3 plus 2 makes 5 apples!",
        ],
        anim: { kind: "join", a: 3, b: 2, item: "🍎" },
      },
      {
        title: "Adding on a number line",
        narration: [
          "We can also add on a number line.",
          "Start at 4, then take 3 hops forward, one hop for each number we add.",
          "We land on 7, so 4 plus 3 equals 7.",
        ],
        anim: { kind: "hops", start: 4, step: 1, count: 3, direction: 1 },
      },
      {
        title: "Order doesn't matter",
        narration: [
          "Here is a secret: you can add in any order.",
          "5 plus 3 and 3 plus 5 both make 8.",
          "So start with the bigger number and count on. It is faster!",
        ],
        anim: {
          kind: "scene",
          frames: [f(["5", "➕", "3", "=", "8"]), f(["3", "➕", "5", "=", "8"]), f(["8", "➕", "1", "➕", "1", "➕", "1"], "chain", "Count on from the bigger number")],
        },
      },
    ],
  },
  {
    id: "addition-carrying",
    topic: "Addition",
    title: "Carrying in Addition",
    icon: "🧮",
    scenes: [
      {
        title: "Why do we carry?",
        narration: [
          "Look at these 12 ones.",
          "10 ones can be bundled together into 1 ten, leaving 2 ones.",
          "That bundle of ten is what we carry to the tens column.",
        ],
        anim: {
          kind: "scene",
          frames: [f(Array(12).fill("🟦"), "grow", "12 ones"), f(["🔟", "🟦", "🟦"], "grow", "1 ten and 2 ones"), f(["🔟", "➡️", "Tens"], "chain", "Carry the ten")],
        },
      },
      {
        title: "27 + 15 step by step",
        narration: [
          "To add 27 and 15, write them one below the other, ones under ones and tens under tens.",
          "First add the ones: 7 plus 5 is 12. Write 2 and carry 1 ten to the tens column.",
          "Now add the tens: 1 plus 2 plus 1 is 4. So 27 plus 15 equals 42.",
        ],
        anim: { kind: "column", a: 27, b: 15, op: "+" },
      },
    ],
  },
  {
    id: "subtraction-takeaway",
    topic: "Subtraction",
    title: "Subtraction Means Taking Away",
    icon: "🎈",
    scenes: [
      {
        title: "Balloons fly away",
        narration: [
          "There are 7 balloons at the party.",
          "Oops! 3 balloons fly away into the sky.",
          "Count what is left: 7 minus 3 leaves 4 balloons.",
        ],
        anim: { kind: "takeaway", total: 7, remove: 3, item: "🎈" },
      },
      {
        title: "Hopping backwards",
        narration: [
          "Subtraction on a number line means hopping backwards.",
          "Start at 9 and take 4 hops back.",
          "We land on 5, so 9 minus 4 equals 5.",
        ],
        anim: { kind: "hops", start: 9, step: 1, count: 4, direction: -1 },
      },
      {
        title: "Check with addition",
        narration: [
          "You can always check your answer by adding.",
          "If 9 minus 4 is 5, then 5 plus 4 must be 9.",
          "It is! So our answer is correct.",
        ],
        anim: {
          kind: "scene",
          frames: [f(["9", "➖", "4", "=", "5"]), f(["5", "➕", "4", "=", "9"]), f(["✅"], "pulse", "Correct!")],
        },
      },
    ],
  },
  {
    id: "subtraction-borrowing",
    topic: "Subtraction",
    title: "Borrowing in Subtraction",
    icon: "🔁",
    scenes: [
      {
        title: "Breaking a ten",
        narration: [
          "Borrowing means breaking one ten into ones.",
          "1 ten becomes 10 ones, so 2 ones become 12 ones.",
          "Now there are enough ones to take away 5.",
        ],
        anim: {
          kind: "scene",
          frames: [f(["🔟", "🟦", "🟦"], "grow", "1 ten and 2 ones"), f(Array(12).fill("🟦"), "grow", "12 ones"), f(["12", "➖", "5", "=", "7"])],
        },
      },
      {
        title: "42 − 15 step by step",
        narration: [
          "To subtract 15 from 42, line up the ones and the tens.",
          "In the ones, 2 is smaller than 5, so borrow 1 ten. Now it is 12 minus 5, which is 7.",
          "The tens now have 3 left, and 3 minus 1 is 2. So 42 minus 15 equals 27.",
        ],
        anim: { kind: "column", a: 42, b: 15, op: "-" },
      },
    ],
  },
  {
    id: "multiplication-groups",
    topic: "Multiplication",
    title: "Multiplication Is Equal Groups",
    icon: "🧺",
    scenes: [
      {
        title: "Baskets of mangoes",
        narration: [
          "Here are 3 baskets with 4 mangoes in each.",
          "Count by fours: 4, 8, 12.",
          "3 groups of 4 make 12. We write it as 3 times 4 equals 12.",
        ],
        anim: { kind: "groups", groups: 3, each: 4, item: "🥭" },
      },
      {
        title: "Swap the order",
        narration: [
          "Just like adding, you can multiply in any order.",
          "3 times 4 and 4 times 3 both make 12.",
          "So if you know one fact, you really know two!",
        ],
        anim: {
          kind: "scene",
          frames: [f(["3", "✖️", "4", "=", "12"]), f(["4", "✖️", "3", "=", "12"]), f(["1️⃣", "➕", "1️⃣", "=", "2️⃣"], "chain", "One fact, two answers")],
        },
      },
    ],
  },
  {
    id: "multiplication-tens",
    topic: "Multiplication",
    title: "Multiplying Bigger Numbers",
    icon: "✖️",
    scenes: [
      {
        title: "Times 10",
        narration: [
          "What is 3 times 10? It means 3 tens.",
          "3 tens make 30.",
          "Trick: to multiply by 10, just put a zero at the end. 3 becomes 30!",
        ],
        anim: {
          kind: "scene",
          frames: [f(["🔟", "🔟", "🔟"], "grow", "3 tens"), f(["3", "✖️", "10", "=", "30"]), f(["3", "➡️", "30"], "chain", "Add a zero")],
        },
      },
      {
        title: "12 × 4 step by step",
        narration: [
          "To multiply 12 by 4, start with the ones.",
          "2 times 4 is 8. Write 8 in the ones place.",
          "Then 1 ten times 4 is 4 tens. So 12 times 4 equals 48.",
        ],
        anim: { kind: "column", a: 12, b: 4, op: "×" },
      },
    ],
  },
  {
    id: "division-sharing",
    topic: "Division",
    title: "Division Means Sharing Equally",
    icon: "🍫",
    scenes: [
      {
        title: "Sharing chocolates",
        narration: [
          "We have 12 chocolates to share among 3 friends.",
          "Give one to each friend, again and again, until none are left.",
          "Each friend gets 4 chocolates. So 12 divided by 3 equals 4.",
        ],
        anim: { kind: "share", total: 12, groups: 3, item: "🍫" },
      },
      {
        title: "Division and multiplication are partners",
        narration: [
          "Division is the opposite of multiplication.",
          "If 4 times 5 is 20, then 20 divided by 4 is 5.",
          "So use your times tables to divide quickly!",
        ],
        anim: {
          kind: "scene",
          frames: [f(["✖️", "🤝", "➗"], "chain"), f(["4", "✖️", "5", "=", "20"]), f(["20", "➗", "4", "=", "5"])],
        },
      },
    ],
  },
  {
    id: "division-remainder",
    topic: "Division",
    title: "What Is a Remainder?",
    icon: "🍬",
    scenes: [
      {
        title: "Some are left over",
        narration: [
          "Now share 17 sweets among 5 children.",
          "Each child gets 3 sweets, and 2 sweets are left over.",
          "The left over part is called the remainder. 17 divided by 5 is 3, remainder 2.",
        ],
        anim: { kind: "share", total: 17, groups: 5, item: "🍬" },
      },
      {
        title: "Checking the answer",
        narration: [
          "To check, multiply and then add the remainder.",
          "5 times 3 is 15, and 15 plus 2 is 17.",
          "Remember: the remainder must always be smaller than the number we divide by.",
        ],
        anim: {
          kind: "scene",
          frames: [f(["5", "✖️", "3", "=", "15"]), f(["15", "➕", "2", "=", "17"]), f(["2", "<", "5"], "pulse", "Remainder is smaller")],
        },
      },
    ],
  },
  {
    id: "tables-four-nine",
    topic: "Multiplication Tables",
    title: "Tables as Equal Jumps",
    icon: "🔢",
    scenes: [
      {
        title: "The table of 4",
        narration: [
          "A times table is just counting in equal jumps.",
          "For the table of 4, count 4, 8, 12, 16, 20.",
          "Each line is 4 more than the line before.",
        ],
        anim: { kind: "table", n: 4, upto: 5 },
      },
      {
        title: "A magic trick for 9",
        narration: [
          "Here is a fun trick for the table of 9.",
          "Look at the answers: 9, 18, 27, 36, 45. The tens go up by one and the ones go down by one.",
          "And the digits always add up to 9!",
        ],
        anim: { kind: "table", n: 9, upto: 5 },
      },
    ],
  },
  {
    id: "tables-five-ten",
    topic: "Multiplication Tables",
    title: "Tables of 5 and 10",
    icon: "🖐️",
    scenes: [
      {
        title: "Counting in fives",
        narration: [
          "The table of 5 is counting in fives.",
          "Hop 5 at a time: 5, 10, 15, 20.",
          "Answers in the table of 5 always end in 5 or 0.",
        ],
        anim: { kind: "hops", start: 0, step: 5, count: 4, direction: 1 },
      },
      {
        title: "The easiest table",
        narration: [
          "The table of 10 is the easiest of all.",
          "10, 20, 30, 40, 50.",
          "Just put a zero after the number you multiply by!",
        ],
        anim: { kind: "table", n: 10, upto: 5 },
      },
    ],
  },
  {
    id: "area-squares",
    topic: "Area and Perimeter",
    title: "What Is Area?",
    icon: "🟩",
    scenes: [
      {
        title: "Counting squares",
        narration: [
          "Area is the space inside a shape.",
          "We count the squares that cover it: 5 squares in each row, and 3 rows.",
          "That makes 15 squares, so the area is 15 square centimetres. Area equals length times breadth.",
        ],
        anim: { kind: "area", w: 5, h: 3, show: "area" },
      },
      {
        title: "Area of a square",
        narration: [
          "A square has all four sides equal.",
          "This square is 4 centimetres on each side, so it has 4 rows of 4 squares.",
          "Its area is 4 times 4, which is 16 square centimetres.",
        ],
        anim: { kind: "area", w: 4, h: 4, show: "area" },
      },
    ],
  },
  {
    id: "perimeter-fence",
    topic: "Area and Perimeter",
    title: "What Is Perimeter?",
    icon: "🚧",
    scenes: [
      {
        title: "Walking around the edge",
        narration: [
          "Perimeter is the distance all the way around a shape.",
          "Walk around the edge: 5 plus 3 plus 5 plus 3.",
          "The perimeter is 16 centimetres. It is like a fence around a garden!",
        ],
        anim: { kind: "area", w: 5, h: 3, show: "perimeter" },
      },
      {
        title: "Area or perimeter?",
        narration: [
          "Area is like the grass that covers a garden.",
          "Perimeter is like the fence that goes around it.",
          "Area is measured in square units, and perimeter in plain units like centimetres.",
        ],
        anim: {
          kind: "scene",
          frames: [f(["🟩", "🟩", "🟩", "🟩"], "grow", "Area: the grass inside"), f(["🚧", "🚧", "🚧", "🚧"], "chain", "Perimeter: the fence around"), f(["sq cm", "🆚", "cm"], "pulse")],
        },
      },
    ],
  },

  // ---------- Science ----------
  {
    id: "plants-grow",
    topic: "Plants",
    title: "How a Plant Grows",
    icon: "🌱",
    scenes: [
      {
        title: "From seed to tree",
        narration: [
          "Every plant starts as a tiny seed.",
          "The seed needs water, air and warmth from the sun.",
          "Soon a small shoot pops out. This is called a seedling.",
          "The seedling grows leaves and becomes a young plant.",
          "With care, it grows into a big, strong tree!",
        ],
        anim: {
          kind: "scene",
          frames: [
            f(["🌰"], "pulse", "Seed"),
            f(["🌰", "💧", "☀️"], "float", "Water, air, sunlight"),
            f(["🌱"], "grow", "Seedling"),
            f(["🌿"], "grow", "Young plant"),
            f(["🌳"], "grow", "Tree"),
          ],
        },
      },
    ],
  },
  {
    id: "plants-food",
    topic: "Plants",
    title: "How Plants Make Food",
    icon: "🍃",
    scenes: [
      {
        title: "The leaf kitchen",
        narration: [
          "Leaves are the kitchen of the plant.",
          "They take in sunlight, and the roots bring up water from the soil.",
          "Using sunlight, water and air, the leaves make food. This is called photosynthesis.",
        ],
        anim: {
          kind: "scene",
          frames: [f(["🍃", "🍳"], "float", "Leaves = kitchen"), f(["💧", "⬆️", "🌱", "⬅️", "☀️"], "chain"), f(["☀️", "➕", "💧", "➕", "💨", "=", "🍞"], "chain", "Photosynthesis")],
        },
      },
      {
        title: "Parts of a plant",
        narration: [
          "Roots hold the plant in the soil and drink up water.",
          "The stem carries water up to the leaves and holds the plant up.",
          "Flowers make seeds, and seeds grow into new plants.",
        ],
        anim: {
          kind: "scene",
          frames: [f(["🪱", "🟫", "💧"], "rise", "Roots"), f(["🌿", "⬆️"], "rise", "Stem"), f(["🌸", "➡️", "🌰"], "chain", "Flowers make seeds")],
        },
      },
    ],
  },
  {
    id: "animals-homes",
    topic: "Animals",
    title: "Where Animals Live",
    icon: "🪺",
    scenes: [
      {
        title: "Animal homes",
        narration: [
          "Animals live in many different homes.",
          "Birds build nests in trees.",
          "Lions rest in dens, and fish live in water.",
          "Bees live together in a hive and make honey.",
        ],
        anim: {
          kind: "scene",
          frames: [
            f(["🐾", "🏡"], "float"),
            f(["🐦", "🪺", "🌳"], "float", "Nest"),
            f(["🦁", "⛰️", "🐟", "🌊"], "float", "Den and water"),
            f(["🐝", "🐝", "🍯"], "float", "Hive"),
          ],
        },
      },
    ],
  },
  {
    id: "animals-food",
    topic: "Animals",
    title: "What Animals Eat",
    icon: "🐄",
    scenes: [
      {
        title: "Plant eaters, meat eaters",
        narration: [
          "Some animals eat only plants. They are called herbivores, like cows.",
          "Some eat only other animals. They are carnivores, like tigers.",
          "Some eat both plants and animals. They are omnivores, like bears.",
          "Together they make a food chain: grass, then rabbit, then fox.",
        ],
        anim: {
          kind: "scene",
          frames: [
            f(["🐄", "🌾"], "grow", "Herbivore"),
            f(["🐅", "🍖"], "grow", "Carnivore"),
            f(["🐻", "🍎", "🐟"], "grow", "Omnivore"),
            f(["🌾", "➡️", "🐇", "➡️", "🦊"], "chain", "Food chain"),
          ],
        },
      },
    ],
  },
  {
    id: "body-heart",
    topic: "Human Body",
    title: "Heart and Lungs",
    icon: "❤️",
    scenes: [
      {
        title: "Pump and breathe",
        narration: [
          "Your heart is a strong muscle that pumps blood all around your body.",
          "Your lungs breathe in fresh air and breathe out used air.",
          "When you run, your heart beats faster to give your muscles more energy.",
        ],
        anim: {
          kind: "scene",
          frames: [f(["❤️"], "pulse", "Heart pumps blood"), f(["🫁"], "pulse", "Lungs breathe"), f(["🏃", "❤️"], "push", "Faster heartbeat")],
        },
      },
    ],
  },
  {
    id: "body-senses",
    topic: "Human Body",
    title: "Our Five Senses",
    icon: "👀",
    scenes: [
      {
        title: "See, hear, smell, taste, touch",
        narration: [
          "We have five senses. We see with our eyes and hear with our ears.",
          "We smell with our nose and taste with our tongue.",
          "Our skin lets us feel if something is hot, cold, soft or rough.",
          "All the senses send messages to the brain, which tells us what is happening.",
        ],
        anim: {
          kind: "scene",
          frames: [
            f(["👀", "👂"], "pulse", "Sight and hearing"),
            f(["👃", "👅"], "pulse", "Smell and taste"),
            f(["✋", "🧊", "🔥"], "grow", "Touch"),
            f(["👀", "👂", "👃", "👅", "✋", "➡️", "🧠"], "chain", "Messages to the brain"),
          ],
        },
      },
    ],
  },
  {
    id: "earth-water-cycle",
    topic: "Our Earth, Water, and Air",
    title: "The Water Cycle",
    icon: "🌧️",
    scenes: [
      {
        title: "Round and round",
        narration: [
          "The sun heats the water in seas and rivers.",
          "The water turns into vapour and rises up to form clouds.",
          "When clouds get heavy, the water falls back down as rain.",
          "The rain fills rivers and seas again, and the cycle goes on and on.",
        ],
        anim: {
          kind: "scene",
          frames: [
            f(["☀️", "🌊"], "pulse", "Sun heats water"),
            f(["💨", "💨", "☁️"], "rise", "Evaporation"),
            f(["💧", "💧", "💧"], "fall", "Rain"),
            f(["🌊", "➡️", "☁️", "➡️", "🌧️", "➡️", "🌊"], "chain", "The water cycle"),
          ],
        },
      },
    ],
  },
  {
    id: "earth-air",
    topic: "Our Earth, Water, and Air",
    title: "Air Is All Around Us",
    icon: "🌬️",
    scenes: [
      {
        title: "Invisible but everywhere",
        narration: [
          "Air is all around us, even though we cannot see it.",
          "We feel moving air as wind, and air fills up balloons.",
          "Plants, animals and people all need air to live.",
        ],
        anim: {
          kind: "scene",
          frames: [f(["🌍", "🌬️"], "float", "Air everywhere"), f(["🎐", "🎈", "🪁"], "float", "Wind"), f(["🌳", "🐕", "🧒"], "pulse", "We all need air")],
        },
      },
    ],
  },
  {
    id: "food-balanced",
    topic: "Food and Health",
    title: "A Balanced Plate",
    icon: "🍽️",
    scenes: [
      {
        title: "Three kinds of food",
        narration: [
          "Rice and bread give us energy to play and study.",
          "Eggs, milk and dal help our body grow strong.",
          "Fruits and vegetables protect us from getting sick.",
          "A balanced meal has a little of each on the plate!",
        ],
        anim: {
          kind: "scene",
          frames: [
            f(["🍚", "🍞"], "grow", "Energy foods"),
            f(["🥚", "🥛", "🫘"], "grow", "Body-building foods"),
            f(["🥕", "🍎", "🥦"], "grow", "Protective foods"),
            f(["🍚", "🥚", "🥦", "=", "🍽️"], "chain", "Balanced meal"),
          ],
        },
      },
    ],
  },
  {
    id: "food-habits",
    topic: "Food and Health",
    title: "Healthy Habits",
    icon: "🧼",
    scenes: [
      {
        title: "Every day",
        narration: [
          "Wash your hands with soap before eating.",
          "Brush your teeth twice a day.",
          "Play and exercise every day to stay fit.",
          "And get a good night's sleep so your body can rest.",
        ],
        anim: {
          kind: "scene",
          frames: [
            f(["🧼", "🙌"], "pulse", "Wash hands"),
            f(["🪥", "😁"], "pulse", "Brush teeth"),
            f(["🏃", "⚽"], "push", "Exercise"),
            f(["😴", "🌙"], "float", "Sleep well"),
          ],
        },
      },
    ],
  },
  {
    id: "matter-states",
    topic: "Matter and Force",
    title: "Solid, Liquid and Gas",
    icon: "🧊",
    scenes: [
      {
        title: "Three states of matter",
        narration: [
          "Everything around us is made of matter.",
          "Ice is a solid. It keeps its own shape.",
          "When ice melts it becomes water, a liquid that flows and takes the shape of its container.",
          "When water is heated it becomes steam, a gas that spreads everywhere.",
        ],
        anim: {
          kind: "scene",
          frames: [
            f(["🪨", "🧊", "💧", "🎈"], "grow", "Matter"),
            f(["🧊"], "pulse", "Solid"),
            f(["💧", "💧"], "fall", "Liquid"),
            f(["🧊", "➡️", "💧", "➡️", "♨️"], "chain", "Solid → liquid → gas"),
          ],
        },
      },
    ],
  },
  {
    id: "force-push-pull",
    topic: "Matter and Force",
    title: "Push and Pull",
    icon: "💪",
    scenes: [
      {
        title: "What is a force?",
        narration: [
          "A force is a push or a pull.",
          "When you push a box, it moves away from you.",
          "When you pull a cart, it comes towards you.",
          "A force can also change the speed or direction of a ball when you kick it.",
        ],
        anim: {
          kind: "scene",
          frames: [
            f(["👐", "💪"], "pulse", "Push or pull"),
            f(["🧒", "📦"], "push", "Push"),
            f(["🛒", "🧒"], "pull", "Pull"),
            f(["🦵", "⚽"], "push", "Kick!"),
          ],
        },
      },
    ],
  },
];

export function getConceptVideos(topic: string): ConceptVideo[] {
  return VIDEOS.filter((video) => video.topic === topic);
}

export function hasConceptVideos(topic: string): boolean {
  return VIDEOS.some((video) => video.topic === topic);
}

export function allConceptVideos(): ConceptVideo[] {
  return VIDEOS;
}

// ~2.5 spoken words a second at the narration's rate.
export function estimateSeconds(video: ConceptVideo): number {
  const words = video.scenes.flatMap((s) => s.narration).join(" ").split(/\s+/).length;
  return Math.round(words / 2.5);
}
