import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function javascriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return javascriptFiles(path);
    return entry.isFile() && entry.name.endsWith(".js") ? [path] : [];
  });
}

const files = javascriptFiles("src").sort();
const failed = [];

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) failed.push(file);
}

if (failed.length) {
  console.error(`Syntax validation failed for ${failed.length} source file(s).`);
  process.exit(1);
}

console.log(`Syntax validation passed for ${files.length} source modules.`);
