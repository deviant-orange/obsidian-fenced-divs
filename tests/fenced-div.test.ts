import { describe, it } from "node:test";
import assert from "node:assert";

import {
  FencedDiv,
  parseFencedDiv,
  type FencedDivInfo,
} from "../src/fenced-div.ts";

describe("parseFencedDiv function", () => {
  it('should find fenced divs that start with ":::"', () => {
    const lines = [
      "Some lines before",
      "",
      ":::",
      "content",
      ":::",
      "Some more lines after",
    ];
    const actual = Array.from(parseFencedDiv(lines));
    const expected = [
      {
        from: 19,
        to: 34,
        textStartPos: 23,
        content: ["content"],
        bareClassName: undefined,
        fencedAttrs: undefined,
      },
    ];
    assert.deepStrictEqual(actual, expected);
  });

  it('should find fenced divs that start with "::: bareClassName"', () => {
    const lines = [
      "Some lines before",
      "",
      "::: bareClassName",
      "content",
      ":::",
      "Some more lines after",
    ];
    const actual = Array.from(parseFencedDiv(lines));
    const expected = [
      {
        from: 19,
        to: 48,
        textStartPos: 37,
        content: ["content"],
        bareClassName: "bareClassName",
        fencedAttrs: undefined,
      },
    ];
    assert.deepStrictEqual(actual, expected);
  });

  it('should find fenced divs that start with "::: {.fencedAttrs #id}"', () => {
    const lines = [
      "Some lines before",
      "",
      "::: {.fencedAttrs #id}",
      "content",
      ":::",
      "Some more lines after",
    ];
    const actual = Array.from(parseFencedDiv(lines));
    const expected = [
      {
        from: 19,
        to: 53,
        textStartPos: 42,
        content: ["content"],
        bareClassName: undefined,
        fencedAttrs: "{.fencedAttrs #id}",
      },
    ];
    assert.deepStrictEqual(actual, expected);
  });

  it('should find fenced divs that start with ":::classname"', () => {
    const lines = [":::classname", "content", ":::"];
    const actual = Array.from(parseFencedDiv(lines));
    const expected = [
      {
        from: 0,
        to: 24,
        textStartPos: 13,
        content: ["content"],
        bareClassName: "classname",
        fencedAttrs: undefined,
      },
    ];
    assert.deepStrictEqual(actual, expected);
  });

  it('should find fenced divs that start with "::: {.#}"', () => {
    const lines = ["::: {.#}", "content", ":::"];
    const actual = Array.from(parseFencedDiv(lines));
    const expected = [
      {
        from: 0,
        to: 20,
        textStartPos: 9,
        content: ["content"],
        bareClassName: "{.#}",
        fencedAttrs: undefined,
      },
    ];
    assert.deepStrictEqual(actual, expected);
  });

  it('should find fenced divs that start with ":::{ .class #id }"', () => {
    const lines = [":::{ .class #id }", "content", ":::"];
    const actual = Array.from(parseFencedDiv(lines));
    const expected = [
      {
        from: 0,
        to: 29,
        textStartPos: 18,
        content: ["content"],
        bareClassName: undefined,
        fencedAttrs: "{ .class #id }",
      },
    ];
    assert.deepStrictEqual(actual, expected);
  });

  it('should find fenced divs that start with "::: {.foo}"', () => {
    const lines = ["::: {.foo}", "content", ":::"];
    const actual = Array.from(parseFencedDiv(lines));
    const expected = [
      {
        from: 0,
        to: 22,
        textStartPos: 11,
        content: ["content"],
        bareClassName: undefined,
        fencedAttrs: "{.foo}",
      },
    ];
    assert.deepStrictEqual(actual, expected);
  });

  it("should recognize multiple fenced divs", () => {
    const lines = [
      "Some lines before",
      "",
      ":::",
      "content",
      ":::",
      "",
      "Some text",
      "",
      ":::",
      "More content",
      ":::",
    ];
    const actual = Array.from(parseFencedDiv(lines));
    const expected = [
      {
        from: 19,
        to: 34,
        textStartPos: 23,
        content: ["content"],
        bareClassName: undefined,
        fencedAttrs: undefined,
      },
      {
        from: 47,
        to: 67,
        textStartPos: 51,
        content: ["More content"],
        bareClassName: undefined,
        fencedAttrs: undefined,
      },
    ];
    assert.deepStrictEqual(actual, expected);
  });

  it("should recognize nested divs", () => {
    const lines = ["::: foo", "", "::: bar", "content", ":::", "", ":::"];
    const actual = Array.from(parseFencedDiv(lines));
    const expected = [
      {
        from: 0,
        to: 33,
        textStartPos: 8,
        content: [
          "",
          {
            from: 9,
            to: 28,
            textStartPos: 17,
            content: ["content"],
            bareClassName: "bar",
            fencedAttrs: undefined,
          },
          "",
        ],
        bareClassName: "foo",
        fencedAttrs: undefined,
      },
    ];
    assert.deepStrictEqual(actual, expected);
  });

  it('should ignore fenced divs that start with "::: name1 name2"', () => {
    const lines = ["::: name1 name2", "content", ":::"];
    const actual = Array.from(parseFencedDiv(lines));
    const expected: FencedDivInfo[] = [];
    assert.deepStrictEqual(actual, expected);
  });

  it('should ignore fenced divs that start with "::: { .cl@ss }"', () => {
    const lines = ["::: { .cl@ass }", "content", ":::"];
    const actual = Array.from(parseFencedDiv(lines));
    const expected: FencedDivInfo[] = [];
    assert.deepStrictEqual(actual, expected);
  });

  it("should ignore fenced divs that do not close", () => {
    const lines = [":::", "content"];
    const actual = Array.from(parseFencedDiv(lines));
    const expected: FencedDivInfo[] = [];
    assert.deepStrictEqual(actual, expected);
  });
});

