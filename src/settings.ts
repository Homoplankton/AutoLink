import { App, PluginSettingTab, Setting } from "obsidian";
import type AutoLinkPlugin from "./main";

export interface AutoLinkSettings {
	caseSensitive: boolean;
	ignorePlurals: boolean;
	scope: "current-folder";
	deepseekApiKey: string;
	crossLanguage: boolean;
}

export const DEFAULT_SETTINGS: AutoLinkSettings = {
	caseSensitive: false,
	ignorePlurals: true,
	scope: "current-folder",
	deepseekApiKey: "",
	crossLanguage: false,
};

export class AutoLinkSettingTab extends PluginSettingTab {
	plugin: AutoLinkPlugin;

	constructor(app: App, plugin: AutoLinkPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Case sensitive")
			.setDesc("When enabled, matching is case-sensitive (e.g., 'Plankton' won't match 'plankton').")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.caseSensitive)
					.onChange(async (value) => {
						this.plugin.settings.caseSensitive = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Ignore plurals")
			.setDesc("When enabled, treats singular and plural forms as the same (e.g., 'cell' matches 'cells').")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.ignorePlurals)
					.onChange(async (value) => {
						this.plugin.settings.ignorePlurals = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Cross-language linking")
			.setDesc("When enabled, uses OpenAI to translate note titles and match across languages (e.g., 'Plankton' ↔ '浮游動物').")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.crossLanguage)
					.onChange(async (value) => {
						this.plugin.settings.crossLanguage = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("DeepSeek API key")
			.setDesc("Required for cross-language linking. Get one at platform.deepseek.com.")
			.addText((text) =>
				text
					.setPlaceholder("sk-...")
					.setValue(this.plugin.settings.deepseekApiKey)
					.onChange(async (value) => {
						this.plugin.settings.deepseekApiKey = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
