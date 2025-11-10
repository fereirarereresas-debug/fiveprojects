# 🚀 Guia de Deploy - FiveProjects

## Deploy na Vercel (Mais Rápido e Recomendado)

### Método 1: Via GitHub

1. **Push para GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: FiveProjects website"
   git branch -M main
   git remote add origin https://github.com/fereirarereresas-debug/fiveprojects.git
   git push -u origin main
   ```

2. **Conectar com Vercel**
   - Acesse [vercel.com](https://vercel.com)
   - Clique em "Import Project"
   - Selecione o repositório `fiveprojects`
   - Vercel detectará automaticamente Next.js
   - Clique em "Deploy"

### Método 2: Via CLI

```bash
# Instale Vercel CLI
npm i -g vercel

# Faça login
vercel login

# Deploy
vercel

# Deploy para produção
vercel --prod
```

## Deploy em Outras Plataformas

### Netlify

1. Build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`

### Railway

```bash
# Instale Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### Docker (Self-hosted)

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
# Build
docker build -t fiveprojects .

# Run
docker run -p 3000:3000 fiveprojects
```

## Variáveis de Ambiente

Adicione no painel da plataforma:

```env
NEXT_PUBLIC_SITE_URL=https://seu-dominio.com
NEXT_PUBLIC_DISCORD_INVITE=https://discord.gg/eCxwCsMMD3
```

## Domínio Personalizado

### Vercel
1. Vá em Project Settings → Domains
2. Adicione seu domínio
3. Configure DNS conforme instruções

### Cloudflare (Opcional)
Para CDN e proteção DDoS adicional:
1. Adicione site no Cloudflare
2. Configure nameservers
3. Ative proxy (nuvem laranja)

## Performance Checklist

- ✅ Imagens otimizadas (WebP/AVIF)
- ✅ Code splitting automático (Next.js)
- ✅ Lazy loading de componentes 3D
- ✅ Compressão Gzip/Brotli
- ✅ Cache de assets estáticos
- ✅ Meta tags para SEO

## Monitoramento

### Google Analytics (Opcional)

```typescript
// src/lib/gtag.ts
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID

export const pageview = (url: string) => {
  window.gtag('config', GA_TRACKING_ID, {
    page_path: url,
  })
}
```

Adicione no `layout.tsx`:
```tsx
<Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`} />
```

---

**Status**: ✅ Pronto para deploy!
**Última atualização**: 2025-11-10