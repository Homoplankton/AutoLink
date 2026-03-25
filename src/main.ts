import { Editor, MarkdownView, Notice, Plugin } from "obsidian";
import { AutoLinkSettings, AutoLinkSettingTab, DEFAULT_SETTINGS } from "./settings";
import { getCandidateNotes, insertLinks, InsertLinksResult } from "./linker";

export default class AutoLinkPlugin extends Plugin {
	settings: AutoLinkSettings = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "link-current-note",
			name: "Link current note",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.autoLink(editor, view);
			},
		});

		this.addSettingTab(new AutoLinkSettingTab(this.app, this));
	}

	private autoLink(editor: Editor, view: MarkdownView) {
		const activeFile = view.file;
		if (!activeFile) {
			new Notice("No active file.");
			return;
		}

		const candidates = getCandidateNotes(this.app, activeFile, this.settings);
		if (candidates.length === 0) {
			new Notice("No notes found in the current folder to link to.");
			return;
		}

		const content = editor.getValue();
		const { content: updated, linkedTerms } = insertLinks(content, candidates, this.settings);

		if (linkedTerms.length === 0) {
			new Notice("No new links found to insert.");
			return;
		}

		editor.setValue(updated);

		const summary = [`AutoLink: ${linkedTerms.length} link${linkedTerms.length === 1 ? "" : "s"} inserted`, ""];
		for (const term of linkedTerms) {
			summary.push(`• ${term}`);
		}
		new Notice(summary.join("\n"), 8000);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
