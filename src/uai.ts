import { $ } from "bun";
import { basename, dirname, join } from "path";
import { existsSync, mkdirSync, readdirSync, watch } from "fs";
import { Database } from "bun:sqlite";

import parseJSXInput, { InputJSXElement } from "./parseJSXInput";
import extractContentFromResponse from "./extractContentFromResponse";
import extractJsonFromJSX from "./extractJsonFromJSX";

const locks: Map<string, Promise<void> | null> = new Map();

const db = new Database(join(import.meta.dir, "locks.sqlite"), { create: true });
await db.query(
  `CREATE TABLE IF NOT EXISTS locks (path TEXT PRIMARY KEY, lock INTEGER);`,
).run();

// Ensure environment variables are set before accessing them
if (!process.env.OPENAI_API_KEY) {
  console.error("Environment variable OPENAI_API_KEY is not set.");
  process.exit(1);
}

async function acquireLock(path: string): Promise<void> {
  console.debug(1730909070, path);

  let lock;
  let attempts = 0;
  do {
    attempts++;

    if (attempts >= 5) {
      console.error("c'mon cannot do pushing so long just release it", path);
      await releaseLock(path);
    }

    lock = db.query("SELECT lock FROM locks WHERE path = ?").get(path);
    console.debug(1730907877, path, lock, attempts);

    if (!lock) {
      const resp = await db.query(
        "INSERT INTO locks (path, lock) VALUES (?, 1)",
      ).run(path);
      console.debug(1730776733, path, resp);

      break;
    }
    await Bun.sleep(500);
  } while (lock);
}

async function releaseLock(path: string): Promise<void> {
  return db.query("DELETE FROM locks WHERE path = ?").run(path);
}

interface Message {
  role: string;
  content: string;
}

interface ParseResult {
  messages: Message[];
  outputPath: string;
  outputBranch: string;
  temperature: number;
  model: string;
  contentTag: string;
  commitTag: string;
}

interface OpenAIResponse {
  error?: { message: string };
  choices: { message: { content: string } }[];
  usage: { prompt_tokens: number; completion_tokens: number };
}

async function sendOpenAIRequest(
  messages: Message[],
  temperature = 0.7,
  model = "gpt-4o",
  outputPath,
): Promise<[string | null, string | null, number[]?]> {
  // Retrieve configuration from environment or use defaults
  const MODEL = process.env.MODEL || model;
  const TEMPERATURE = parseFloat(process.env.TEMPERATURE || temperature.toString());
  const API_KEY = process.env.OPENAI_API_KEY;

  console.debug(
    1730909754,
    MODEL,
    TEMPERATURE,
    JSON.stringify(messages[0]).substr(0, 42) + "...",
    JSON.stringify(messages[1]).substr(0, 42) + "...",
  );

  // Construct the request payload
  const requestBody = {
    model: MODEL,
    messages: messages,
    max_tokens: 16384,
    temperature: TEMPERATURE,
  };

  if (outputPath) {
    const outputPathFile = Bun.file(outputPath);
    if (await outputPathFile.exists()) {
      const outputPathFileText = await outputPathFile.text();
      requestBody.prediction = {
      type: "content",
        content: outputPathFileText,
      }
    }
  }
  
  // Set up the request options
  const requestOptions: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(requestBody),
    verbose: false,
  };

  try {
    // Make the API request using fetch
    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      requestOptions,
    );

    // Parse the JSON response
    const data: OpenAIResponse = await response.json();
    console.debug(1730908525, Object.keys(data));

    // Handle potential errors in the response
    if (data.error) {
      return [data.error.message, null];
    } else {
      console.debug(
        1729963365,
        data.usage.prompt_tokens,
        data.usage.completion_tokens,
      );
      return [
        null,
        data.choices[0].message.content.trim(),
        [data.usage.prompt_tokens, data.usage.completion_tokens],
      ];
    }
  } catch (error) {
    // Log and return error information
    console.debug(1730909246, error);
    return [error.toString(), null];
  }
}

