// Writes every Grades 1-5 topic from frontend/src/subjectModules.ts to a JSON
// file, for backend/build_concept_video_library.py.
//   node scripts/export-topics.mjs > topics.json
import { buildSync } from "../frontend/node_modules/esbuild/lib/main.js";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const entry = fileURLToPath(new URL("../frontend/src/subjectModules.ts", import.meta.url));
const { outputFiles } = buildSync({ entryPoints: [entry], bundle: true, format: "cjs", platform: "node", write: false });
const mod = { exports: {} };
new Function("module", "exports", "require", outputFiles[0].text)(mod, mod.exports, createRequire(import.meta.url));
const { GRADES, getGradeTopicModules } = mod.exports;

const topics = [];
for (const subject of ["Mathematics", "Science", "Social Studies", "English"]) {
  for (const grade of GRADES) {
    for (const m of getGradeTopicModules(subject, grade)) {
      topics.push({ subject, grade, topic: m.topic, label: m.label, group: m.group ?? null });
    }
  }
}
process.stdout.write(JSON.stringify(topics, null, 1));
