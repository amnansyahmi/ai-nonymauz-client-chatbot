# AI-nonymauz Client Chatbot

Template ini ialah contoh sistem untuk jual kepada client sebagai:

1. **Company Knowledge Bot** — staff/client boleh tanya SOP, policy, FAQ, warranty, refund, escalation, dan proses dalaman.
2. **Website Support Bot** — customer boleh tanya soalan biasa di website tanpa tunggu human support.

Frontend dibuat dengan **Next.js App Router** dan sesuai deploy terus ke **Vercel**. API key AI-nonymauz disimpan server-side melalui `.env`, bukan di browser.

## Apa yang ada dalam template ini

- Landing page demo untuk client.
- Chatbot UI siap guna.
- API route `/api/chat` sebagai proxy ke AI-nonymauz backend.
- Knowledge base contoh di `data/knowledge.json`.
- Retrieval ringkas untuk pilih SOP/FAQ paling berkaitan sebelum hantar ke AI.
- Demo fallback kalau env AI-nonymauz belum diset.
- Embeddable widget script di `public/widget.js`.
- Health check endpoint di `/api/health`.

## Flow sistem

```text
User website
  -> ChatWidget.tsx
  -> POST /api/chat
  -> retrieve relevant docs from data/knowledge.json
  -> send system prompt + context + user question to AI-nonymauz /v1/chat/completions
  -> return answer + source titles to UI
```

## Cara run local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment variables

Create `.env.local` untuk local atau set di Vercel Project Settings → Environment Variables.

```bash
AI_NONYMAUZ_BASE_URL=https://your-ai-nonymauz-backend.com/v1
AI_NONYMAUZ_API_KEY=your-secret-api-key
AI_NONYMAUZ_MODEL=ai-nonymauz-support
CLIENT_NAME=DemoCare Sdn Bhd
CHATBOT_NAME=DemoCare AI Assistant
SUPPORT_EMAIL=support@example.com
```

Nota penting:

- Jangan guna `NEXT_PUBLIC_` untuk API key.
- `AI_NONYMAUZ_BASE_URL` mesti OpenAI-compatible, contoh endpoint akhir akan jadi:

```text
https://your-ai-nonymauz-backend.com/v1/chat/completions
```

## Cara deploy ke Vercel

1. Extract zip ini.
2. Push folder ke GitHub repository.
3. Import repo dalam Vercel.
4. Set environment variables di Vercel:
   - `AI_NONYMAUZ_BASE_URL`
   - `AI_NONYMAUZ_API_KEY`
   - `AI_NONYMAUZ_MODEL`
   - `CLIENT_NAME`
   - `CHATBOT_NAME`
   - `SUPPORT_EMAIL`
5. Deploy.

## Cara tukar knowledge base client

Edit file:

```text
data/knowledge.json
```

Format contoh:

```json
{
  "id": "warranty-policy",
  "title": "Warranty Policy",
  "category": "policy",
  "content": "Standard warranty is 12 months from invoice date..."
}
```

Tambah SOP/FAQ/policy baru dalam array `documents`.

## Cara embed chatbot dalam website client lain

Lepas deploy ke Vercel, letak script ini dalam website client:

```html
<script
  src="https://YOUR-VERCEL-DOMAIN.vercel.app/widget.js"
  data-chatbot-url="https://YOUR-VERCEL-DOMAIN.vercel.app/chat"
></script>
```

Ini akan tambah floating chat button di website client.

## Cara jadikan ini product berbayar

Cadangan package:

- Starter: RM299 setup + RM49/month
- Business: RM499 setup + RM149/month
- Custom SOP/RAG: RM999 setup + RM299/month

Apa yang boleh charge:

- Setup knowledge base client.
- Customize branding/color/copywriting.
- Add FAQ/SOP monthly.
- Add WhatsApp/email handover.
- Add analytics/logging.
- Add dashboard admin.

## Limitasi template ini

Template ini sengaja dibuat simple untuk Vercel free/low-cost.

- Knowledge base masih guna JSON file, belum ada database/admin upload.
- Retrieval ialah keyword scoring ringkas, bukan vector database.
- Tiada auth/admin panel.
- Tiada chat log storage.
- Tiada streaming response.

Untuk production client besar, upgrade seterusnya:

- Supabase/Postgres untuk client data dan chat logs.
- Proper BM25/vector search.
- Admin panel untuk upload PDF/SOP.
- Tenant support untuk banyak client dalam satu system.
- Rate limit dan abuse protection.
- Human handover workflow.

## File penting

```text
app/page.tsx              Landing page + demo
components/ChatWidget.tsx Chat UI
app/api/chat/route.ts     Server-side chat API proxy
lib/retrieval.ts          Local knowledge retrieval
lib/aiNonymauz.ts         AI-nonymauz OpenAI-compatible client
data/knowledge.json       Client knowledge base
public/widget.js          Embeddable website widget
.env.example              Env reference
```


## Vercel build troubleshooting

If Vercel shows `Module not found: Can't resolve "@/..."`, this patched version uses relative imports and also includes `baseUrl` + `paths` in `tsconfig.json`. Make sure your GitHub repo root is the folder that contains `package.json`, `app/`, `components/`, `lib/`, and `data/`.

Correct repo root:

```text
ai-nonymauz-client-chatbot/
  package.json
  app/
  components/
  lib/
  data/
```

Wrong repo root example:

```text
repo/
  something-else/
  ai-nonymauz-client-chatbot/
    package.json
```

If you use the wrong root, set Vercel **Root Directory** to `ai-nonymauz-client-chatbot`.
