import { App, Notice, PluginSettingTab } from "obsidian";
import type FencedDivPlugin from "./main";
import { nanoid } from "nanoid";

export type FencedDivSerializableSettings = {
  globalStyling: string;
  specialStyling: [
    string,
    { type: "class" | "id"; name: string; style: string },
  ][];
};

export class FencedDivSettings {
  globalStyling: string;
  specialStyling: Map<string, StylingRule>;

  constructor() {
    this.globalStyling = "";
    this.specialStyling = new Map();
  }

  toSerializable(): FencedDivSerializableSettings {
    return {
      globalStyling: this.globalStyling,
      specialStyling: [...this.specialStyling],
    };
  }

  static fromSerialized(ss: FencedDivSerializableSettings): FencedDivSettings {
    const setting = new FencedDivSettings();
    setting.globalStyling = ss.globalStyling;
    for (const [id, rule] of ss.specialStyling) {
      setting.specialStyling.set(
        id,
        new StylingRule(rule.type, rule.name, rule.style),
      );
    }
    return setting;
  }
}

export class StylingRule {
  type: "class" | "id";
  name: string;
  style: string;

  constructor(type: "class" | "id", name: string, style: string) {
    this.type = type;
    this.name = name;
    this.style = style;
  }

  equals(other: StylingRule): boolean {
    return (
      this.type === other.type &&
      this.name === other.name &&
      this.style === other.style
    );
  }

  isEmpty(): boolean {
    return this.name === "" || this.style === "";
  }

  toString(): string {
    return `${this.type === "class" ? "." : "#"}${this.name}`;
  }

  matches(el: HTMLElement) {
    return (
      (this.type === "class" && el.classList.contains(this.name)) ||
      el.id === this.name
    );
  }

  static empty(): StylingRule {
    return new StylingRule("class", "", "");
  }

  static fromElements(
    selectEl: HTMLSelectElement,
    identifierEl: HTMLInputElement,
    styleEl: HTMLTextAreaElement,
  ): StylingRule {
    return new StylingRule(
      selectEl.value as "class" | "id",
      identifierEl.value,
      styleEl.value,
    );
  }
}

export class FencedDivSettingTab extends PluginSettingTab {
  plugin: FencedDivPlugin;

  constructor(app: App, plugin: FencedDivPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    this.containerEl.empty();

    globalStyling(this.containerEl, this.plugin);
    specialStyling(this.containerEl, this.plugin);
  }
}

function globalStyling(
  container: HTMLElement,
  plugin: FencedDivPlugin,
): HTMLElement {
  const globalCSSSetting = container.createEl("div", {
    cls: "obsidian-fenced-divs-setting",
  });
  globalCSSSetting.createEl("h2", { text: "Global styling" });
  globalCSSSetting.createEl("label", {
    text: "Applied to all fenced divs.",
    attr: { for: "globalCSS" },
  });

  const globalSettingEl = globalCSSSetting.createEl("textarea", {
    text: plugin.settings.globalStyling,
    attr: {
      placeholder: EXAMPLE_CSS,
      rows: 5,
      name: "globalCSS",
    },
  });

  const div = globalCSSSetting.createEl("div");
  const clearBtn = div.createEl("button", { text: "Clear" });
  const saveBtn = div.createEl("button", {
    text: "Save",
    cls: "mod-cta",
    attr: {
      disabled: globalSettingEl.value === plugin.settings.globalStyling,
    },
  });

  globalSettingEl.addEventListener(
    "input",
    (_) =>
      (saveBtn.disabled =
        globalSettingEl.value === plugin.settings.globalStyling),
  );
  clearBtn.addEventListener("click", async (_) => {
    plugin.settings.globalStyling = "";
    globalSettingEl.value = "";
    await plugin.saveSettings();
    saveBtn.disabled = true;
    new Notice("Fenced Divs: Global styling cleared");
  });
  saveBtn.addEventListener("click", async (_) => {
    plugin.settings.globalStyling = globalSettingEl.value;
    await plugin.saveSettings();
    saveBtn.disabled = true;
    new Notice("Fenced Divs: Global styling setting saved");
  });

  return globalCSSSetting;
}

