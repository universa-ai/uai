import { expect, test } from "bun:test";
import extractContentFromResponse from "../src/extractContentFromResponse";

test("nov29 - nested backticks", async () => {
  // const response = await (Bun.file('/Users/gur/.uai/responses/README.md11-29-2024,-4-34-04-AM-0.1.txt').text());
  const response = "<finalResponse>```md\nFirst\n```tsx\nSecond\n```\n```</finalResponse>";
  const tag = "finalResponse";
  const extractedContent = extractContentFromResponse(response, tag);
  expect(extractedContent).toBe("First\n```tsx\nSecond\n```");
});

test("extractContentFromResponse extracts content correctly", () => {
  const response = `
    <Code file="index.ts">
    This is the content to extract.
    </Code>
  `;
  const tag = "Code";
  const extractedContent = extractContentFromResponse(response, tag);
  expect(extractedContent).toBe("This is the content to extract.");
});

test("extractContentFromResponse merges multiples occurences of a tag", () => {
  const response = `
    <Code file="first.ts">
    One
    </Code>
    <Code file="second.ts">
    Two
    </Code>
  `;
  const tag = "Code";
  const extractedContent = extractContentFromResponse(response, tag);
  expect(extractedContent).toBe("One\n/*\nTwo\n*/");
});

test("extractContentFromResponse handles nested tags", () => {
  const response = `
    <content>
    Outer content
    <content>
    Inner content
    </content>
    </content>
  `;
  const tag = "content";
  const extractedContent = extractContentFromResponse(response, tag);
  expect(extractedContent).toBe(
    "Outer content\n    <content>\n    Inner content\n    </content>",
  );
});

test("extractContentFromResponse returns original string if tag not found", () => {
  const response = `
    <otherTag>
    Some content
    </otherTag>
  `;
  const tag = "content";
  const extractedContent = extractContentFromResponse(response, tag);
  expect(extractedContent).toBe(response);
});

test("extractContentFromResponse handles content with backticks", () => {
  const response = `
    <content>
    \`\`\`js
    console.log("Hello, World!");
    \`\`\`
    </content>
  `;
  const tag = "content";
  const extractedContent = extractContentFromResponse(response, tag);
  expect(extractedContent).toBe('console.log("Hello, World!");');
});
