/* script.js
   Envio direto de logs ao webhook do Discord (modo DIRETO).
   ------------------------------
   AVISO IMPORTANTE:
   - Este arquivo envia os eventos diretamente do navegador para o webhook do Discord.
   - Enviar diretamente expõe o IP do visitante ao Discord e torna o webhook visível no código-fonte.
   - Recomendação forte: usar um proxy no servidor (endpoint /api/log) que contenha a WEBHOOK URL e
     reencaminhe as mensagens ao Discord (assim o Discord verá apenas o IP do servidor).
   ------------------------------
   O payload enviado contém APENAS:
     - Tipo de evento (ex: BOTÃO DISCORD CLICADO)
     - Timestamp local formatado (YYYY-MM-DD HH:MM:SS)
     - Página (index.html)
   Nenhuma informação pessoal, cabeçalhos, cookies, user-agent ou IP são adicionados ao corpo do payload.
*/

/* === CONFIG - coloque aqui o webhook que você forneceu === */
const DISCORD_WEBHOOK_URL = "https://discordapp.com/api/webhooks/1434621471707107378/u-JzEqQ5D22kWKyJeP_qv0MgOZaKMK3jcB96ocH8EPOoSv2PFEORm1bbb8Jr8b_R2WsR";

/* Formata data local YYYY-MM-DD HH:MM:SS */
function nowLocalString() {
  const d = new Date();
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/* Monta o payload conforme o exemplo solicitado */
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

/* Envia o payload diretamente ao webhook do Discord.
   Observação: CORS pode bloquear requisições diretas dependendo do agente; o fetch é a tentativa padrão.
*/
async function sendLogDirect(eventName, description, page = "index.html") {
  try {
    const payload = makeDiscordPayload(eventName, description, page);
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    // Não interromper a UX por falha de log; apenas debug no console.
    console.debug("sendLogDirect error:", err);
  }
}

/* Associação de eventos aos botões */
document.addEventListener("DOMContentLoaded", () => {
  // Atualiza o ano no rodapé automaticamente
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Seleciona botões que abrem o Discord
  const discordBtns = document.querySelectorAll("#discordBtn, #discordBtnMain, #supportDiscordBtn");
  discordBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      // Registro assíncrono sem bloquear navegação
      sendLogDirect("BOTÃO DISCORD CLICADO", "O botão 'Entrar no Discord' foi clicado.", "index.html");
    });
  });

  // Botão download (desativado), ainda registramos tentativas
  const downloadBtn = document.getElementById("downloadBtn");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", (e) => {
      // Registrar a tentativa de download
      sendLogDirect("BOTÃO DOWNLOAD CLICADO", "O botão 'Baixar (em breve)' foi clicado.", "index.html");
      // Feedback visual curto
      downloadBtn.classList.add("flash");
      setTimeout(()=> downloadBtn.classList.remove("flash"), 700);
    });
  }
});