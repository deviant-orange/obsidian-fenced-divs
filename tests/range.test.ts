import { describe, it } from "node:test";
import assert from "node:assert";

import { rangeInSelection } from "../src/range.ts";

describe("rangeInSelection", () => {
  it("returns true when range overlaps one selection", () => {
    const range = { from: 1, to: 2 };
    const selection = [{ from: 0, to: 1 }];
    assert.equal(rangeInSelection(range, selection), true);
  });

  it("returns false when range is outside one selection", () => {
    const range = { from: 2, to: 3 };
    const selection = [{ from: 0, to: 1 }];
    assert.equal(rangeInSelection(range, selection), false);
  });

  it("returns true when range is larger than selection", () => {
    const range = { from: 0, to: 20 };
    const selection = [{ from: 10, to: 10 }];
    assert.equal(rangeInSelection(range, selection), true);
  });

  it("returns true when range overlaps with one of many selections", () => {
    const range = { from: 1, to: 2 };
    const selection = [
      { from: 0, to: 1 },
      { from: 3, to: 4 },
    ];
    assert.equal(rangeInSelection(range, selection), true);
  });

  it("returns false when range overlaps with none of the selections", () => {
    const range = { from: 2, to: 2 };
    const selection = [
      { from: 0, to: 1 },
      { from: 3, to: 4 },
    ];
    assert.equal(rangeInSelection(range, selection), false);
  });

  it("can handle inverse selections", () => {
    const range = { from: 1, to: 2 };
    const selection = [{ from: 1, to: 0 }];
    assert.equal(rangeInSelection(range, selection), true);
  });
});
