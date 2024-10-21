import { $ } from "bun";
import fs from "fs";
import path from "path";

const myPromptsDir = "/Users/gur/my-prompts";

async function runMostRecentFile() {
  try {
    const files = await fs.promises.readdir(myPromptsDir);
    // console.debug(1730396411, files)

    if (files.length === 0) {
      console.log("No files found in the directory.");
      return;
    }
    // console.debug(1730396478, files)

    // Retrieve file stats and store them with their modification times
    const fileStatsPromises = files.map(async (file) => {
      // console.debug(1730396554, file)

      const filePath = path.join(myPromptsDir, file);
      // console.debug(1730396466, filePath)

      const stats = await fs.promises.stat(filePath);
      return { file: filePath, mtime: stats.mtime };
    });

    const fileStats = await Promise.all(fileStatsPromises);
    // console.debug(1730396447, fileStats)

    // Sort files by modification time in descending order
    fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    // Get the most recently modified file
    const mostRecentFile = fileStats[0].file;

    console.log(`Running the most recently modified file: ${mostRecentFile}`);

    // Execute the most recent file with bun run
    await $`bun run ${mostRecentFile} 2>&1`;
  } catch (error) {
    console.log("An error occurred:", error);
  }
}

await runMostRecentFile();
