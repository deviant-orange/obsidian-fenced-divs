const fencedAttrsRegex = /^:{3,}\s*?(\{(?:\s*[#.][\w_-]+?)*\s*\})(?:\s*?:*?)$/;
const bareClassNameRegex = /^:{3,}\s*?(\S+?)(?:\s*?:*?)$/;
const fenceEndRegex = /^:{3,}\s*?$/;

export type FencedDivInfo = {
  from: number;
  to: number;
  textStartPos: number;
  content: FencedDivInfoContent;
  bareClassName?: string;
  fencedAttrs?: string;
};

export type FencedDivInfoContent = (string | FencedDivInfo)[];

export type FencedDivContent = (string | FencedDiv)[];

type IncompleteInfo = {
  from: number;
  textStartPos: number;
  content: FencedDivInfoContent;
  bareClassName?: string;
  fencedAttrs?: string;
};

export function* parseFencedDiv(
  lines: Iterable<string>,
): Generator<FencedDivInfo> {
  let pos = 0;
  let match;
  let infoStack: IncompleteInfo[] = [];

  for (let line of lines) {
    if (infoStack.length > 0 && fenceEndRegex.test(line)) {
      const incompleteInfo = infoStack.pop();
      if (incompleteInfo === undefined) {
        throw new Error("unreachable");
      }
      const info = {
        from: incompleteInfo.from,
        to: pos + line.length,
        textStartPos: incompleteInfo.textStartPos,
        content: incompleteInfo.content,
        bareClassName: incompleteInfo.bareClassName,
        fencedAttrs: incompleteInfo.fencedAttrs,
      };

      const parent = infoStack[infoStack.length - 1];
      if (parent === undefined) {
        yield info;
      } else {
        parent.content.push(info);
      }
    } else if ((match = line.match(fencedAttrsRegex))) {
      const incompleteInfo = {
        from: pos,
        textStartPos: pos + line.length + 1,
        bareClassName: undefined,
        fencedAttrs: match[1],
        content: [],
      };
      infoStack.push(incompleteInfo);
    } else if ((match = line.match(bareClassNameRegex))) {
      const incompleteInfo = {
        from: pos,
        textStartPos: pos + line.length + 1,
        bareClassName: match[1],
        fencedAttrs: undefined,
        content: [],
      };
      infoStack.push(incompleteInfo);
    } else {
      const parent = infoStack[infoStack.length - 1];
      if (parent !== undefined) {
        parent.content.push(line);
      }
    }

    pos += line.length + 1;
  }
}

export class FencedDiv {
  classList: string[];
  id?: string;
  from: number;
  to: number;
  textStartPos: number;
  content: FencedDivContent;
  name?: string;

  constructor(info: FencedDivInfo) {
    this.from = info.from;
    this.to = info.to;
    this.textStartPos = info.textStartPos;
    this.content = mergeContiguousStrings(info.content);
    this.name = info.bareClassName ? info.bareClassName : undefined;

    if (info.bareClassName) {
      let match = info.bareClassName.match(/\S+/);
      this.classList = match ? [match[0]] : [];
    } else if (info.fencedAttrs) {
      [this.id, this.classList] = parseIdAndClass(info.fencedAttrs);
    } else {
      this.classList = [];
    }
  }
}

function mergeContiguousStrings(
  content: FencedDivInfoContent,
): FencedDivContent {
  const result = [];
  let buffer = [];
  for (const child of content) {
    if (typeof child === "string") {
      buffer.push(child);
    } else {
      if (buffer.length > 0) {
        result.push(buffer.join("\n") + "\n");
        buffer = [];
      }
      result.push(new FencedDiv(child));
    }
  }
  if (buffer.length > 0) {
    result.push(buffer.join("\n") + "\n");
  }
  return result;
}

function parseIdAndClass(fencedAttrs: string): [string | undefined, string[]] {
  let id = undefined;
  let classList: string[] = [];

  let idMatch = fencedAttrs.match(/#[\w_-]+/g);
  if (idMatch) {
    for (let idString of idMatch) {
      id = idString.substring(1);
    }
  }

  let classMatch = fencedAttrs.match(/\.[\w_-]+/g);
  if (classMatch) {
    for (let classString of classMatch) {
      classList.push(classString.substring(1));
    }
  }

  return [id, classList];
}
