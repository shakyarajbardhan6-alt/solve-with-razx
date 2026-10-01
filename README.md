# Doubt Solver

**Ask. Understand. Learn.**

Doubt Solver is a responsive educational website for asking academic questions and receiving step-by-step AI explanations. The frontend is plain HTML, CSS and JavaScript. An Express server serves the site and keeps the Groq API credential on the backend.

## Features

- Guided question solving across mathematics, physics, chemistry, computer science, programming, English and general topics.
- Step-by-step tutor responses with safe, limited Markdown formatting.
- Browser-local question history with search, delete and reopen controls.
- Responsive navigation, subject directory, FAQ, about, contact, privacy and terms pages.
- Input validation, bounded request sizes and per-IP solve rate limiting.

## Requirements

- Node.js 20 or later
- A Groq API key for AI responses

## Install and run

```sh
npm install
cp .env.example .env
```

Add your key to `.env`, then start the app:

```sh
npm start
```

Open [http://localhost:3000](http://localhost:3000). During development, `npm run dev` restarts the server when files change.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `GROQ_API_KEY` | For AI answers | Secret API credential read only by `server.js`. |
| `PORT` | No | HTTP port; defaults to `3000`. |
| `GROQ_MODEL` | No | Groq chat model; defaults to `openai/gpt-oss-120b`. Use a model available to your Groq account. |
| `CORS_ORIGINS` | No | Comma-separated allowed origins if a separately hosted frontend needs cross-origin API access. Same-origin requests work without it. |
| `TRUST_PROXY_HOPS` | No | Positive hop count for a known reverse-proxy chain. Leave unset for direct connections; configure it to match your host before relying on forwarded client IPs for rate limiting. |

Get an API key through the [Groq Console](https://console.groq.com/). Keep the key in the server environment or an untracked local `.env` file. Do not put it in frontend files, commit it, paste it into issue reports, or expose it in client-side build settings. `.env` is ignored by Git; `.env.example` intentionally contains no credential.

Without `GROQ_API_KEY`, the website still loads, but `POST /api/solve` returns HTTP `503` with a setup error. Never enable public AI access without reviewing provider spend limits and the included rate limit for your deployment needs.

## API

`POST /api/solve` accepts JSON:

```json
{
	"question": "Why does dividing by a fraction make the number larger?",
	"subject": "Mathematics"
}
```

Questions must contain 1–3000 characters. Subject must match one of the supported subjects. Successful responses have the shape `{ "success": true, "answer": "...", "subject": "..." }`. The endpoint is limited to 20 requests per IP in a 15-minute window. Request bodies are limited to 10 KB.

## Privacy and contact form

Solved questions and answers are stored in the current browser's local storage for history. Questions and subject labels are sent from the server to Groq to generate answers; review Groq's current policies before deployment. This project does not include analytics, user accounts, or a contact backend. The contact form only validates locally and clearly tells the visitor that no message was sent. The policy and terms pages are editable starting points, not legal advice.

## Deployment

Deploy to a Node.js host that supports a persistent Express process. Install dependencies with `npm install`, set `GROQ_API_KEY` and any optional variables in the host's secret/environment settings, then use `npm start` as the start command. Configure HTTPS, hosting-level request/time limits and monitoring, and review rate limits and privacy text for your audience. Do not upload `.env` or `node_modules/`.

For a frontend hosted on a different origin, set `CORS_ORIGINS` to its exact origin or comma-separated origin list. By default, the API does not grant cross-origin access.

If the Node server is behind a reverse proxy, configure `TRUST_PROXY_HOPS` to the exact number of trusted proxy hops reported by your host. Do not set this to a broad trust-all value; incorrect proxy trust can let clients spoof their IP and bypass rate limits.

## Replace the example domain

Each page has a canonical URL and Open Graph URL using `https://example.com/`. Before launch, replace that placeholder with the final public site origin and matching page paths in every HTML file. Also review social metadata and page descriptions.