export default async function processJSXInput(
  inputs: InputJSXElement | InputJSXElement[],
): Promise<any> {
  // console.debug(1730953064, inputs)

  try {
    const inputArray = Array.isArray(inputs) ? inputs : [inputs];

    const allResponses: any[] = [];

    // Execute all input processing in parallel
    const results = await Promise.allSettled(
      inputArray.map(async (input) => {
        try {
          console.debug(1730953142, `${Object.keys(input.props)}`);

          const parsed = await parseJSXInput(input);
          console.debug(1730953148, `${Object.keys(parsed)}`);

          const {
            messages,
            outputPath,
            outputBranch,
            temperature,
            model,
            contentTag,
            commitTag,
          } = parsed;
          console.debug(
            1730036518,
            `${messages.length} messages`,
            `to ${outputPath}`,
            `of ${outputBranch}`,
            `with ${temperature}`,
            `using ${model}`,
            `<${commitTag}>`,
            `<${contentTag}/>`,
          );

          const timestamp = new Date()
            .toLocaleString()
            .replace(/[:.]/g, "-")
            .replace(/\s+/g, "-");
          const inputBackupPath = join(
            process.env.HOME || "~",
            ".uai",
            "prompts",
            `${timestamp.replaceAll("/", "-")}-${temperature}.txt`,
          );
          const messagesText = messages
            .map((msg) => `|${msg.role.toUpperCase()}|\n\n${msg.content}`)
            .join("\n\n");
          await Bun.write(inputBackupPath, new Blob([messagesText]));
          console.debug(1730090737, inputBackupPath);

          const [err, response] = await executeWithTemperature(
            messages,
            outputPath,
            outputBranch,
            temperature,
            model,
            contentTag,
            commitTag,
            timestamp,
            "external-input",
          );

          if (!err && response) {
            return response;
          } else {
            console.debug(1730909093, err);
            return null;
          }
        } catch (err) {
          console.debug(1730953286, err);

          throw err;
        }
      }),
    );

    allResponses.push(
      ...results.filter((response) => response !== null && response.status === "fulfilled").map((it) => it.value),
    );

    return inputArray.length === 1 ? allResponses[0] : allResponses;
  } catch (err) {
    console.error("Error processing JSX input:", err);
    throw new Error(err.toString());
  }
}

