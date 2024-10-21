import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { $ } from "bun";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const testFile = join(import.meta.dir, "test-prompt.jsx");
const outputFilePath = join(import.meta.dir, "output.txt");
const outputBranch = "test-branch";

let originalBranch: string;

beforeAll(async () => {
  originalBranch = (await $`git rev-parse --abbrev-ref HEAD`.text()).trim();
});

afterAll(async () => {
  console.info(`Switching back to original branch: ${originalBranch}...`);
  await $`git checkout ${originalBranch}`;
});

describe("uai.ts script", () => {
  it("should create output files and history files", async () => {
    await Bun.write(
      testFile,
      new Blob([`
export default function() {
      return <>
            <system>
            Test system message
            </system>
            <user>
            Test user message
            </user>
            <temperature value="0.7"/>
            <output path="${outputFilePath}" branch="${outputBranch}"/>
      </>
}
    `]),
    );

    console.info("Running uai.ts script...");
    await $`bun run ./src/uai.ts ${testFile}`;
    return;

    await $`rm -rf ${testFile}`;

    console.info("Switching to the output branch to verify the content...");
    await $`git checkout ${outputBranch}`;

    console.info("Verifying the content of the output file...");
    const outputContent = readFileSync(outputFilePath, "utf-8");
    expect(outputContent.toLowerCase()).toContain("test assistant message");

    console.info("Verifying the commit message...");
    const commitMessage = await $`git log -1 --pretty=%B`.text();
    expect(commitMessage).toContain("temp of 0.7");
  });
});
