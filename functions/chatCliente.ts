// chatCliente — Los Hombres v6
// GET  → serve o HTML do chat
// POST → processa mensagem e retorna resposta

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const APP_ID     = '6a04cc22bf7a0dcea87e3c43';
const SVC_TOKEN  = Deno.env.get('BASE44_SERVICE_TOKEN') || '';
const FOTO       = 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/180c845fb_foto_jonathan_hd.jpg';

const SYSTEM = `Você é o assistente virtual do Estúdio Los Hombres, estúdio de massagens masculinas de alto padrão em BH. Tom acolhedor, discreto, sem julgamentos. NUNCA use travessões (—). Use linguagem natural e pausada.

UNIDADES: Savassi (Rua Tomé de Souza, 503, Sala 208) | Betim (Rua Pernambuco, 341 - Bairro Nossa Sra das Graças)
WhatsApp: (31) 98324-4713

MASSAGENS: Relaxante Sensual, Tântrica Experience (inclui Lingam), Quick Massage (25min), Miofascial, Nuru Summa (corpo a corpo, ambos nus), Tântrica Mútua, Blind Experience, Massagem dos Deuses (vinho+petiscos), HOT, Tie and Teaser BDSM, Hidrotantra (banheira), Burn, Summa Experientia R$1.350 (ÚNICA com interação íntima, PrEP+preservativo), Massagem 4 Mãos, Podoloterapia, Tântrica Casal, Relaxante Sensual Casal, Nuru Casal.
Valores: https://www.loshombres.com.br/tabela.html

AGENDAMENTO: Sinal R$30 PIX CNPJ 17342740000109 (JG Espaço Multserviços). Cancelamento <12h: sinal retido. Trazer RG ou CNH.
Agenda Savassi: https://calendar.app.google/jBk4U8zf5WGb73MH6
Agenda Betim: https://calendar.app.google/dandDDiGYKtD36Q19

REGRAS: "Tem sexo?" = não, exceto Summa Experientia. Tatuagem = 31991266270. Conteúdo adulto = 31987862117. Vagas = formulário + (31) 98787-0330. Micose = aguardar cicatrização. Vergonha do corpo = atende todos, sem julgamento.

FLUXO: boas-vindas -> identificar o que busca -> sugerir massagem -> valor -> se quiser agendar: perguntar unidade -> link -> confirmar sinal R$30 PIX.`;

async function salvarLead(contato: string, sessaoId: string) {
  try {
    await fetch(`https://base44.app/api/apps/${APP_ID}/entities/LeadConversa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SVC_TOKEN}`,
      },
      body: JSON.stringify({
        whatsapp: contato,
        canal_origem: 'chat_web',
        etapa_funil: 'consulta',
        ultima_mensagem: `Contato informado via chat web - sessão ${sessaoId}`,
        data_ultimo_contato: new Date().toISOString(),
        observacoes: `Sessão chat: ${sessaoId}`,
      }),
    });
  } catch (_) { /* silencioso */ }
}

async function responderIA(msgs: {role:string; content:string}[]): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 350,
      temperature: 0.7,
      messages: [{ role: 'system', content: SYSTEM }, ...msgs],
    }),
  });
  const d = await res.json();
  return d.choices?.[0]?.message?.content?.trim() || 'Pode me chamar no WhatsApp: (31) 98324-4713 😊';
}

const PAGE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Los Hombres — Atendimento</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --gold:#c9a84c;--gold2:#7a5418;
  --bg:#0a0a0a;--surface:#141414;--surf2:#1c1c1c;
  --border:#252525;--text:#f0f0f0;--muted:#555;
  --bot:#0f0f22;--me-start:#b8903e;--me-end:#6b4710;
  --green:#22c55e;
}
html,body{height:100%;background:var(--bg);color:var(--text);
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;overflow:hidden}
.wrap{display:flex;flex-direction:column;height:100dvh;max-width:640px;margin:0 auto}

