export function rangeInSelection(
  range: { from: number; to: number },
  selection: readonly { from: number; to: number }[],
) {
  for (let { from, to } of selection) {
    [from, to] = from < to ? [from, to] : [to, from];
    if (range.from <= to && range.to >= from) {
      return true;
    }
  }
  return false;
}
