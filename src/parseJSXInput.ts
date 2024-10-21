import { $ } from "bun";
import { basename, dirname, join } from "path";
import extractContentFromResponse from "./extractContentFromResponse";

export type InputJSXElement = {
  type: string;
  props: {
    [key: string]: any;
    children?: InputJSXElement | InputJSXElement[] | string;
  };
};

export default async function parseJSXInput(
  input: InputJSXElement,
): Promise<ParseResult> {
  const messages: Message[] = [];
  let outputPath = "";
  let outputBranch = "";
  let temperature = 0.7; // Default temperature
  let model = "gpt-4o"; // Default model
  let contentTag = "";
  let commitTag = "";

  const relativeToRepoPath = async (filePathResolved: string) => {
    try {
      const repoDirectory = (
        await $`git rev-parse --show-toplevel`.cwd(dirname(filePathResolved))
          .text()
      ).trim();
      return filePathResolved.replace(`${repoDirectory}/`, "");
    } catch (err) {
      console.info(err);
      return null;
    }
  };

  let level = 1;

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
          console.log(`Error executing shell command: ${command} (just use its stderr in prompt)`);
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
          aggregatedContent +=
            `<${children.type}${attributes}>\n${commandOutput}</${children.type}>\n`;
        }
      } else if (children.props?.path && !children.props.ignore) {
        const filePathResolved = (
          await $`${{ raw: `echo ${children.props.path}` }}`.text()
        ).trim();
        const pathAttr = (await relativeToRepoPath(filePathResolved)) ||
          filePathResolved;
        let fileContent = "";

        if (children.props.revision) {
          try {
            fileContent =
              await $`git show ${children.props.revision}:${pathAttr}`.text();
          } catch (err) {
            console.error(
              `Error fetching file content from revision ${children.props.revision}:`,
              err,
            );
            fileContent =
              `Error fetching file content from revision ${children.props.revision}`;
          }
        } else {
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
            const extractedContent = extractContentFromResponse(
              fileContent,
              tag,
            );
            aggregatedContent +=
              `<${children.type}${attributes}>\n${extractedContent}</${children.type}>\n`;
          } else {
            aggregatedContent +=
              `<${children.type}${attributes}>\n${contentWithWrapping}</${children.type}>\n`;
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

  // Usage of the processChildren function with initial level set to 1
  const topLevelChildren = await expandFragments(
    input.props.children as InputJSXElement[],
  );

  for (const child of topLevelChildren) {
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
    } else if (["system", "user", "assistant"].includes(child.type)) {
      const role = child.type;
      let aggregatedContent = "";
      aggregatedContent = await processChildren(
        child.props.children,
        role,
        aggregatedContent,
        1,
      );
      messages.push({ role, content: aggregatedContent.trim() });
    }
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
    } else if (children.type === "fragment" || !children.type) { // also expand <></>
      return expandFragments(children.props.children);
    } else {
      return [children];
    }
  }

  return {
    messages,
    outputPath,
    outputBranch,
    temperature,
    model,
    contentTag,
    commitTag,
  };
}