/* HEADER */
.hdr{
  background:linear-gradient(180deg,#1e1e1e,#121212);
  border-bottom:1px solid var(--border);
  padding:10px 16px;
  display:flex;align-items:center;gap:13px;flex-shrink:0;
}
.av-wrap{position:relative;flex-shrink:0}
.av{
  width:58px;height:58px;border-radius:50%;
  object-fit:cover;object-position:top center;
  border:2.5px solid var(--gold);
  box-shadow:0 0 0 4px rgba(201,168,76,.15);
}
.dot{
  position:absolute;bottom:3px;right:3px;
  width:13px;height:13px;background:var(--green);
  border-radius:50%;border:2.5px solid #141414;
}
.hdr-info{flex:1}
.hdr-info h2{font-size:16px;font-weight:700;color:#fff}
.hdr-info .on{font-size:12px;color:var(--green);font-weight:500;margin-top:1px}
.hdr-info .sub{font-size:11px;color:var(--muted);margin-top:2px}
.logo{font-size:8px;letter-spacing:4px;color:var(--gold);text-transform:uppercase;font-weight:800;line-height:1.8;text-align:right;flex-shrink:0}

.notice{text-align:center;font-size:11px;color:var(--muted);
  padding:4px 12px;background:#0d0d0d;border-bottom:1px solid var(--border);flex-shrink:0}

/* MSGS */
.msgs{flex:1;overflow-y:auto;padding:14px 12px 6px;display:flex;flex-direction:column;gap:10px}
.msgs::-webkit-scrollbar{width:3px}
.msgs::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:2px}

.row{display:flex;align-items:flex-end;gap:7px}
.row.bot{justify-content:flex-start}
.row.me{justify-content:flex-end}
.rav{width:32px;height:32px;border-radius:50%;object-fit:cover;object-position:top center;flex-shrink:0;border:1.5px solid var(--gold)}
.col{display:flex;flex-direction:column;max-width:78%}
.row.me .col{align-items:flex-end}
.bub{padding:10px 14px;border-radius:18px;font-size:14px;line-height:1.6;white-space:pre-wrap;word-break:break-word}
.bub.bot{background:var(--bot);border-bottom-left-radius:4px;border:1px solid #1e1e3a}
.bub.me{background:linear-gradient(135deg,var(--me-start),var(--me-end));border-bottom-right-radius:4px;color:#fff;font-weight:600}
.ts{font-size:10px;color:var(--muted);margin-top:3px;padding:0 3px}

/* TYPING */
.tbub{display:inline-flex;align-items:center;gap:5px;padding:13px 17px;background:var(--bot);border-radius:18px;border-bottom-left-radius:4px;border:1px solid #1e1e3a}
.td{width:7px;height:7px;background:#333;border-radius:50%;animation:b 1.3s infinite}
.td:nth-child(2){animation-delay:.22s}.td:nth-child(3){animation-delay:.44s}
@keyframes b{0%,55%,100%{transform:translateY(0);background:#333}27%{transform:translateY(-7px);background:var(--gold)}}

/* QUICK REPLIES */
.quick{display:flex;gap:8px;overflow-x:auto;padding:8px 12px;background:#0d0d0d;border-top:1px solid var(--border);flex-shrink:0;scrollbar-width:none}
.quick::-webkit-scrollbar{display:none}
.qb{background:var(--surf2);border:1px solid #303030;color:var(--gold);border-radius:20px;padding:7px 14px;font-size:13px;cursor:pointer;white-space:nowrap;flex-shrink:0;font-family:inherit;transition:background .15s}
.qb:hover{background:#252525}

/* INPUT */
.inp-area{background:var(--surface);border-top:1px solid var(--border);padding:10px 13px;display:flex;align-items:flex-end;gap:9px;flex-shrink:0}
#inp{flex:1;background:var(--surf2);border:1.5px solid var(--border);border-radius:22px;padding:11px 15px;font-size:14px;color:var(--text);outline:none;resize:none;max-height:110px;min-height:44px;font-family:inherit;line-height:1.45;transition:border-color .2s}
#inp:focus{border-color:var(--gold)}
#inp::placeholder{color:var(--muted)}
#sbtn{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold2));border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 10px rgba(201,168,76,.3);transition:transform .12s;-webkit-tap-highlight-color:transparent}
#sbtn:active{transform:scale(.9)}
#sbtn:disabled{opacity:.35;cursor:default}
#sbtn svg{display:block;pointer-events:none}

/* FAB */
.fab{position:fixed;bottom:82px;right:14px;background:#229ED9;color:#fff;border-radius:50px;padding:11px 16px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:7px;box-shadow:0 4px 18px rgba(34,158,217,.4);text-decoration:none;z-index:200;-webkit-tap-highlight-color:transparent}
@media(max-width:400px){.fab .ft{display:none}.fab{border-radius:50%;padding:12px;bottom:76px}}
</style>
</head>
<body>
<div class="wrap">

<div class="hdr">
  <div class="av-wrap">
    <img class="av" src="${FOTO}" alt="Jonathan" onerror="this.style.background='#1e1e1e'">
    <div class="dot"></div>
  </div>
  <div class="hdr-info">
    <h2>Jonathan</h2>
    <div class="on">● online agora</div>
    <div class="sub">Massagista · Savassi &amp; Betim · BH</div>
  </div>
  <div class="logo">LOS<br>HOMBRES</div>
</div>

<div class="notice">🔒 Atendimento sigiloso · Suas informações não são compartilhadas</div>

<div class="msgs" id="msgs"></div>

<div class="quick" id="quick">
  <button class="qb" data-q="Quais massagens vocês têm?">💆 Massagens</button>
  <button class="qb" data-q="Quero agendar uma sessão">📅 Agendar</button>
  <button class="qb" data-q="Quanto custa?">💰 Preços</button>
  <button class="qb" data-q="Atende casais?">👫 Casais</button>
  <button class="qb" data-q="Onde fica o estúdio?">📍 Localização</button>
  <button class="qb" data-q="Tem sexo nas massagens?">❓ Dúvidas</button>
</div>

<div class="inp-area">
  <textarea id="inp" rows="1" placeholder="Digite sua mensagem..." maxlength="600"></textarea>
  <button id="sbtn" type="button" disabled>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
  </button>
</div>
</div>

<a class="fab" href="https://t.me/Atendimentoloshombresbot" target="_blank" rel="noopener">
  <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.01 9.47c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.48 14.4l-2.95-.924c-.64-.204-.654-.64.136-.95l11.527-4.444c.537-.194 1.006.131.37.166z"/></svg>
  <span class="ft">Continuar no Telegram</span>
</a>

<script>
var ENDPOINT = location.origin + location.pathname;
var FOTO     = '${FOTO}';

var msgsEl = document.getElementById('msgs');
var inpEl  = document.getElementById('inp');
var sbtnEl = document.getElementById('sbtn');
var quickEl= document.getElementById('quick');
var busy   = false;

// histórico de msgs + estado de captura de contato
var hist = [];
var sessaoId = Math.random().toString(36).slice(2,10);
var contatoCapturado = false;
var aguardandoContato = false;

function hora(){
  var d=new Date();
  return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
}
function scroll(){ msgsEl.scrollTop = msgsEl.scrollHeight; }

function mkAv(){
  var img=document.createElement('img');
  img.className='rav'; img.src=FOTO; img.alt='J'; return img;
}

function addMsg(txt, tipo){
  var row=document.createElement('div'); row.className='row '+tipo;
  if(tipo==='bot') row.appendChild(mkAv());
  var col=document.createElement('div'); col.className='col';
  var bub=document.createElement('div'); bub.className='bub '+tipo; bub.textContent=txt;
  var ts=document.createElement('div'); ts.className='ts'; ts.textContent=hora();
  col.appendChild(bub); col.appendChild(ts); row.appendChild(col);
  msgsEl.appendChild(row); scroll();
}

function showTyping(){
  var row=document.createElement('div'); row.className='row bot'; row.id='typing';
  row.appendChild(mkAv());
  var tb=document.createElement('div'); tb.className='tbub';
  for(var i=0;i<3;i++){var d=document.createElement('div');d.className='td';tb.appendChild(d);}
  row.appendChild(tb); msgsEl.appendChild(row); scroll();
}

function hideTyping(){
  var el=document.getElementById('typing');
  if(el && el.parentNode) el.parentNode.removeChild(el);
}

function isContato(txt){
  // detecta se parece WhatsApp/telefone/email/instagram
  return /(\d[\d\s\-\(\)]{7,})|(@[\w.]+)|([\w.+-]+@[\w.]+\.\w+)/.test(txt);
}

function salvarContato(contato){
  // chama endpoint interno para salvar lead
  fetch(ENDPOINT, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({_salvarContato: true, contato: contato, sessaoId: sessaoId})
  }).catch(function(){});
  contatoCapturado = true;
}

function enviarMsg(txt){
  if(busy) return;
  var trimmed = txt.trim();
  if(!trimmed) return;

  inpEl.value=''; inpEl.style.height='auto';
  busy=true; sbtnEl.disabled=true;

  addMsg(trimmed, 'me');
  hist.push({role:'user', content: trimmed});

  // detectar contato passado naturalmente
  if(!contatoCapturado && isContato(trimmed)){
    salvarContato(trimmed);
  }

  showTyping();

  fetch(ENDPOINT, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      mensagem: trimmed,
      historico: hist.slice(-10),
      sessaoId: sessaoId,
      aguardandoContato: aguardandoContato
    })
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    hideTyping();
    var resposta = d.resposta || 'Pode me chamar no WhatsApp: (31) 98324-4713 😊';
    addMsg(resposta, 'bot');
    hist.push({role:'assistant', content: resposta});
    aguardandoContato = !!d.aguardandoContato;
    busy=false; sbtnEl.disabled=false; inpEl.focus();
  })
  .catch(function(){
    hideTyping();
    addMsg('Tive um probleminha. Chama no WhatsApp: (31) 98324-4713 😊','bot');
    busy=false; sbtnEl.disabled=false;
  });
}

// Quick replies
quickEl.addEventListener('click', function(e){
  var btn = e.target.closest('.qb');
  if(btn && !busy){ enviarMsg(btn.getAttribute('data-q')); }
});

// Textarea auto-resize
inpEl.addEventListener('input', function(){
  sbtnEl.disabled = this.value.trim().length === 0;
  this.style.height='auto';
  this.style.height=Math.min(this.scrollHeight,110)+'px';
});

inpEl.addEventListener('keydown', function(e){
  if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); enviarMsg(this.value); }
});

sbtnEl.addEventListener('click', function(){ enviarMsg(inpEl.value); });

// Boas-vindas iniciais (2 mensagens com delay)
setTimeout(function(){
  addMsg('Olá! Bem-vindo ao Estúdio Los Hombres 😊\n\nSou o Jonathan, massagista especializado em atendimento masculino aqui em BH. Tenho unidades na Savassi e em Betim.', 'bot');
  hist.push({role:'assistant', content: 'Olá! Bem-vindo ao Estúdio Los Hombres. Sou o Jonathan.'});

  setTimeout(function(){
    var msg2 = 'Como posso te ajudar hoje? Pode me perguntar sobre as massagens, valores ou agendamento.\n\nSe quiser, me passa seu WhatsApp ou contato preferido para eu registrar seu atendimento. Mas pode ficar à vontade, não é obrigatório 😉';
    addMsg(msg2, 'bot');
    hist.push({role:'assistant', content: msg2});
    aguardandoContato = true;
  }, 1000);
}, 300);
</script>
</body>
</html>`;

Deno.serve(async (req: Request) => {
  // ── GET → página HTML ──
  if (req.method === 'GET') {
    return new Response(PAGE, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        // Permissivo — scripts inline precisam funcionar
        'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data:; img-src * data:; connect-src *;",
      },
    });
  }

  // ── POST → processar mensagem ──
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch (_) {}

  // Salvar lead (chamada interna)
  if (body._salvarContato) {
    await salvarLead(String(body.contato || ''), String(body.sessaoId || ''));
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const mensagem  = String(body.mensagem || '').slice(0, 600);
  const historico = Array.isArray(body.historico) ? body.historico : [];

  if (!mensagem) {
    return new Response(JSON.stringify({ resposta: 'Pode me chamar no WhatsApp: (31) 98324-4713 😊' }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const msgs = [
    ...historico.map((m: Record<string,string>) => ({ role: m.role, content: m.content })),
    { role: 'user', content: mensagem },
  ];

  const resposta = await responderIA(msgs);

  return new Response(JSON.stringify({ resposta }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
});
