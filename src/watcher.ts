import { existsSync, mkdirSync, readdirSync, watch } from "fs";
import { join } from "path";
import { $ } from "bun";

const watchDirectory = process.argv[2];

if (!watchDirectory) {
  console.error("Usage: bun run watcher.ts <directory>");
  process.exit(1);
}

console.info(`👀 Watching directory: ${watchDirectory} for changes...`);

const initialHashes = new Map<string, string>();

// Function to update file hashes
const updateHashes = async (filePath: string) => {
  try {
    const content = await Bun.file(filePath).text();
    initialHashes.set(filePath, Bun.hash(content));
  } catch (err) {
    console.error(`❌ Error reading file ${filePath}:`, err);
  }
};

// Initialize hashes for existing files
const files = readdirSync(watchDirectory).filter((file) => file.endsWith(".jsx") || file.endsWith(".tsx"));
await Promise.all(
  files.map((file) => updateHashes(join(watchDirectory, file))),
);

// Ensure history directories exist
const historyPromptDir = join(process.env.HOME || "~", ".uai", "prompts");
const historyResponseDir = join(process.env.HOME || "~", ".uai", "responses");
[historyPromptDir, historyResponseDir].forEach((dir) => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
});

watch(watchDirectory, async (event, filename) => {
  console.debug(1730035820, event, filename);

  if (!filename.endsWith(".jsx") && !filename.endsWith(".tsx")) return;

  const filePath = join(watchDirectory, filename);

  if (event === "change") {
    const currentHash = Bun.hash(await Bun.file(filePath).text());
    const previousHash = initialHashes.get(filePath);

    console.debug(1730035871, currentHash, previousHash);

    if (currentHash !== previousHash) {
      console.info(
        `[${new Date().toLocaleString()}] ⚡ Detected change in ${filename}, executing uai...`,
      );
      initialHashes.set(filePath, currentHash);

      await $`bun run ${filePath}`.nothrow();
    }
  }
});
