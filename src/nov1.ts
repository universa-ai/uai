import { $ } from "bun";
import fs from "fs";

const myPromptsDir = "/Users/gur/my-prompts";

async function runMostRecentFile() {
  try {
    const files = await fs.promises.readdir(myPromptsDir);

    if (files.length === 0) {
      console.log("No files found in the directory.");
      return;
    }

    // Retrieve file stats and store them with their modification times
    const fileStatsPromises = files.map(async (file) => {
      const filePath = path.join(myPromptsDir, file);
      const stats = await fs.promises.stat(filePath);
      return { file: filePath, mtime: stats.mtime };
    });

    const fileStats = await Promise.all(fileStatsPromises);

    // Sort files by modification time in descending order
    fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    // Get the most recently modified file
    const mostRecentFile = fileStats[0].file;

    console.log(`Running the most recently modified file: ${mostRecentFile}`);

    // Execute the most recent file with bun run
    await $`bun run ${mostRecentFile}`;
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

runMostRecentFile();
