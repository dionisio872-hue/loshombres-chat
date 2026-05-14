const SYSTEM_PROMPT = `Você é o assistente virtual do Estúdio Los Hombres, estúdio de massagens masculinas de alto padrão em Belo Horizonte. Atende com sofisticação, calor humano e sem julgamentos.

IDENTIDADE: Tom acolhedor, discreto, profissional, levemente descontraído. Nunca seja robótico.

UNIDADES:
- Savassi: Rua Tomé de Souza, 503, Sala 208
- Betim: Rua Pernambuco, 341 - Bairro Nossa Senhora das Graças
- WhatsApp: (31) 98324-4713

MASSAGENS:
1. Relaxante Sensual, 2. Tântrica Experience (inclui Lingam), 3. Quick Massage (25min), 4. Miofascial, 5. Nuru Summa (corpo a corpo com gel, ambos nus), 6. Tântrica Mútua (ambos nus), 7. Blind Experience (privação visual), 8. Massagem dos Deuses (vinho + petiscos), 9. HOT, 10. Tie and Teaser BDSM, 11. Hidrotantra (banheira), 12. Burn (estímulos térmicos), 13. Summa Experientia R$1.350 (ÚNICA com interação íntima, PrEP+preservativo), 14. Massagem 4 Mãos, 15. Podoloterapia, 16. Tântrica Casal, 17. Relaxante Sensual Casal, 18. Nuru Casal.
Valores: https://www.loshombres.com.br/tabela.html

AGENDAMENTO:
- Sinal R$30 via PIX CNPJ 17342740000109 (JG Espaço Multserviços)
- Cancelamento <12h: sinal retido. Trazer RG ou CNH.
- Agenda Savassi: https://calendar.app.google/jBk4U8zf5WGb73MH6
- Agenda Betim: https://calendar.app.google/dandDDiGYKtD36Q19

REGRAS:
- "Tem sexo?" → Não inclui sexo, exceto Summa Experientia (única com interação íntima, protocolo PrEP+preservativo)
- Tatuagem → WhatsApp 31991266270
- Conteúdo adulto → WhatsApp 31987862117
- Vagas → formulário + WhatsApp (31) 98787-0330
- Micose → aguardar cicatrização
- Vergonha do corpo → atende todos os corpos, sem julgamento

FLUXO: boas-vindas → identificar o que busca → sugerir massagem → informar valor → se quiser agendar: perguntar unidade → link agenda → confirmar sinal R$30 PIX.

Site: https://www.loshombres.com.br/ | Quiz: https://www.loshombres.com.br/quiz.html`;

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // ===== GET — servir página HTML =====
  if (req.method === 'GET') {
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>Los Hombres — Atendimento</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0b141a;
    --chat-bg: #0b141a;
    --header-bg: #202c33;
    --input-bg: #2a3942;
    --bot-bubble: #202c33;
    --user-bubble: #005c4b;
    --text: #e9edef;
    --subtext: #8696a0;
    --gold: #c9a84c;
    --green: #00a884;
    --border: #2a3942;
  }
  html, body { height: 100%; overflow: hidden; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  /* HEADER */
  header {
    background: var(--header-bg);
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 60px;
    flex-shrink: 0;
  }
  .avatar {
    width: 40px; height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #c9a84c, #8b6914);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; font-weight: 700; color: #fff;
    flex-shrink: 0;
  }
  .header-text { flex: 1; }
  .header-name { font-size: 16px; font-weight: 600; color: var(--text); }
  .header-status { font-size: 12px; color: var(--green); margin-top: 1px; }

  /* WALLPAPER / CHAT AREA */
  #chat {
    flex: 1;
    overflow-y: auto;
    padding: 12px 6%;
    display: flex;
    flex-direction: column;
    gap: 3px;
    background-color: #0b141a;
    background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23182229' fill-opacity='0.8'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  }
  #chat::-webkit-scrollbar { width: 5px; }
  #chat::-webkit-scrollbar-thumb { background: #2a3942; border-radius: 3px; }

  /* MESSAGES */
  .msg-row {
    display: flex;
    margin: 2px 0;
  }
  .msg-row.bot { justify-content: flex-start; }
  .msg-row.user { justify-content: flex-end; }

  .bubble {
    max-width: 75%;
    padding: 8px 12px 6px;
    border-radius: 8px;
    font-size: 14.5px;
    line-height: 1.5;
    position: relative;
    word-wrap: break-word;
  }
  .msg-row.bot .bubble {
    background: var(--bot-bubble);
    border-top-left-radius: 0;
    color: var(--text);
  }
  .msg-row.user .bubble {
    background: var(--user-bubble);
    border-top-right-radius: 0;
    color: var(--text);
  }
  .bubble .time {
    font-size: 11px;
    color: var(--subtext);
    float: right;
    margin-left: 8px;
    margin-top: 2px;
  }
  .bubble a { color: #53bdeb; word-break: break-all; }

  /* TAIL */
  .msg-row.bot .bubble::before {
    content: '';
    position: absolute;
    top: 0; left: -8px;
    border: 8px solid transparent;
    border-top-color: var(--bot-bubble);
    border-right-color: var(--bot-bubble);
    border-top-left-radius: 2px;
  }
  .msg-row.user .bubble::before {
    content: '';
    position: absolute;
    top: 0; right: -8px;
    border: 8px solid transparent;
    border-top-color: var(--user-bubble);
    border-left-color: var(--user-bubble);
    border-top-right-radius: 2px;
  }

  /* DATE DIVIDER */
  .date-divider {
    text-align: center;
    margin: 10px 0;
  }
  .date-divider span {
    background: #182229;
    color: var(--subtext);
    font-size: 12px;
    padding: 4px 12px;
    border-radius: 8px;
  }

  /* TYPING */
  .typing-row { display: flex; justify-content: flex-start; margin: 2px 0; }
  .typing-bubble {
    background: var(--bot-bubble);
    border-radius: 8px; border-top-left-radius: 0;
    padding: 12px 16px;
    display: flex; gap: 4px; align-items: center;
  }
  .typing-bubble span {
    width: 7px; height: 7px;
    background: var(--subtext);
    border-radius: 50%;
    animation: bounce 1.3s infinite;
    display: block;
  }
  .typing-bubble span:nth-child(2) { animation-delay: 0.2s; }
  .typing-bubble span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes bounce { 0%,60%,100% { transform: translateY(0); opacity: 0.6; } 30% { transform: translateY(-5px); opacity: 1; } }

  /* QUICK REPLIES */
  #quickArea {
    background: var(--header-bg);
    padding: 8px 12px;
    display: flex;
    gap: 8px;
    overflow-x: auto;
    flex-shrink: 0;
    border-top: 1px solid var(--border);
  }
  #quickArea::-webkit-scrollbar { display: none; }
  .qbtn {
    background: #2a3942;
    border: 1px solid #3b4a54;
    color: var(--green);
    border-radius: 20px;
    padding: 6px 14px;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s;
    flex-shrink: 0;
  }
  .qbtn:hover { background: #3b4a54; }

  /* INPUT AREA */
  footer {
    background: var(--header-bg);
    padding: 8px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    border-top: 1px solid var(--border);
  }
  #input {
    flex: 1;
    background: var(--input-bg);
    border: none;
    border-radius: 24px;
    padding: 10px 16px;
    color: var(--text);
    font-size: 15px;
    outline: none;
    resize: none;
    max-height: 120px;
    min-height: 44px;
    line-height: 1.4;
    font-family: inherit;
  }
  #input::placeholder { color: var(--subtext); }
  #sendBtn {
    width: 44px; height: 44px;
    background: var(--green);
    border: none; border-radius: 50%;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.1s;
    flex-shrink: 0;
  }
  #sendBtn:hover { transform: scale(1.05); background: #00c99e; }
  #sendBtn:disabled { background: #3b4a54; cursor: not-allowed; transform: none; }
  #sendBtn svg { width: 20px; height: 20px; fill: white; }
