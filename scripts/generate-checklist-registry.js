const fs = require("fs");
const path = require("path");
const base = "lib/planner/checklist-knowledge";
const files = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith(".md")) files.push(full);
  }
}
walk(base);
const out = ["export const baseChunks: Record<string, string> = {"];
for (const f of files) {
  const rel = path.relative(base, f).replace(/\\/g, "/").replace(/\.md$/, "");
  let text = fs.readFileSync(f, "utf8");
  text = text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
  out.push("  '" + rel + "': `" + text + "`,");
}
out.push("};", "");
fs.writeFileSync(path.join(base, "_registry.ts"), out.join("\n"));
console.log("Wrote " + files.length + " chunks");