async function executeWithTemperature(
  messages: Message[],
  outputPath: string,
  outputBranch: string,
  temperature: number,
  model: string,
  contentTag: string,
  commitTag: string,
  timestamp: string,
  inputFilePath: string,
): Promise<[string | null, any | null]> {
  const [err, response, tokens] = await sendOpenAIRequest(
    messages,
    temperature,
    model,
    outputPath,
  );
  if (err) {
    console.error(`❌ Error from OpenAI at temperature ${temperature}`, err);
    return [err, null];
  }
  console.debug(1729963337, response.substring(0, 42) + "...");

  const historyResponseDir = join(process.env.HOME || "~", ".uai", "responses");
  const sanitizedTimestamp = timestamp.replace(/\s+/g, "-").replace(/\//g, "-");
  const responseBackupPath = join(
    historyResponseDir,
    `${basename(outputPath).replace(/\s+/g, "-")}${sanitizedTimestamp}-${temperature}.txt`,
  );
  await Bun.write(responseBackupPath, new Blob([response]));

  let contentToReturn = { response };
  console.debug(1733043404, contentToReturn);

  try {
    contentToReturn = extractJsonFromJSX(response);
  } catch (err) {
    console.debug(1730651218, err);
  }

  console.debug(1729963477, outputPath);

  if (outputPath) {
    const lockKey = dirname(outputPath);
    await acquireLock(lockKey);

    console.debug(1730776630, lockKey);

    locks.set(
      lockKey,
      (async () => {
        try {
          const contentToWrite = contentTag ? extractContentFromResponse(response, contentTag) : response;
          const commitMessageContent = commitTag
            ? extractContentFromResponse(response, commitTag)
            : `Response at temperature ${temperature} with missing commit tag`;

          console.debug(
            1730135726,
            commitMessageContent.substring(0, 42) + "...",
            contentToWrite.substring(0, 42) + "...",
          );

          const branchName = outputBranch ||
            (await $`git rev-parse --abbrev-ref HEAD`.text()).trim();

          const targetFileDirectory = dirname(outputPath);
          const repoDirectory = (
            await $`git rev-parse --show-toplevel`.cwd(targetFileDirectory)
              .text()
          ).trim();

          console.info("🌟 Setting working directory to:", repoDirectory);
          $.cwd(repoDirectory);

          const currentBranch = (
            await $`git rev-parse --abbrev-ref HEAD`.text()
          ).trim();
          console.info("📌 Current branch:", currentBranch);

          try {
            await $`git checkout -b ${branchName}`;
            console.info(`✔️ Created new branch: ${branchName}`);
          } catch (err) {
            console.info(
              `${branchName} - Branch creation failed, attempting to switch to existing branch...`,
            );
            try {
              await $`git checkout ${branchName}`;
            } catch (err) {
              const errorMessage = err.stderr.toString();
              const localChanges = errorMessage.match(
                /Your local changes to the following files would be overwritten by checkout:\n([\s\S]+?)\nPlease commit your changes or stash them before you switch branches./,
              );
              const untrackedFiles = errorMessage.match(
                /The following untracked working tree files would be overwritten by checkout:\n([\s\S]+)/,
              );

              const conflictingFiles = [
                ...(localChanges ? localChanges[1].trim().split("\n").map((line) => line.trim()) : []),
                ...(untrackedFiles ? untrackedFiles[1].trim().split("\n").map((line) => line.trim()) : []),
              ];

              if (conflictingFiles.length > 0) {
                console.info(
                  `⚠️ Conflicting files detected: ${conflictingFiles.join(", ")}`,
                );
                for (const file of conflictingFiles) {
                  await $`git reset -- ${file}`.nothrow(); // unstaged
                  await $`git checkout -- ${file}`.nothrow(); // staged
                  await $`rm -f ${file}`.nothrow();
                  console.info(
                    `Reverted changes in ${file} to resolve conflict`,
                  );
                }
              }

              await $`git checkout ${branchName}`;
            }
          }

          await Bun.write(outputPath, new Blob([contentToWrite]));
          console.info(`✔️ Written content to ${outputPath}`);

          await $`git add ${outputPath}`;
          try {
            await $`git commit -m "temp of ${temperature}" -m "${commitMessageContent}"`;
          } catch (err) {
            console.debug(1729849247, commitMessageContent);
            await $`git commit -m "temp of ${temperature} with missing description"`;
          }

          console.info(`✔️ Committed changes on branch ${branchName}`);

          await $`git checkout ${currentBranch}`;
        } catch (error) {
          console.error(`❌ Error during execution:`, error);
        } finally {
          await releaseLock(lockKey);
        }
      })(),
    );
  }

  return [null, contentToReturn];
}

async function main() {
  const args = process.argv.slice(2);
  const inputFilePath = args.find(
    (arg) => arg.endsWith(".jsx") || arg.endsWith(".tsx"),
  );

  if (!inputFilePath) {
    console.error(
      "Usage: bun run uai.ts <path-to-prompt-input-file>.jsx [--watch]",
    );
    console.debug("Are you sure input file extension .jsx?");
    process.exit(1);
  }

  const directory = dirname(inputFilePath);

  const historyPromptDir = join(process.env.HOME || "~", ".uai", "prompts");
  const historyResponseDir = join(process.env.HOME || "~", ".uai", "responses");
  [historyPromptDir, historyResponseDir].forEach((dir) => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  });

  try {
    const { default: inputFn } = await import(inputFilePath);
    const input = await inputFn();

    const responses = await processJSXInput(input);

    if (responses) {
      console.log("Responses:", responses.length);
    }
  } catch (err) {
    console.error("Error processing input file:", err);
  }
}

if (import.meta.path === Bun.main) {
  main();
}
