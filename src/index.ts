// src/index.ts

interface Env {
	PAPER_BOT_KV: KVNamespace
	BOT_TOKEN: string
}

interface TelegramUpdate {
	message?: {
		text?: string
		from: { id: number }
	}
}

export default {
	async fetch(
		request: Request,
		env: Env,
		_ctx: ExecutionContext
	): Promise<Response> {
		const url = new URL(request.url);

		switch (url.pathname) {
			case '/health':
				return new Response('OK', { status: 200 });

			case '/webhook': {
				if (request.method !== 'POST') {
					return new Response('Method Not Allowed', { status: 405 });
				}

				const body = await request.json() as TelegramUpdate;
				const message = body?.message;

				if (message?.text === '/start') {
					const userId = String(message.from.id);
					await env.PAPER_BOT_KV.put(`user:${userId}`, userId);
					await sendMessage(env.BOT_TOKEN, userId, 'Você foi registrado! ✅');
				}

				return new Response('OK', { status: 200 });
			}

			default:
				return new Response('Not Found', { status: 404 });
		}
	},

	async scheduled(
		_controller: ScheduledController,
		env: Env,
		_ctx: ExecutionContext
	) {
		const [userIds, article] = await Promise.all([
			listAllUsers(env.PAPER_BOT_KV),
			fetchRandomArticle()
		]);

		await Promise.all(
			userIds.map(userId =>
				sendMessage(env.BOT_TOKEN, userId, article)
					.catch(err => console.error(`Falha ao enviar para ${userId}:`, err))
			)
		);
	}
} satisfies ExportedHandler<Env>;

async function listAllUsers(kv: KVNamespace): Promise<string[]> {
	const userIds: string[] = [];
	let cursor: string | undefined = undefined;

	while (true) {
		const result: KVNamespaceListResult<unknown, string> = await kv.list({ prefix: 'user:', cursor });
		for (const key of result.keys) {
			userIds.push(key.name.replace('user:', ''));
		}
		if (result.list_complete) break;
		cursor = result.cursor;
	}

	return userIds;
}

async function sendMessage(token: string, chatId: string, text: string): Promise<void> {
	const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ chat_id: chatId, text }),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Telegram API error ${response.status}: ${error}`);
	}
}

const ARXIV_CATEGORIES = [
	// Computer Science
	'cs.AI', 'cs.LG', 'cs.CV', 'cs.CL', 'cs.RO',
	// Physics
	'physics.gen-ph', 'astro-ph.GA', 'quant-ph', 'cond-mat.mtrl-sci',
	// Mathematics
	'math.CO', 'math.ST', 'math.OC',
	// Biology
	'q-bio.GN', 'q-bio.NC', 'q-bio.PE',
	// Economics
	'econ.GN', 'econ.EM',
	// Electrical Engineering
	'eess.SP', 'eess.IV',
];

async function fetchRandomArticle(): Promise<string> {
	const sixMonthsAgo = new Date();
	sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
	const dateFrom = sixMonthsAgo.toISOString().split('T')[0].replace(/-/g, '');

	const category = ARXIV_CATEGORIES[Math.floor(Math.random() * ARXIV_CATEGORIES.length)];
	const url = `https://export.arxiv.org/api/query?search_query=cat:${category}+AND+submittedDate:[${dateFrom}+TO+99991231]&sortBy=submittedDate&sortOrder=descending&max_results=100`;

	const response = await fetch(url);
	const xml = await response.text();

	const entryMatches = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
	if (entryMatches.length === 0) throw new Error(`Nenhum artigo encontrado para ${category}`);

	const entry = entryMatches[Math.floor(Math.random() * entryMatches.length)][1];

	const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim();
	const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.trim().slice(0, 300);

	const link = entry.match(/<link href="([^"]*)" rel="related" type="application\/pdf" title="pdf"\/>/)?.[1];

	const authorMatches = [...entry.matchAll(/<name>([\s\S]*?)<\/name>/g)];
	const authors = authorMatches.map(m => m[1].trim()).join(', ');

	return `📄 **${title}**\n\n${summary}...\n\n👤 __${authors}__\n🏷 __${category}__\n🔗 ${link}`;
}
