import { App, PluginSettingTab, Setting } from "obsidian";
import type DailyPlanPlugin from "./main";

export class DailyPlanSettingTab extends PluginSettingTab {
  plugin: DailyPlanPlugin;

  constructor(app: App, plugin: DailyPlanPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Daily Plan Settings" });

    new Setting(containerEl)
      .setName("Daily Plan")
      .setDesc("Settings for the Daily Plan plugin will appear here.")
      .addButton((btn) =>
        btn.setButtonText("Reset defaults").onClick(async () => {
          this.plugin.settings = { ...this.plugin.settings };
          await this.plugin.saveSettings();
        })
      );
  }
}
