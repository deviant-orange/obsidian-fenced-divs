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

import type { Extension, Transaction } from "@codemirror/state";
import type { DecorationSet } from "@codemirror/view";
import type { FencedDivInfo } from "./fenced-div";
import type { FencedDivSettings } from "./settings";

const clickFencedDivEffect = StateEffect.define<number>();

export function makeFencedDivField(
  settings: FencedDivSettings,
): StateField<DecorationSet> {
  return StateField.define<DecorationSet>({
    create(_): DecorationSet {
      return Decoration.none;
    },

    update(_oldState: DecorationSet, transaction: Transaction): DecorationSet {
      return decorateFencedDivs(transaction, settings);
    },

    provide(field: StateField<DecorationSet>): Extension {
      return EditorView.decorations.from(field);
    },
  });
}

function decorateFencedDivs(
  transaction: Transaction,
  settings: FencedDivSettings,
): DecorationSet {
  if (!transaction.state.field(editorLivePreviewField)) {
    return Decoration.none;
  }
  const builder = new RangeSetBuilder<Decoration>();
  const text = transaction.state.doc;

  Array.from(parseFencedDiv(text.iterLines()))
    .filter((info) => !fencedDivInEffects(info, transaction.effects))
    .filter((info) => !rangeInSelection(info, transaction.newSelection.ranges))
    .map((info) => new FencedDiv(info))
    .forEach((div) => {
      const decoration = Decoration.replace({
        widget: new FencedDivWidget(div, settings),
        block: true,
      });
      builder.add(div.from, div.to, decoration);
    });

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
      effects: [clickFencedDivEffect.of(div.from)],
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

function fencedDivInEffects(
  info: FencedDivInfo,
  effects: readonly StateEffect<any>[],
): boolean {
  for (let effect of effects) {
    if (effect.is(clickFencedDivEffect)) {
      if (effect.value === info.from) {
        return true;
      }
      for (let child of info.content) {
        if (typeof child !== "string") {
          child = child as FencedDivInfo;
          if (fencedDivInEffects(child, effects)) {
            return true;
          }
        }
      }
    }
  }
  return false;
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