describe("FencedDiv class", () => {
  it("should forward info from FencedDivInfo", () => {
    const info: FencedDivInfo = {
      from: 1,
      to: 2,
      textStartPos: 3,
      content: ["content"],
    };
    const fencedDiv = new FencedDiv(info);
    assert.strictEqual(fencedDiv.from, 1);
    assert.strictEqual(fencedDiv.to, 2);
    assert.strictEqual(fencedDiv.textStartPos, 3);
    assert.deepStrictEqual(fencedDiv.content, ["content\n"]);
  });

  it("should handle nested FencedDivInfo", () => {
    const info: FencedDivInfo = {
      from: 1,
      to: 2,
      textStartPos: 3,
      content: [{ from: 2, to: 3, textStartPos: 4, content: ["content"] }],
    };
    const fencedDiv = new FencedDiv(info);
    assert.strictEqual(fencedDiv.from, 1);
    assert.strictEqual(fencedDiv.to, 2);
    assert.strictEqual(fencedDiv.textStartPos, 3);

    let [child] = fencedDiv.content;
    child = child as FencedDiv;
    assert.strictEqual(child.from, 2);
    assert.strictEqual(child.to, 3);
    assert.strictEqual(child.textStartPos, 4);
    assert.deepStrictEqual(child.content, ["content\n"]);
  });

  it("should merge contiguous strings in FencedDivInfo", () => {
    const info: FencedDivInfo = {
      from: 1,
      to: 2,
      textStartPos: 3,
      content: [
        "line 1",
        "line 2",
        { from: 2, to: 3, textStartPos: 4, content: ["content"] },
        "",
        "line 3",
      ],
    };
    const fencedDiv = new FencedDiv(info);
    assert.strictEqual(fencedDiv.from, 1);
    assert.strictEqual(fencedDiv.to, 2);
    assert.strictEqual(fencedDiv.textStartPos, 3);

    let [string1, nestedDiv, string2] = fencedDiv.content;
    nestedDiv = nestedDiv as FencedDiv;
    assert.strictEqual(string1, "line 1\nline 2\n");
    assert.strictEqual(nestedDiv.from, 2);
    assert.strictEqual(nestedDiv.to, 3);
    assert.strictEqual(nestedDiv.textStartPos, 4);
    assert.deepStrictEqual(nestedDiv.content, ["content\n"]);
    assert.strictEqual(string2, "\nline 3\n");
  });

  it("should parse bare class names into class list", () => {
    const info: FencedDivInfo = {
      from: 1,
      to: 2,
      textStartPos: 3,
      content: ["content"],
      bareClassName: "className",
      fencedAttrs: "",
    };
    const fencedDiv = new FencedDiv(info);
    assert.deepStrictEqual(fencedDiv.classList, ["className"]);
  });

  it("should parse bare class names into name", () => {
    const info: FencedDivInfo = {
      from: 1,
      to: 2,
      textStartPos: 3,
      content: ["content"],
      bareClassName: "className",
      fencedAttrs: "",
    };
    const fencedDiv = new FencedDiv(info);
    assert.strictEqual(fencedDiv.name, "className");
  });

  it("should parse id in fenced attrs into id", () => {
    const info: FencedDivInfo = {
      from: 1,
      to: 2,
      textStartPos: 3,
      content: ["content"],
      bareClassName: "",
      fencedAttrs: "#id",
    };
    const fencedDiv = new FencedDiv(info);
    assert.strictEqual(fencedDiv.id, "id");
  });

  it("should retain the last id in fenced attrs as id", () => {
    const info: FencedDivInfo = {
      from: 1,
      to: 2,
      textStartPos: 3,
      content: ["content"],
      bareClassName: "",
      fencedAttrs: "#id1 #id2",
    };
    const fencedDiv = new FencedDiv(info);
    assert.strictEqual(fencedDiv.id, "id2");
  });

  it("should not have an id when there is no id in fenced attrs", () => {
    const info: FencedDivInfo = {
      from: 1,
      to: 2,
      textStartPos: 3,
      content: ["content"],
      bareClassName: "",
      fencedAttrs: "",
    };
    const fencedDiv = new FencedDiv(info);
    assert.strictEqual(fencedDiv.id, undefined);
  });

  it("should parse classes in fenced attrs into class list", () => {
    const info: FencedDivInfo = {
      from: 1,
      to: 2,
      textStartPos: 3,
      content: ["content"],
      bareClassName: "",
      fencedAttrs: ".class1 .class2",
    };
    const fencedDiv = new FencedDiv(info);
    assert.deepStrictEqual(fencedDiv.classList, ["class1", "class2"]);
  });

  it("should not parse classes in fenced attrs into name", () => {
    const info: FencedDivInfo = {
      from: 1,
      to: 2,
      textStartPos: 3,
      content: ["content"],
      bareClassName: "",
      fencedAttrs: ".className",
    };
    const fencedDiv = new FencedDiv(info);
    assert.strictEqual(fencedDiv.name, undefined);
  });

  it("should parse mixed classes and ids in fenced attrs", () => {
    const info: FencedDivInfo = {
      from: 1,
      to: 2,
      textStartPos: 3,
      content: ["content"],
      bareClassName: "",
      fencedAttrs: ".class1 #id .class2",
    };
    const fencedDiv = new FencedDiv(info);
    assert.deepStrictEqual(fencedDiv.classList, ["class1", "class2"]);
    assert.strictEqual(fencedDiv.id, "id");
  });
});
