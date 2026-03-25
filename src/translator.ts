import { requestUrl } from "obsidian";

export interface TranslationCache {
	[title: string]: string[];
}

export async function translateTitles(
	titles: string[],
	apiKey: string,
	cache: TranslationCache
): Promise<TranslationCache> {
	const uncached = titles.filter((t) => !(t in cache));
	if (uncached.length === 0) return cache;

	// Batch in groups of 30 to avoid oversized prompts
	const batchSize = 30;
	const updatedCache = { ...cache };

	for (let i = 0; i < uncached.length; i += batchSize) {
		const batch = uncached.slice(i, i + batchSize);
		const translations = await translateBatch(batch, apiKey);

		for (const [title, forms] of Object.entries(translations)) {
			updatedCache[title] = forms;
		}
	}

	return updatedCache;
}

async function translateBatch(
	titles: string[],
	apiKey: string
): Promise<Record<string, string[]>> {
	const titlesJson = JSON.stringify(titles);

	const response = await requestUrl({
		url: "https://api.deepseek.com/chat/completions",
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model: "deepseek-chat",
			temperature: 0,
			response_format: { type: "json_object" },
			messages: [
				{
					role: "system",
					content: `You are a translation assistant. Given a list of terms, return a JSON object where each key is the original term and the value is an array of translations in other languages the user might use. Focus on Chinese (Traditional & Simplified) and English. Only include direct, commonly-used translations — no explanations. If the term is English, translate to Chinese. If the term is Chinese, translate to English. Include both Traditional and Simplified Chinese forms when they differ. Return ONLY the JSON object.`,
				},
				{
					role: "user",
					content: titlesJson,
				},
			],
		}),
	});

	const data = response.json;
	const content = data.choices?.[0]?.message?.content;
	if (!content) return {};

	try {
		return JSON.parse(content);
	} catch {
		return {};
	}
}