function specialStyling(
  container: HTMLElement,
  plugin: FencedDivPlugin,
): HTMLElement {
  const specialCSSSettings = container.createEl("div", {
    cls: "obsidian-fenced-divs-setting",
  });
  specialCSSSettings.createEl("h2", { text: "Special styling" });
  specialCSSSettings.createEl("label", {
    text: "Applied to fenced divs with specified identifier.",
  });

  for (const [id, rule] of plugin.settings.specialStyling) {
    specialStylingRow(specialCSSSettings, plugin, id, rule);
  }

  specialCSSSettings
    .createEl("button", {
      text: "Add new styling rule",
      cls: "obsidian-fenced-divs-add-special-setting",
    })
    .addEventListener("click", (_) => {
      specialStylingRow(specialCSSSettings, plugin);
    });

  return specialCSSSettings;
}

function specialStylingRow(
  container: HTMLElement,
  plugin: FencedDivPlugin,
  id?: string,
  rule?: StylingRule,
): HTMLElement {
  id = id ?? nanoid();
  rule = rule ?? StylingRule.empty();

  const settingEl = container.createEl("div", {
    cls: "obsidian-fenced-divs-special-setting",
  });

  const selectEl = settingEl.createEl("select", {
    cls: "dropdown",
    attr: { name: "identifier-type" },
  });
  selectEl.createEl("option", {
    attr: {
      value: "class",
      selected: rule.type === "class" ? true : null,
    },
    text: "class",
  });
  selectEl.createEl("option", {
    attr: { value: "id", selected: rule.type === "id" ? true : null },
    text: "id",
  });
  const identifierEl = settingEl.createEl("input", {
    attr: { type: "text", placeholder: "identifierName", value: rule.name },
  });
  const styleEl = settingEl.createEl("textarea", {
    attr: { rows: 5, placeholder: EXAMPLE_CSS },
    text: rule.style,
  });
  const deleteBtn = settingEl.createEl("button", { text: "Delete" });
  const saveBtn = settingEl.createEl("button", {
    text: "Save",
    cls: "mod-cta",
    attr: { disabled: isUnmodifiedRule(id, rule, plugin.settings) },
  });

  const setDisabled = (_: Event) => {
    saveBtn.disabled = isUnmodifiedRule(
      id,
      StylingRule.fromElements(selectEl, identifierEl, styleEl),
      plugin.settings,
    );
  };

  selectEl.addEventListener("input", setDisabled);
  identifierEl.addEventListener("input", setDisabled);
  styleEl.addEventListener("input", setDisabled);

  deleteBtn.addEventListener("click", async (_) => {
    if (plugin.settings.specialStyling.delete(id)) {
      await plugin.saveSettings();
      new Notice(`Fenced Divs: Styling deleted for "${rule.toString()}"`);
    }
    settingEl.remove();
  });
  saveBtn.addEventListener("click", async (_) => {
    const newRule = StylingRule.fromElements(selectEl, identifierEl, styleEl);
    plugin.settings.specialStyling.set(id, newRule);
    await plugin.saveSettings();
    saveBtn.disabled = true;
    new Notice(`Fenced Divs: Styling saved for "${newRule.toString()}"`);
  });

  return settingEl;
}

function isUnmodifiedRule(
  id: string,
  rule: StylingRule,
  settings: FencedDivSettings,
) {
  const existingRule = settings.specialStyling.get(id);
  return (
    rule.isEmpty() || (existingRule !== undefined && existingRule.equals(rule))
  );
}

const EXAMPLE_CSS = "# for instance:\ncolor: white;\nbackground-color: black;";
