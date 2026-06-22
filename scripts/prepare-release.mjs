import { mkdirSync, copyFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const distDir = "dist";
rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

for (const file of ["main.js", "manifest.json", "styles.css"]) {
  copyFileSync(file, join(distDir, file));
}

console.log("Release assets prepared in dist/:");
console.log("- dist/main.js");
console.log("- dist/manifest.json");
console.log("- dist/styles.css");
