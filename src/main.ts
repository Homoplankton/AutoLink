import { Editor, MarkdownView, Notice, Plugin } from "obsidian";
import { AutoLinkSettings, AutoLinkSettingTab, DEFAULT_SETTINGS } from "./settings";
import { getCandidateNotes, insertLinks, NoteCandidate } from "./linker";
import { TranslationCache, translateTitles } from "./translator";

export default class AutoLinkPlugin extends Plugin {
	settings: AutoLinkSettings = DEFAULT_SETTINGS;
	translationCache: TranslationCache = {};

	async onload() {
		await this.loadSettings();
		await this.loadTranslationCache();

		this.addCommand({
			id: "link-current-note",
			name: "Link current note",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.autoLink(editor, view);
			},
		});

		this.addSettingTab(new AutoLinkSettingTab(this.app, this));
	}

	private async autoLink(editor: Editor, view: MarkdownView) {
		const activeFile = view.file;
		if (!activeFile) {
			new Notice("No active file.");
			return;
		}

		const candidates = getCandidateNotes(this.app, activeFile, this.settings);
		if (candidates.length === 0) {
			new Notice("No notes found to link to.");
			return;
		}

		// Translate titles if cross-language is enabled
		if (this.settings.crossLanguage && this.settings.deepseekApiKey) {
			await this.applyTranslations(candidates);
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

	private async applyTranslations(candidates: NoteCandidate[]) {
		const titles = candidates.map((c) => c.title);

		try {
			this.translationCache = await translateTitles(
				titles,
				this.settings.deepseekApiKey,
				this.translationCache
			);
			await this.saveTranslationCache();
		} catch (e) {
			new Notice("AutoLink: Translation failed — linking without translations.");
			console.error("AutoLink translation error:", e);
		}

		for (const candidate of candidates) {
			const translations = this.translationCache[candidate.title];
			if (translations) {
				candidate.translations = translations;
			}
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private async loadTranslationCache() {
		const stored = await this.loadData();
		this.translationCache = stored?.translationCache ?? {};
	}

	private async saveTranslationCache() {
		const data = (await this.loadData()) ?? {};
		data.translationCache = this.translationCache;
		await this.saveData(data);
	}
}
