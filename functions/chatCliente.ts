import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SYSTEM_PROMPT = `Você é o assistente virtual do Estúdio Los Hombres, estúdio de massagens masculinas de alto padrão em Belo Horizonte. Atende com sofisticação, calor humano e sem julgamentos.

## IDENTIDADE
- Nome: Assistente Los Hombres
- Tom: acolhedor, discreto, profissional, levemente descontraído
- Nunca seja robótico. Fale como uma pessoa real, calorosa.

## UNIDADES
- Savassi: Rua Tomé de Souza, 503, Sala 208
- Betim: Rua Pernambuco, 341 - Bairro Nossa Senhora das Graças
- WhatsApp: (31) 98324-4713

## MASSAGENS DISPONÍVEIS E VALORES
Consulte sempre: https://www.loshombres.com.br/tabela.html
Modalidades:
1. Relaxante Sensual — relaxamento com toque sensorial envolvente
2. Tântrica Experience — bioenergética, sensorial, inclui Lingam Massagem
3. Quick Massage — 25 min, técnica oriental
4. Miofascial — liberação miofascial + massagem esportiva
5. Nuru Summa — corpo a corpo com gel, ambos nus
6. Tântrica Mútua — toque consciente mútuo, ambos nus
7. Blind Experience — privação visual, sensações amplificadas
8. Massagem dos Deuses — imersão sensorial com vinho e petiscos
9. HOT — estímulos sensoriais localizados
10. Tie and Teaser (BDSM) — sensorial com controle e provocação
11. Hidrotantra — vivência aquática + banheira de hidromassagem
12. Burn — estímulos térmicos e sensoriais
13. Summa Experientia — experiência máxima. R$ 1.350,00. ÚNICA com interação íntima. PrEP + preservativo.
14. Massagem 4 Mãos — dois terapeutas em sincronia
15. Podoloterapia — foco nos pés
16. Tântrica Casal / Relaxante Sensual Casal / Nuru Casal — para casais

## AGENDAMENTO
- Sinal: R$ 30,00 via PIX CNPJ 17342740000109 (JG Espaço Multserviços)
- Cancelamento menos de 12h: sinal retido
- Trazer RG ou CNH
- Agenda Savassi: https://calendar.app.google/jBk4U8zf5WGb73MH6
- Agenda Betim: https://calendar.app.google/dandDDiGYKtD36Q19

## REGRAS
- "Tem sexo?" → Não inclui relação sexual, exceto Summa Experientia (única com interação íntima integrada, com protocolo de segurança: PrEP + preservativo)
- Tatuagem → direcionar para WhatsApp 31991266270
- Conteúdo adulto → direcionar para WhatsApp 31987862117
- Recrutamento → https://docs.google.com/forms/d/e/1FAIpQLSf2a8ePAZy44mArO-zijJPt23RQHyB4a1G5FILIffz8XJQqjQ/viewform + WhatsApp (31) 98787-0330
- Micose/pele → aguardar cicatrização completa
- Vergonha do corpo → atende corpos reais, sem julgamento

## FLUXO DE ATENDIMENTO
1. Boas-vindas calorosas, perguntar o que busca
2. Identificar a massagem ideal
3. Informar valor
4. Se quiser agendar: perguntar unidade (Savassi ou Betim) → mandar link da agenda
5. Confirmar sinal de R$ 30,00 via PIX

## LINKS ÚTEIS
- Site: https://www.loshombres.com.br/
- Quiz para escolher massagem: https://www.loshombres.com.br/quiz.html
- Tabela de preços: https://www.loshombres.com.br/tabela.html
- WhatsApp direto: https://wa.me/5531983244713

Seja sempre discreto, acolhedor e profissional. Jamais julgue. O cliente pode ter dúvidas íntimas — responda com naturalidade e respeito.`;

