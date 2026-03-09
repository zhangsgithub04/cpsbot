# CPS Bot

Four-stage CPS assistant built with Next.js App Router:
- Stage 1: Clarify
- Stage 2: Ideate
- Stage 3: Develop
- Stage 4: Implement

This guide helps you set up your own local environment from scratch.

## Prerequisites

- Node.js 20+
- npm 10+
- A MongoDB database (Atlas or local)
- At least one model API key:
	- OpenAI key for `gpt-4.1-mini`, or
	- Gemini key for `gemini-2.0-flash`

## 1. Install Dependencies

```bash
npm install
```

## 2. Create Your Environment File

Create `/.env.local` in the project root and add:

```bash
# Required
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster>/<db>?retryWrites=true&w=majority"
REGISTRATION_SECRETE_KEY="your-signup-key"

# At least one provider key is required
OPENAI_API_KEY="your-openai-api-key"
GEMINI_API_KEY="your-gemini-api-key"
```

Notes:
- Keep the variable name exactly `REGISTRATION_SECRETE_KEY` (the code currently expects this exact spelling).
- You can provide one or both model keys.
- If a user selects OpenAI and `OPENAI_API_KEY` is missing, requests will fail.
- If a user selects Gemini and `GEMINI_API_KEY` is missing, requests will fail.

## 3. Run the App

```bash
npm run dev
```

Open `http://localhost:3000`.

## 4. Build for Production (Optional)

```bash
npm run build
npm run start
```

## 5. Lint

```bash
npm run lint
```

## Project Scripts

- `npm run dev`: start local dev server
- `npm run build`: production build
- `npm run start`: run production server
- `npm run lint`: run ESLint

## MongoDB Collections Used

The app creates and reads from:
- `users`
- `sessions`
- chat session/topic collections used by stage APIs

No manual schema migration is required for first run.

## Troubleshooting

- Error: `MONGODB_URI is missing in .env.local`
	- Add `MONGODB_URI` to `/.env.local` and restart dev server.

- Error: `OPENAI_API_KEY is missing in .env.local`
	- Add `OPENAI_API_KEY` or switch provider to Gemini in the UI.

- Error: `GEMINI_API_KEY is missing in .env.local`
	- Add `GEMINI_API_KEY` or switch provider to OpenAI in the UI.

- Sign-up fails with registration key error
	- Ensure `REGISTRATION_SECRETE_KEY` exists in `/.env.local` and matches the key entered in sign-up.

## Security Notes

- Never commit `/.env.local`.
- Rotate API keys if they are ever exposed.
- Use strong values for registration keys in shared deployments.
