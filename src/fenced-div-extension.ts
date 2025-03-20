import {
  editorInfoField,
  editorLivePreviewField,
  Component,
  MarkdownRenderer,
  App,
} from "obsidian";
import { RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView, WidgetType } from "@codemirror/view";
import { FencedDiv, parseFencedDiv } from "./fenced-div";
import { rangeInSelection } from "./range";
import { saveSettingsEffect } from "./settings";

import type { EditorState, Extension, Transaction } from "@codemirror/state";
import type { DecorationSet } from "@codemirror/view";
import type { FencedDivSettings } from "./settings";

export const fencedDivField = StateField.define<{
  parsed: FencedDiv[];
  filtered: FencedDiv[];
}>({
  create(state: EditorState): { parsed: FencedDiv[]; filtered: FencedDiv[] } {
    const parsed = Array.from(parseFencedDiv(state.doc.iterLines())).map(
      (info) => new FencedDiv(info),
    );
    const filtered = parsed.filter((_) => true);
    return { parsed, filtered };
  },

  update(
    { parsed, filtered }: { parsed: FencedDiv[]; filtered: FencedDiv[] },
    tr: Transaction,
  ): { parsed: FencedDiv[]; filtered: FencedDiv[] } {
    if (!tr.docChanged && !tr.selection) {
      return { parsed, filtered };
    }
    if (!tr.docChanged) {
      return {
        parsed,
        filtered: parsed.filter(
          (div) => !rangeInSelection(div, tr.newSelection.ranges),
        ),
      };
    }
    const text = tr.state.doc;
    const newParsed = Array.from(parseFencedDiv(text.iterLines())).map(
      (info) => new FencedDiv(info),
    );
    const newFiltered = newParsed.filter(
      (div) => !rangeInSelection(div, tr.newSelection.ranges),
    );
    return { parsed: newParsed, filtered: newFiltered };
  },
});

export function makeFencedDivDecorationField(
  settings: FencedDivSettings,
): StateField<DecorationSet> {
  return StateField.define<DecorationSet>({
    create(state: EditorState): DecorationSet {
      try {
        return decorateFencedDivs(
          state.field(fencedDivField).filtered,
          settings,
        );
      } catch (RangeError) {
        return Decoration.none;
      }
    },

    update(prevDecos: DecorationSet, tr: Transaction): DecorationSet {
      if (!tr.state.field(editorLivePreviewField)) {
        return Decoration.none;
      }

      const prevDivs = tr.startState.field(fencedDivField).filtered;
      const divs = tr.state.field(fencedDivField).filtered;

      const divsChanged =
        prevDivs.length !== divs.length ||
        divs.some((div, index) => !div.equals(prevDivs[index]));

      if (
        !divsChanged &&
        tr.effects.every((effect) => !effect.is(saveSettingsEffect))
      ) {
        return prevDecos;
      }
      return decorateFencedDivs(divs, settings);
    },

    provide(field: StateField<DecorationSet>): Extension {
      return EditorView.decorations.from(field);
    },
  });
}

function decorateFencedDivs(
  divs: FencedDiv[],
  settings: FencedDivSettings,
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();

  for (const div of divs) {
    const decoration = Decoration.replace({
      widget: new FencedDivWidget(div, settings),
      block: true,
    });
    builder.add(div.from, div.to, decoration);
  }

  return builder.finish();
}

class FencedDivWidget extends WidgetType {
  div: FencedDiv;
  settings: FencedDivSettings;

  constructor(div: FencedDiv, settings: FencedDivSettings) {
    super();
    this.div = div;
    this.settings = settings;
  }

  toDOM(view: EditorView): HTMLElement {
    return render(this.div, this.settings, view);
  }
}

export function render(
  div: FencedDiv,
  settings: FencedDivSettings,
  view: EditorView,
): HTMLElement {
  const renderMarkdown = makeRenderProc(view.state.field(editorInfoField).app);

  const container = document.createElement("div");
  container.classList.add("obsidian-fenced-div");
  for (let className of div.classList) {
    container.classList.add(className);
  }
  if (div.id) {
    container.id = div.id;
  }

  for (const child of div.content) {
    const div =
      typeof child === "string"
        ? renderMarkdown(child)
        : render(child, settings, view);
    container.append(div);
  }

  if (div.name) {
    const nameBanner = document.createElement("div");
    nameBanner.classList.add("obsidian-fenced-div-banner");
    nameBanner.append(div.name);
    container.prepend(nameBanner);
  }

  applyStyle(container, settings);

  container.addEventListener("click", (e) => {
    e.stopPropagation();
    view.dispatch({
      selection: {
        anchor: div.textStartPos,
        head: div.textStartPos,
      },
    });
  });

  return container;
}

function applyStyle(el: HTMLElement, settings: FencedDivSettings) {
  const styles = [settings.globalStyling];
  for (const rule of settings.specialStyling.values()) {
    if (rule.matches(el)) {
      styles.push(rule.style);
    }
  }
  el.setAttribute("style", styles.join("\n"));
}

function makeRenderProc(app: App): (s: string) => HTMLElement {
  const file = app.workspace?.getActiveFile()?.path ?? "";
  return (s) => {
    const div = document.createElement("div");
    div.classList.add("obsidian-fenced-div-chunk");
    const component = new Component();
    MarkdownRenderer.render(app, s, div, file, component);
    component.unload();
    return div;
  };
}
