/**
 * server-proxy.js
 * Exemplo simples de proxy em Node/Express que recebe logs do cliente e envia ao webhook do Discord.
 *
 * Recomendado: execute este servidor no seu backend (Heroku, VPS, serverless, Cloud Run, etc).
 * Configure a variável de ambiente DISCORD_WEBHOOK_URL com a URL do webhook.
 *
 * Observações de privacidade:
 * - Este proxy NÃO repassa cabeçalhos do cliente (ex: IP, user-agent) ao Discord — assim o Discord verá apenas
 *   o IP do servidor/proxy, preservando o anonimato dos visitantes.
 * - NÃO grave IPs/localmente; apenas encaminhe o payload mínimo.
 */

const express = require('express');
const fetch = require('node-fetch'); // se estiver no Node 18+, pode usar fetch global
const app = express();
app.use(express.json());

const WEBHOOK = process.env.DISCORD_WEBHOOK_URL || "<INSIRA_AQUI_O_SEU_WEBHOOK>";
if (!WEBHOOK) {
  console.warn("AVISO: DISCORD_WEBHOOK_URL não configurado. Defina a variável de ambiente.");
}

app.post('/api/log', async (req, res) => {
  try {
    // Espera um body { payload }
    const { payload } = req.body || {};
    if (!payload) return res.status(400).json({ ok:false, message: "payload missing" });

    // Envia ao webhook do Discord. NÃO anexa cabeçalhos do cliente.
    await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // Responde imediatamente ao cliente
    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao enviar webhook:", err);
    res.status(500).json({ ok:false, message: "failed to forward" });
  }
});

// Porta padrão para desenvolvimento
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Log proxy rodando na porta ${PORT}`));