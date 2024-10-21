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

    const maybeTrimBackticks = (content) => {
      if (!content.startsWith("```")) return content;
      const backtickRegex = /^```(?:\w+)?\n([\s\S]+?)\n\s*```/m;
      const backtickMatch = content.match(backtickRegex);
      const contentToAppend = backtickMatch ? backtickMatch[1].trim() : content;
      return contentToAppend;
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
