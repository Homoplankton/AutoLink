import { App, TFile } from "obsidian";
import { AutoLinkSettings } from "./settings";

export interface NoteCandidate {
	title: string;
	normalizedTitle: string;
	pluralForms: string[];
	translations: string[];
}

function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSingular(word: string): string {
	const lower = word.toLowerCase();
	if (lower.endsWith("ies")) {
		return word.slice(0, -3) + "y";
	}
	if (lower.endsWith("ses") || lower.endsWith("xes") || lower.endsWith("zes") || lower.endsWith("ches") || lower.endsWith("shes")) {
		return word.slice(0, -2);
	}
	if (lower.endsWith("s") && !lower.endsWith("ss")) {
		return word.slice(0, -1);
	}
	return word;
}

function getPluralForms(word: string): string[] {
	const forms: string[] = [];
	const lower = word.toLowerCase();

	if (lower.endsWith("y") && !/[aeiou]y$/i.test(lower)) {
		forms.push(word.slice(0, -1) + "ies");
	} else if (lower.endsWith("s") || lower.endsWith("x") || lower.endsWith("z") || lower.endsWith("ch") || lower.endsWith("sh")) {
		forms.push(word + "es");
	} else {
		forms.push(word + "s");
	}

	return forms;
}

function isInsideProtectedRegion(content: string, matchStart: number, matchEnd: number): boolean {
	// Check if inside frontmatter (--- ... ---)
	const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---\n/);
	if (frontmatterMatch && matchStart < frontmatterMatch[0].length) {
		return true;
	}

	// Check if inside an existing [[ ]] link
	const linkRegex = /\[\[[^\]]*\]\]/g;
	let linkMatch;
	while ((linkMatch = linkRegex.exec(content)) !== null) {
		if (matchStart >= linkMatch.index && matchEnd <= linkMatch.index + linkMatch[0].length) {
			return true;
		}
	}

	// Check if inside inline code (`...`)
	const inlineCodeRegex = /`[^`]+`/g;
	let codeMatch;
	while ((codeMatch = inlineCodeRegex.exec(content)) !== null) {
		if (matchStart >= codeMatch.index && matchEnd <= codeMatch.index + codeMatch[0].length) {
			return true;
		}
	}

	// Check if inside a fenced code block (``` ... ```)
	const codeBlockRegex = /```[\s\S]*?```/g;
	let blockMatch;
	while ((blockMatch = codeBlockRegex.exec(content)) !== null) {
		if (matchStart >= blockMatch.index && matchEnd <= blockMatch.index + blockMatch[0].length) {
			return true;
		}
	}

	return false;
}

export function getCandidateNotes(app: App, activeFile: TFile, settings: AutoLinkSettings): NoteCandidate[] {
	const candidates: NoteCandidate[] = [];
	const files = app.vault.getFiles();

	for (const file of files) {
		if (file.extension !== "md") continue;
		if (file.path === activeFile.path) continue;

		const title = file.basename;
		const normalizedTitle = settings.caseSensitive ? title : title.toLowerCase();

		const candidate: NoteCandidate = {
			title,
			normalizedTitle,
			pluralForms: [],
			translations: [],
		};

		if (settings.ignorePlurals) {
			candidate.pluralForms = getPluralForms(title);
			const singular = getSingular(title);
			if (singular.toLowerCase() !== title.toLowerCase()) {
				candidate.pluralForms.push(singular);
			}
		}

		candidates.push(candidate);
	}

	// Sort longest title first to prevent partial matches
	candidates.sort((a, b) => b.title.length - a.title.length);

	return candidates;
}

export interface InsertLinksResult {
	content: string;
	linkedTerms: string[];
}

// CJK characters don't use word boundaries — detect if a form contains them
const CJK_RANGE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;

function buildPattern(forms: string[]): string {
	// Group forms by whether they need word boundaries
	const wordBoundaryForms: string[] = [];
	const cjkForms: string[] = [];

	for (const form of forms) {
		if (CJK_RANGE.test(form)) {
			cjkForms.push(escapeRegex(form));
		} else {
			wordBoundaryForms.push(escapeRegex(form));
		}
	}

	const parts: string[] = [];
	if (wordBoundaryForms.length > 0) {
		parts.push(`\\b(?:${wordBoundaryForms.join("|")})\\b`);
	}
	if (cjkForms.length > 0) {
		parts.push(`(?:${cjkForms.join("|")})`);
	}
	return parts.join("|");
}

export function insertLinks(content: string, candidates: NoteCandidate[], settings: AutoLinkSettings): InsertLinksResult {
	let result = content;
	const linkedRegions: Array<{ start: number; end: number }> = [];
	const linkedTerms: string[] = [];

	for (const candidate of candidates) {
		const allForms = [candidate.title, ...candidate.pluralForms, ...candidate.translations];
		const pattern = buildPattern(allForms);
		if (!pattern) continue;
		const flags = settings.caseSensitive ? "g" : "gi";
		const regex = new RegExp(pattern, flags);

		let match;
		while ((match = regex.exec(result)) !== null) {
			const matchStart = match.index;
			const matchEnd = matchStart + match[0].length;

			// Skip if inside a protected region
			if (isInsideProtectedRegion(result, matchStart, matchEnd)) {
				continue;
			}

			// Skip if overlapping with an already-linked region
			const overlaps = linkedRegions.some(
				(r) => matchStart < r.end && matchEnd > r.start
			);
			if (overlaps) {
				continue;
			}

			const matchedText = match[0];
			let replacement: string;

			if (matchedText === candidate.title) {
				replacement = `[[${candidate.title}]]`;
			} else {
				replacement = `[[${candidate.title}|${matchedText}]]`;
			}

			result =
				result.slice(0, matchStart) +
				replacement +
				result.slice(matchEnd);

			linkedRegions.push({
				start: matchStart,
				end: matchStart + replacement.length,
			});

			linkedTerms.push(`${matchedText} → ${replacement}`);

			// Adjust regex index to account for the replacement being longer than the original
			regex.lastIndex = matchStart + replacement.length;
		}
	}

	return { content: result, linkedTerms };
}
