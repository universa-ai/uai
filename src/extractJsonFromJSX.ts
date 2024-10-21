export default function extractJsonFromJSX(jsx: string): any {
  const result: any = {};
  const stack: { tagName: string; content: any }[] = [];
  const tagRegex = /<\/?(\w+)(\s[^>]*)?>([^<]*)/g;
  let match;

  while ((match = tagRegex.exec(jsx)) !== null) {
    const [fullMatch, tagName, , content] = match;
    if (fullMatch.startsWith("</")) {
      const last = stack.pop();
      if (last && last.tagName !== tagName) {
        throw new Error(`Mismatched closing tag: ${tagName}`);
      }
    } else {
      const newContent: any = {};
      if (fullMatch.endsWith("/>")) {
        // Self-closing tag
        if (stack.length > 0) {
          const parent = stack[stack.length - 1].content;
          parent[tagName] = {};
        } else {
          result[tagName] = {};
        }
      } else if (content) {
        // Tag with content
        const parsedContent = /^\d+$/.test(content.trim()) ? Number(content.trim()) : content.trim();
        if (stack.length > 0) {
          const parent = stack[stack.length - 1].content;
          parent[tagName] = parsedContent;
        } else {
          result[tagName] = parsedContent;
        }
      } else {
        // Opening tag
        if (stack.length > 0) {
          const parent = stack[stack.length - 1].content;
          if (!parent[tagName]) parent[tagName] = newContent;
          stack.push({ tagName, content: parent[tagName] });
        } else {
          result[tagName] = newContent;
          stack.push({ tagName, content: result[tagName] });
        }
      }
    }
  }

  return result;
}