Deno.serve(async (req) => {
  try {
    // Servir a página HTML via GET
    if (req.method === 'GET') {
      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Los Hombres — Atendimento</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', sans-serif;
      background: #0a0a0f;
      color: #f0f0f0;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid #2a2a4a;
      box-shadow: 0 2px 20px rgba(0,0,0,0.5);
    }
    .logo-circle {
      width: 44px; height: 44px;
      background: linear-gradient(135deg, #c9a84c, #f0d080);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; font-weight: bold; color: #1a1a2e;
      flex-shrink: 0;
    }
    .header-info h1 { font-size: 17px; font-weight: 600; color: #f0d080; letter-spacing: 0.5px; }
    .header-info p { font-size: 12px; color: #888; margin-top: 2px; }
    .status-dot { width: 8px; height: 8px; background: #4ade80; border-radius: 50%; display: inline-block; margin-right: 5px; }
    #chat {
      flex: 1;
      overflow-y: auto;
      padding: 20px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scroll-behavior: smooth;
    }
    .msg {
      max-width: 80%;
      padding: 11px 15px;
      border-radius: 18px;
      font-size: 14px;
      line-height: 1.5;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .msg.bot {
      background: #1e1e3a;
      color: #e8e8f0;
      border-bottom-left-radius: 4px;
      align-self: flex-start;
      border: 1px solid #2a2a4a;
    }
    .msg.user {
      background: linear-gradient(135deg, #c9a84c, #b8942a);
      color: #1a1a0a;
      border-bottom-right-radius: 4px;
      align-self: flex-end;
      font-weight: 500;
    }
    .msg a { color: #c9a84c; }
    .msg.user a { color: #1a1a0a; }
    .typing {
      display: flex; gap: 4px; align-items: center;
      padding: 12px 16px;
      background: #1e1e3a;
      border-radius: 18px; border-bottom-left-radius: 4px;
      align-self: flex-start;
      border: 1px solid #2a2a4a;
    }
    .typing span {
      width: 7px; height: 7px; background: #c9a84c;
      border-radius: 50%; animation: bounce 1.2s infinite;
    }
    .typing span:nth-child(2) { animation-delay: 0.2s; }
    .typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
    footer {
      padding: 12px 16px;
      background: #111120;
      border-top: 1px solid #2a2a4a;
      display: flex; gap: 10px; align-items: center;
    }
    #input {
      flex: 1;
      background: #1e1e3a;
      border: 1px solid #2a2a4a;
      border-radius: 24px;
      padding: 11px 18px;
      color: #f0f0f0;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }
    #input:focus { border-color: #c9a84c; }
    #input::placeholder { color: #555; }
    #send {
      width: 44px; height: 44px;
      background: linear-gradient(135deg, #c9a84c, #b8942a);
      border: none; border-radius: 50%;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: transform 0.1s, opacity 0.2s;
      flex-shrink: 0;
    }
    #send:hover { transform: scale(1.05); }
    #send:disabled { opacity: 0.4; cursor: not-allowed; }
    #send svg { width: 18px; height: 18px; fill: #1a1a0a; }
    .quick-btns {
      display: flex; flex-wrap: wrap; gap: 8px;
      padding: 0 16px 12px;
      background: #111120;
    }
    .quick-btn {
      background: #1e1e3a; border: 1px solid #2a2a4a;
      color: #c9a84c; border-radius: 20px;
      padding: 7px 14px; font-size: 13px;
      cursor: pointer; transition: all 0.2s;
    }
    .quick-btn:hover { background: #c9a84c; color: #1a1a0a; border-color: #c9a84c; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #2a2a4a; border-radius: 2px; }
  </style>
</head>
<body>
  <header>
    <div class="logo-circle">L</div>
    <div class="header-info">
      <h1>Los Hombres Estúdio Spa</h1>
      <p><span class="status-dot"></span>Online agora • BH — Savassi & Betim</p>
    </div>
  </header>

  <div id="chat"></div>

  <div class="quick-btns" id="quickBtns">
    <button class="quick-btn" onclick="sendQuick('Quais massagens vocês oferecem?')">💆 Ver massagens</button>
    <button class="quick-btn" onclick="sendQuick('Quero agendar uma sessão')">📅 Agendar</button>
    <button class="quick-btn" onclick="sendQuick('Quanto custa?')">💰 Preços</button>
    <button class="quick-btn" onclick="sendQuick('Tem atendimento para casais?')">👫 Casais</button>
  </div>

  <footer>
    <input id="input" type="text" placeholder="Digite sua mensagem..." autocomplete="off" />
    <button id="send">
      <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
    </button>
  </footer>

  <script>
    const chat = document.getElementById('chat');
    const input = document.getElementById('input');
    const sendBtn = document.getElementById('send');
    const history = [];

    function addMsg(text, role) {
      const div = document.createElement('div');
      div.className = 'msg ' + role;
      div.innerHTML = text.replace(/\\n/g, '<br>').replace(/(https?:\\/\\/[^\\s<]+)/g, '<a href="$1" target="_blank">$1</a>');
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
      return div;
    }

    function showTyping() {
      const div = document.createElement('div');
      div.className = 'typing'; div.id = 'typing';
      div.innerHTML = '<span></span><span></span><span></span>';
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    }

    function removeTyping() {
      const t = document.getElementById('typing');
      if (t) t.remove();
    }

    async function send(text) {
      if (!text.trim()) return;
      document.getElementById('quickBtns').style.display = 'none';
      addMsg(text, 'user');
      history.push({ role: 'user', content: text });
      input.value = '';
      sendBtn.disabled = true;
      showTyping();
      try {
        const res = await fetch(window.location.href, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history: history.slice(-10) })
        });
        const data = await res.json();
        removeTyping();
        const reply = data.reply || 'Desculpe, tive um problema. Tente novamente.';
        addMsg(reply, 'bot');
        history.push({ role: 'assistant', content: reply });
      } catch(e) {
        removeTyping();
        addMsg('Desculpe, ocorreu um erro. Tente novamente em instantes.', 'bot');
      }
      sendBtn.disabled = false;
      input.focus();
    }

    function sendQuick(text) { input.value = text; send(text); }

    sendBtn.onclick = () => send(input.value);
    input.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); } };

    // Mensagem de boas-vindas
    setTimeout(() => {
      addMsg('Olá! Seja bem-vindo ao Estúdio Los Hombres 🖤\\n\\nSou o assistente virtual e estou aqui pra te ajudar a escolher a experiência ideal, tirar dúvidas e facilitar seu agendamento.\\n\\nComo posso te ajudar hoje?', 'bot');
    }, 400);
  </script>
</body>
</html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // POST — processar mensagem do cliente
    const body = await req.json().catch(() => ({}));
    const { message, history = [] } = body;

    if (!message) return Response.json({ error: 'message obrigatório' }, { status: 400 });

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-10),
      { role: 'user', content: message }
    ];

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 600
      })
    });

    const aiData = await aiRes.json();
    const reply = aiData.choices?.[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.';

    return Response.json({ reply });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
