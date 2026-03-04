# paper-bot

A Telegram bot that sends a random academic paper from [arXiv](https://arxiv.org) to all registered users every day at 08:00 UTC. Built with [Cloudflare Workers](https://workers.cloudflare.com/).

## How it works

- Users register by sending `/start` to the bot on Telegram.
- Every day (via a Cron Trigger), the bot picks a random category and fetches a recent paper from the arXiv API.
- The paper title, abstract, authors, category, and PDF link are sent to all registered users.

### Supported categories

Computer Science, Physics, Mathematics, Biology, Economics, and Electrical Engineering (see `src/index.ts` for the full list).

## Prerequisites

- [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/)
- A [Cloudflare account](https://dash.cloudflare.com/sign-up)
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

## Setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Configure the bot token secret**

   ```bash
   npx wrangler secret put BOT_TOKEN
   ```

3. **Create the KV namespace** (if not already done)

   Update `wrangler.jsonc` with your KV namespace IDs.

4. **Register the webhook with Telegram**

   After deploying, point Telegram to your worker URL:

   ```
   https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<your-worker>.workers.dev/webhook
   ```

## Development

```bash
pnpm dev
```

## Deploy

```bash
pnpm deploy
```

## License

[MIT](LICENSE)
