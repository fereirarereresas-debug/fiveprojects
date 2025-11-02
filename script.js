/* script.js
   Controle de interações e envio anônimo de logs.
   NOTA IMPORTANTE: Recomendamos configurar um endpoint servidor (/api/log) que encaminhe
   os logs ao webhook do Discord. Enviar diretamente do navegador para um webhook do Discord
   pode expor o IP do visitante ao Discord (não recomendado).
*/

/* CONFIG -> ajuste conforme necessário:
   - mode: "proxy" (recomendado) envia para LOG_ENDPOINT (ex: /api/log) que deve existir no seu servidor.
   - mode: "direct" envia diretamente para DISCORD_WEBHOOK_URL (pode falhar por CORS e expõe IP).
*/
const CONFIG = {
  mode: "proxy", // "proxy" ou "direct"
  // Se mode === "proxy": defina um endpoint que aceite POST JSON { event, description, page, timestamp }
  LOG_ENDPOINT: "/api/log",
  // Se mode === "direct": coloque a URL do webhook aqui (não recomendado no cliente)
  DISCORD_WEBHOOK_URL: "https://discordapp.com/api/webhooks/1434621471707107378/u-JzEqQ5D22kWKyJeP_qv0MgOZaKMK3jcB96ocH8EPOoSv2PFEORm1bbb8Jr8b_R2WsR"
};

/* Formata data local YYYY-MM-DD HH:MM:SS */
function nowLocalString() {
  const d = new Date();
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/* Monta o payload conforme o exemplo fornecido (sem dados pessoais) */
function makeDiscordPayload(eventName, description, page) {
  return {
    content: "**Novo evento no site Five Spoofer**",
    embeds: [{
      title: "Interação registrada",
      description: description,
      color: 3447003,
      fields: [
        { name: "Evento", value: eventName, inline: true },
        { name: "Horário", value: nowLocalString(), inline: true },
        { name: "Página", value: page, inline: true }
      ]
    }]
  };
}

/* Envia log:
   - Quando em proxy: envia um JSON simples para LOG_ENDPOINT; o servidor deverá encaminhar ao Discord.
   - Quando em direct: envia diretamente para o webhook (pode estar bloqueado por CORS).
   Em ambos os casos NENHUM dado pessoal é adicionado (sem IP explícito no corpo, sem cookies, sem UA).
*/
async function sendLog(eventName, description, page = "index.html") {
  try {
    const payload = makeDiscordPayload(eventName, description, page);

    if (CONFIG.mode === "proxy") {
      // Envia para o seu endpoint de proxy. Recomendado: o endpoint adiciona o webhook e envia ao Discord.
      await fetch(CONFIG.LOG_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // enviamos SOMENTE o necessário
        body: JSON.stringify({ payload })
      });
    } else {
      // Modo direto (NÃO RECOMENDADO): envia o payload diretamente ao webhook do Discord.
      await fetch(CONFIG.DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        // AVISO: ao fazer isso, o Discord receberá a requisição do navegador do visitante
        // e poderá conhecer o IP. Use apenas em cenários onde aceito esse efeito.
      });
    }

  } catch (err) {
    // Silenciar erros para não prejudicar a UX; você pode logar no console para depuração.
    console.debug("sendLog error:", err);
  }
}

/* Associa eventos aos botões com postura anônima (SEM coleta de dados pessoais) */
document.addEventListener("DOMContentLoaded", () => {
  // Atualiza ano no rodapé automaticamente
  document.getElementById("year").textContent = new Date().getFullYear();

  // Botões
  const discordBtns = document.querySelectorAll("#discordBtn, #discordBtnMain, #supportDiscordBtn");
  discordBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      // Registrar evento assíncrono; não previne navegação
      sendLog("BOTÃO DISCORD CLICADO", "O botão 'Entrar no Discord' foi clicado.", "index.html");
      // Não modificar o comportamento do link (abre nova aba por target=_blank)
    });
  });

  const downloadBtn = document.getElementById("downloadBtn");
  downloadBtn.addEventListener("click", (e) => {
    // Botão desativado: ainda assim registramos a tentativa
    sendLog("BOTÃO DOWNLOAD CLICADO", "O botão 'Baixar (em breve)' foi clicado.", "index.html");
    // Mostrar feedback visual curto
    downloadBtn.classList.add("flash");
    setTimeout(()=> downloadBtn.classList.remove("flash"), 700);
  });
});
