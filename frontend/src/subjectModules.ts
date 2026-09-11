import type { Subject } from "./components/SubjectSelect";

export interface TopicModule {
  label: string;
  icon: string;
  topic: string;
  description: string;
}

const MATH_MODULES: TopicModule[] = [
  { label: "Addition", icon: "➕", topic: "Addition", description: "Practice adding numbers together" },
  { label: "Subtraction", icon: "➖", topic: "Subtraction", description: "Practice subtracting numbers" },
  { label: "Multiplication", icon: "✖️", topic: "Multiplication", description: "Practice multiplying numbers" },
  { label: "Division", icon: "➗", topic: "Division", description: "Practice dividing numbers" },
  { label: "Tables", icon: "🔢", topic: "Multiplication Tables", description: "Practice multiplication tables" },
  { label: "Areas", icon: "📐", topic: "Area and Perimeter", description: "Practice area and perimeter" },
];

const MATH_ALL_TOPICS: TopicModule = {
  label: "All Topics (Mixed Review)",
  icon: "🧮",
  description: "A mixed review covering every topic above",
  topic:
    "Mixed Review: Addition, Subtraction, Multiplication, Division, Multiplication Tables, and Area and Perimeter",
};

const SCIENCE_MODULES: TopicModule[] = [
  { label: "Plants", icon: "🌱", topic: "Plants", description: "Learn about plants and how they grow" },
  { label: "Animals", icon: "🐾", topic: "Animals", description: "Learn about animals and their homes" },
  { label: "Human Body", icon: "🧍", topic: "Human Body", description: "Learn about our body and its parts" },
  { label: "Our Earth", icon: "🌍", topic: "Our Earth, Water, and Air", description: "Learn about the Earth, water, and air" },
  { label: "Food & Health", icon: "🍎", topic: "Food and Health", description: "Learn about healthy food and habits" },
  { label: "Matter & Force", icon: "⚙️", topic: "Matter and Force", description: "Learn about materials, force, and simple machines" },
];

const SCIENCE_ALL_TOPICS: TopicModule = {
  label: "All Topics (Mixed Review)",
  icon: "🧪",
  description: "A mixed review covering every topic above",
  topic:
    "Mixed Review: Plants, Animals, Human Body, Our Earth Water and Air, Food and Health, and Matter and Force",
};

export function getTopicModules(subject: Subject): TopicModule[] {
  return subject === "Science" ? SCIENCE_MODULES : MATH_MODULES;
}

export function getAllTopicsModule(subject: Subject): TopicModule {
  return subject === "Science" ? SCIENCE_ALL_TOPICS : MATH_ALL_TOPICS;
}