</style>
</head>
<body>

<header>
  <div class="avatar">L</div>
  <div class="header-text">
    <div class="header-name">Los Hombres Estúdio Spa</div>
    <div class="header-status">● online agora</div>
  </div>
</header>

<div id="chat">
  <div class="date-divider"><span>hoje</span></div>
</div>

<div id="quickArea">
  <button class="qbtn" onclick="quick('Quais massagens vocês oferecem?')">💆 Massagens</button>
  <button class="qbtn" onclick="quick('Quero agendar uma sessão')">📅 Agendar</button>
  <button class="qbtn" onclick="quick('Quanto custa?')">💰 Preços</button>
  <button class="qbtn" onclick="quick('Tem atendimento para casais?')">👫 Casais</button>
  <button class="qbtn" onclick="quick('Onde fica o estúdio?')">📍 Localização</button>
</div>

<footer>
  <textarea id="input" placeholder="Mensagem" rows="1"></textarea>
  <button id="sendBtn" disabled>
    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
  </button>
</footer>

<script>
const chatEl = document.getElementById('chat');
const inputEl = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');
const history = [];
const ENDPOINT = '${url.origin}${url.pathname}';

function now() {
  return new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
}

function addMsg(text, role) {
  const row = document.createElement('div');
  row.className = 'msg-row ' + role;
  const b = document.createElement('div');
  b.className = 'bubble';
  const safe = text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\\n/g,'<br>')
    .replace(/(https?:\\/\\/[^\\s<]+)/g,'<a href="$1" target="_blank">$1</a>')
    .replace(/\\*\\*(.+?)\\*\\*/g,'<strong>$1</strong>');
  b.innerHTML = safe + '<span class="time">' + now() + '</span>';
  row.appendChild(b);
  chatEl.appendChild(row);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function showTyping() {
  const row = document.createElement('div');
  row.className = 'typing-row'; row.id = 'typing';
  row.innerHTML = '<div class="typing-bubble"><span></span><span></span><span></span></div>';
  chatEl.appendChild(row);
  chatEl.scrollTop = chatEl.scrollHeight;
}
function hideTyping() { const t = document.getElementById('typing'); if(t) t.remove(); }

