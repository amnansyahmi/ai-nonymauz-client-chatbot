# Deployment Checklist

## Before GitHub push

- [ ] Rename project/client branding in `data/knowledge.json`.
- [ ] Update `CLIENT_NAME`, `CHATBOT_NAME`, and `SUPPORT_EMAIL` in `.env.local`.
- [ ] Test local using `npm run dev`.
- [ ] Check `/api/health`.

## Before Vercel deploy

- [ ] Import GitHub repo into Vercel.
- [ ] Add environment variables in Vercel.
- [ ] Confirm `AI_NONYMAUZ_BASE_URL` ends with `/v1`.
- [ ] Confirm AI-nonymauz backend accepts `/chat/completions`.
- [ ] Confirm model name exists in LiteLLM config.

## After deploy

- [ ] Open Vercel URL.
- [ ] Ask: "What is your warranty policy?"
- [ ] Ask a Malay question: "Macam mana nak book installation?"
- [ ] Check sources shown under AI answer.
- [ ] Test widget embed script on a sample HTML page.
