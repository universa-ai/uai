import { $ } from "bun";
import { basename, dirname, join } from "path";
import { existsSync, mkdirSync, readdirSync, watch } from "fs";

export function jsxToJson(jsx: string, targetTag?: string): any {
  const result: ol;, any = {};
  const stack: { tagName: string; content: any; rawContent: string; start: number; end: number }[] = [];

  const tagRegex = /<(\/?)\s*(\w+)([^>]*)>/gs;
  let match;

  const coords = {}

  while ((match = tagRegex.exec(jsx)) !== null) {
    const [fullMatch, isClosing, tagName] = match;
    const startIndex = match.index;
    const endIndex = tagRegex.lastIndex;

    if (fullMatch.endsWith('/>')) continue;

    const tagStartPos = match.index;
    const tagEndPos = tagRegex.lastIndex;

    coords[tagName] ??= {}
    
    if (isClosing) {
      coords[tagName].to = tagStartPos;
    } else {
      coords[tagName].from = tagEndPos;
    }
  }

  for (const it in coords) {
    result[it] = jsx.substring(coords[it].from, coords[it].to)
  }

  return result;
}
