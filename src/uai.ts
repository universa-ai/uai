import { $ } from "bun";
import { basename, dirname, join } from "path";
import { existsSync, mkdirSync, readdirSync, watch } from "fs";
import { Database } from "bun:sqlite";
import * as fs from 'fs';

const locks: Map<string, Promise<void> | null> = new Map();

const homePath = (await $`echo $HOME`.text()).trim();
console.log("homePath ==> ", homePath);

if (!fs.existsSync(`${homePath}/.uai`)) {
  await $`mkdir -p ${homePath}/.uai`.nothrow();
}

const db = new Database(join(homePath, ".uai", "locks.sqlite"), { create: true });
await db.query(
  `CREATE TABLE IF NOT EXISTS locks (path TEXT PRIMARY KEY, lock INTEGER);`,
).run();

if (!process.env.OPENAI_API_KEY) {
  console.error("Environment variable OPENAI_API_KEY is not set.");
  process.exit(1);
}

async function acquireLock(path: string): Promise<void> {
  let lock;
  let attempts = 0;
  do {
    attempts++;
    if (attempts >= 5) {
      console.error("Lock acquisition timeout:", path);
      await releaseLock(path);
    }
    lock = db.query("SELECT lock FROM locks WHERE path = ?").get(path);
    if (!lock) {
      await db.query("INSERT INTO locks (path, lock) VALUES (?, 1)").run(path);
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

export type InputJSXElement = {
  type: string;
  props: {
    [key: string]: any;
    children?: InputJSXElement | InputJSXElement[] | string;
  };
};

export function jsxToJson(jsx: string, targetTag?: string): any {
  const result: any = {};
  const tagRegex = /<(\/?)\s*(\w+)([^>]*)>/gs;
  const coords = {};
  let match;

  while ((match = tagRegex.exec(jsx)) !== null) {
    const [fullMatch, isClosing, tagName] = match;
    const tagStartPos = match.index;
    const tagEndPos = tagRegex.lastIndex;

    coords[tagName] ??= {};
    if (isClosing) {
      coords[tagName].to = tagStartPos;
    } else {
      if (!coords[tagName].from) {
        coords[tagName].from = tagEndPos;
      }
    }
  }

  for (const it in coords) {
    result[it] = jsx.substring(coords[it].from, coords[it].to);
  }

  return result;
}

export default async function processJSXInput(
  inputs: InputJSXElement | InputJSXElement[],
): Promise<any> {
  try {
    const inputArray = Array.isArray(inputs) ? inputs : [inputs];
    const allResponses: any[] = [];

    const results = await Promise.allSettled(
      inputArray.map(async (input) => {
        try {
          const messages: Message[] = [];
          let outputPath = "";
          let outputBranch = "";
          let temperature = 0.7;
          let model = "gpt-4o";
          let contentTag = "";
          let commitTag = "";
          let enablesPrediction = true;

          const relativeToRepoPath = async (filePathResolved: string) => {
            try {
              const repoDirectory = (
                await $`git rev-parse --show-toplevel`.cwd(dirname(filePathResolved))
                  .nothrow().text()
              ).trim();
              return filePathResolved.replace(`${repoDirectory}/`, "");
            } catch (err) {
              console.info(err);
              return null;
            }
          };

          const determineFileType = (filePath: string): string => {
            const extension = filePath.split(".").pop()?.toLowerCase();
            const imageExtensions = ["jpg", "jpeg", "png", "gif"];
            return imageExtensions.includes(extension!) ? "image" : "text";
          };

          const processImageFile = async (filePath: string): Promise<string> => {
            const fileContent = await Bun.file(filePath).arrayBuffer();
            const fileBuffer = Buffer.from(fileContent);
            return `data:image/jpeg;base64,${fileBuffer.toString("base64")}`;
          };

          const createMessageObject = (role: string, content: string | { image_url: string }): Message => {
            return typeof content === "string" ? { role, content: content.trim() } : { role, content };
          };

          const images = []

          async function processChildren(
            children: InputJSXElement | InputJSXElement[] | string,
            role: string,
            currentContent: string,
            currentLevel: number,
          ): Promise<string> {
            if (!children) return currentContent;

            let aggregatedContent = currentContent;
            const nextLevel = currentLevel + 1;

            if (typeof children === "string") {
              return aggregatedContent + children;
            }

            if (Array.isArray(children)) {
              for (const child of children) {
                aggregatedContent = await processChildren(
                  child,
                  role,
                  aggregatedContent,
                  nextLevel,
                );
              }
            } else {
              if (children.props?.shell && !children.props.ignore) {
                const command = children.props.shell;
                let commandOutput;
                try {
                  commandOutput = await $`${{ raw: command }}`.text();
                } catch (err) {
                  commandOutput = `${err.stderr}`;
                }
                let attributes = Object.entries(children.props)
                  .filter(([key]) => !["shell", "ignore", "inline"].includes(key))
                  .map(([key, value]) => `${key}="${value}"`)
                  .join(" ");

                if (attributes) attributes = " " + attributes;

                if (children.props.inline) {
                  aggregatedContent += `${commandOutput}\n`;
                } else {
                  aggregatedContent += `<${children.type}${attributes}>\n${commandOutput}</${children.type}>\n`;
                }
              } else if (children.props?.path && !children.props.ignore) {
                const filePathResolved = (
                  await $`${{ raw: `echo ${children.props.path}` }}`.text()
                ).trim();
                const pathAttr = (await relativeToRepoPath(filePathResolved)) ||
                  filePathResolved;

                const fileType = determineFileType(filePathResolved);

                if (fileType === "image") {
                  const imageUrl = await processImageFile(filePathResolved);
                  images.push(imageUrl);
                  enablesPrediction = false;
                  // if (children.props.label || children.props.description) {
                  //   const imgWithLabel = createMessageObject(role, [
                  //     {
                  //       "type": "text",
                  //       "text": children.props.label || children.props.description,
                  //     },
                  //     {
                  //       "type": "image_url",
                  //       "image_url": {
                  //         "url": imageUrl,
                  //       },
                  //     },
                  //   ]);
                  //   messages.push(imgWithLabel);
                  // } else {
                  //   messages.push(createMessageObject(role, [
                  //     {
                  //       "type": "image_url",
                  //       "image_url": {
                  //         "url": imageUrl,
                  //       },
                  //     },
                  //   ]));
                  // }
                } else {
                  let fileContent = "";

                  if (children.props.revision) {
                    try {
                      fileContent = await $`git show ${children.props.revision}:${pathAttr}`.text();
                    } catch (err) {
                      console.error(
                        `Error fetching file content from revision ${children.props.revision}:`,
                        err,
                      );
                      fileContent = `Error fetching file content from revision ${children.props.revision}`;
                    }
                  } else {
                    console.log("filePathResolved ==> ", filePathResolved);
                    fileContent = await Bun.file(filePathResolved).text();
                  }

                  const fileExtension = filePathResolved.split(".").pop();

                  let attributes = Object.entries(children.props)
                    .filter(
                      ([key]) =>
                        key !== "path" &&
                        key !== "ignore" &&
                        key !== "inline" &&
                        key !== "revision" &&
                        key !== "wrap",
                    )
                    .map(([key, value]) => `${key}="${value}"`)
                    .join(" ");

                  if (attributes) attributes = " " + attributes;

                  const wrapContent = children.props.wrap === true;
                  const contentWithWrapping = wrapContent
                    ? `\`\`\`${fileExtension}\n${fileContent}\n\`\`\`\n`
                    : fileContent;

                  if (children.props.inline) {
                    aggregatedContent += `${fileContent}\n`;
                  } else {
                    const tag = children.props.tag;
                    if (tag) {
                      const extractedContent = jsxToJson(fileContent)[tag];
                      aggregatedContent += `<${children.type}${attributes}>\n${extractedContent}</${children.type}>\n`;
                    } else {
                      aggregatedContent +=
                        `<${children.type}${attributes}>\n${contentWithWrapping}</${children.type}>\n`;
                    }
                  }
                }
              } else if (!children.props.ignore) {
                if (children.type != "fragment" && !children.props.inline) {
                  aggregatedContent += `<${children.type}>\n`;
                }

                aggregatedContent = await processChildren(
                  children.props.children,
                  role,
                  aggregatedContent,
                  nextLevel,
                );

                if (children.type != "fragment" && !children.props.inline) {
                  aggregatedContent += `\n</${children.type}>\n`;
                }
              }
            }

            return aggregatedContent;
          }

          async function expandFragments(
            children: InputJSXElement | InputJSXElement[],
          ): Promise<InputJSXElement[]> {
            if (Array.isArray(children)) {
              let expanded: InputJSXElement[] = [];
              for (const child of children) {
                if (child.type === "fragment") {
                  expanded = expanded.concat(
                    await expandFragments(child.props.children),
                  );
                } else {
                  expanded.push(child);
                }
              }
              return expanded;
            } else if (children.type === "fragment" || !children.type) {
              return expandFragments(children.props.children);
            } else {
              return [children];
            }
          }

          const topLevelChildren = await expandFragments(
            input.props.children as InputJSXElement[],
          );

          let idx = 0;

          for (const child of topLevelChildren) {
            idx++;
            if (child.type === "output") {
              if (child.props.path) {
                outputPath = (
                  await $`${{ raw: `echo ${child.props.path}` }}`.text()
                ).trim();
              }
              outputBranch = child.props.branch || "";
              contentTag = child.props.content || "";
              commitTag = child.props.commit || "";
            } else if (child.type === "settings") {
              temperature = parseFloat(child.props.temperature) || temperature;
              model = child.props.model || model;
              enablesPrediction = child.props.enablesPrediction || true;
            } else if (["system", "user", "assistant"].includes(child.type)) {
              const role = child.type;
              let aggregatedContent = "";
              aggregatedContent = await processChildren(
                child.props.children,
                role,
                aggregatedContent,
                1,
              );
              if (idx == topLevelChildren.length && images.length > 0 && role == 'user') {
                messages.push({
                  role,
                  content: [{
                    type: "text",
                    text: aggregatedContent,
                  }, ...images.map(it => {
                    return {
                      type: 'image_url',
                      image_url: {
                        url: it,
                        detail: "low", // 512x512
                      },
                    }
                  })]
                })
              } else {
                messages.push({ role, content: aggregatedContent })
              }
              messages.push(createMessageObject(role, aggregatedContent));
            }
          }

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

          const MODEL = process.env.MODEL || model;
          const TEMPERATURE = parseFloat(process.env.TEMPERATURE || temperature.toString());
          const API_KEY = process.env.OPENAI_API_KEY;

          const requestBody = {
            model: MODEL,
            messages: messages,
            max_tokens: 16384,
            temperature: TEMPERATURE,
          };

          if (outputPath && enablesPrediction) {
            const outputPathFile = Bun.file(outputPath);
            if (await outputPathFile.exists()) {
              const outputPathFileText = await outputPathFile.text();
              requestBody.prediction = {
                type: "content",
                content: outputPathFileText,
              };
            }
          }

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
            const response = await fetch(
              "https://api.openai.com/v1/chat/completions",
              requestOptions,
            );

            const data: OpenAIResponse = await response.json();

            if (data.error) {
              console.error(data.error.message)
              return null;
            } else {
              const responseContent = data.choices[0].message.content.trim();

              const historyResponseDir = join(process.env.HOME || "~", ".uai", "responses");
              const sanitizedTimestamp = timestamp.replace(/\s+/g, "-").replace(/\//g, "-");
              const responseBackupPath = join(
                historyResponseDir,
                `${basename(outputPath).replace(/\s+/g, "-")}${sanitizedTimestamp}-${temperature}.txt`,
              );
              await Bun.write(responseBackupPath, new Blob([responseContent]));

              let contentToReturn = { response: responseContent };

              try {
                contentToReturn = jsxToJson(responseContent);
              } catch (err) {
                contentToReturn.error = `${err}`;
              }

              if (outputPath) {
                const lockKey = dirname(outputPath);
                await acquireLock(lockKey);

                locks.set(
                  lockKey,
                  (async () => {
                    try {
                      let contentToWrite = responseContent;
                      if (contentTag) {
                        try {
                          contentToWrite = jsxToJson(responseContent)[contentTag];
                          contentToWrite = contentToWrite.trim();
                          if (contentToWrite.startsWith("```") && contentToWrite.endsWith("```")) {
                            const lines = contentToWrite.split("\n");
                            lines.shift();
                            lines.pop();
                            contentToWrite = lines.join("\n").trim();
                          }
                        } catch (err) {}
                      }

                      let commitMessageContent = `Response at temperature ${temperature}`;
                      if (commitTag) {
                        try {
                          commitMessageContent = jsxToJson(responseContent)[commitTag];
                        } catch (err) {}
                      }

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
                              await $`git reset -- ${file}`.nothrow();
                              await $`git checkout -- ${file}`.nothrow();
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

              return contentToReturn;
            }
          } catch (error) {
            console.error(error)
            return null;
          }
        } catch (err) {
          console.error(err)
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
