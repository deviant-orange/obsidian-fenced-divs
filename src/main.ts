import { Plugin } from "obsidian";
import {
  fencedDivField,
  makeFencedDivDecorationField,
} from "./fenced-div-extension";
import {
  FencedDivSettings,
  FencedDivSettingTab,
  type FencedDivSerializableSettings,
} from "./settings";

export default class FencedDivPlugin extends Plugin {
  settings!: FencedDivSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new FencedDivSettingTab(this.app, this));

    this.registerEditorExtension([
      fencedDivField,
      makeFencedDivDecorationField(this.settings),
    ]);
  }

  async loadSettings() {
    const serializedSetting: FencedDivSerializableSettings | null =
      await this.loadData();
    if (serializedSetting) {
      this.settings = FencedDivSettings.fromSerialized(serializedSetting);
    } else {
      this.settings = new FencedDivSettings();
    }
  }

  async saveSettings() {
    await this.saveData(this.settings.toSerializable());
  }
}