async function send(text) {
  text = text.trim();
  if (!text) return;
  document.getElementById('quickArea').style.display = 'none';
  addMsg(text, 'user');
  history.push({role:'user', content:text});
  inputEl.value = ''; inputEl.style.height = 'auto';
  sendBtn.disabled = true;
  showTyping();
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({message: text, history: history.slice(-12)})
    });
    const data = await res.json();
    hideTyping();
    const reply = data.reply || 'Desculpe, tente novamente.';
    addMsg(reply, 'bot');
    history.push({role:'assistant', content:reply});
  } catch(e) {
    hideTyping();
    addMsg('Erro de conexão. Tente novamente.', 'bot');
  }
  sendBtn.disabled = false;
  inputEl.focus();
}

function quick(t) { send(t); }

sendBtn.onclick = () => send(inputEl.value);

inputEl.addEventListener('input', () => {
  sendBtn.disabled = !inputEl.value.trim();
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
});

inputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(inputEl.value); }
});

// Mensagem inicial
setTimeout(() => {
  addMsg('Olá! Seja bem-vindo ao Estúdio Los Hombres 🖤\\n\\nSou o assistente virtual, aqui pra te ajudar a escolher a experiência ideal, tirar dúvidas e facilitar seu agendamento.\\n\\nComo posso te ajudar hoje?', 'bot');
}, 500);
</script>
</body>
</html>`;
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
    });
  }

  // ===== OPTIONS (CORS) =====
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  // ===== POST — processar mensagem =====
  try {
    const body = await req.json().catch(() => ({}));
    const { message, history = [] } = body;
    if (!message) return Response.json({ error: 'message obrigatório' }, { status: 400 });

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-12),
      { role: 'user', content: message }
    ];

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages, temperature: 0.7, max_tokens: 500 })
    });

    const aiData = await aiRes.json();
    if (!aiRes.ok) return Response.json({ error: aiData.error?.message || 'Erro OpenAI' }, { status: 500 });

    const reply = aiData.choices?.[0]?.message?.content || 'Desculpe, não consegui processar.';
    return Response.json({ reply }, { headers: { 'Access-Control-Allow-Origin': '*' } });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
});
