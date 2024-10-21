export default function extractContentFromResponse(
  response: string,
  tag: string,
): string {
  const openTag = new RegExp(`<${tag}(\\s[^>]*)?>`, "i");
  const closeTag = new RegExp(`</${tag}>`, "i");

  let extractedContent = "";
  let index = 0;
  let match;
  while ((match = response.match(openTag)) !== null) {
    response = response.slice(match.index! + match[0].length);
    let nestedCount = 0;
    let endIndex = 0;
    while (endIndex !== -1) {
      let nextOpenIndex = response.slice(endIndex).search(openTag);
      let nextCloseIndex = response.slice(endIndex).search(closeTag);

      if (nextOpenIndex !== -1) nextOpenIndex += endIndex;
      if (nextCloseIndex !== -1) nextCloseIndex += endIndex;

      if (
        nextCloseIndex !== -1 &&
        (nextOpenIndex === -1 || nextCloseIndex < nextOpenIndex)
      ) {
        if (nestedCount === 0) {
          endIndex = nextCloseIndex;
          break;
        }
        nestedCount--;
        endIndex = nextCloseIndex + closeTag.source.length;
      } else if (nextOpenIndex !== -1) {
        nestedCount++;
        endIndex = nextOpenIndex + openTag.source.length;
      } else {
        break;
      }
    }

    const content = response.slice(0, endIndex).trim();

    const maybeTrimBackticks = (content: string) => {
console.debug(1733138730, content)

      return content;
      if (content.startsWith("```") && content.endsWith("```")) {
        const lines = content.split("\n");
        // Remove the first line if it contains only backticks
        if (lines[0].startsWith("```")) {
          lines.shift();
        }
        // Remove the last line if it contains only backticks
        if (lines[lines.length - 1].startsWith("```")) {
          lines.pop();
        }
        return lines.join("\n").trim();
      }
      return content;
    };

    let contentToAppend = maybeTrimBackticks(content);

    if (index === 0) {
      extractedContent += contentToAppend;
    } else {
      extractedContent += `\n/*\n${contentToAppend}\n*/\n`;
    }
    response = response.slice(endIndex + closeTag.source.length);
    index++;
  }

  if (extractedContent) {
    return extractedContent.replace(/^\s+|\s+$/g, "");
  } else {
    return response;
  }
}
