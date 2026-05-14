// chatCliente — Los Hombres v8 — preços embutidos, sem links externos para tabela
// GET  → HTML do chat
// POST → { resposta, audio?, video?, massagem? }

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const APP_ID     = '6a04cc22bf7a0dcea87e3c43';
const SVC_TOKEN  = Deno.env.get('BASE44_SERVICE_TOKEN') || '';
const FOTO       = 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/461551448_jonathan_perfil.jpg';

// ── Tabela de preços real (capturada do site em 14/05/2026) ──
const PRECOS: Record<string, string> = {
  'relaxante sensual':        'R$ 320',
  'relaxante tradicional':    'R$ 250',
  'massagem 4 maos':          'R$ 650',
  'miofascial':               'R$ 320',
  'miofacial':                'R$ 230',
  'ventosaterapia':           'R$ 250',
  'tantra experience':        'R$ 400',
  'tantrica experience':      'R$ 400',
  'hidrotantra':              'R$ 450',
  'tantra mutua':             'R$ 499',
  'tantrica mutua':           'R$ 499',
  'hot massagem':             'R$ 180 a R$ 230',
  'hot':                      'R$ 180 a R$ 230',
  'quick massagem':           'R$ 250',
  'quick massage':            'R$ 250',
  'nuru summa':               'R$ 499',
  'massagem dos deuses':      'R$ 750',
  'burn':                     'R$ 399',
  'summa experientia':        'R$ 1.350',
  'podoloterapia':            'R$ 449',
  'blind experience':         'R$ 499',
  'tie and teaser':           'R$ 450',
  'bdsm':                     'R$ 450',
  'tantrica casal':           'R$ 480 a R$ 800',
  'tantra casal':             'R$ 480 a R$ 800',
  'nuru casal':               'R$ 650',
  'relaxante casal':          'R$ 400 a R$ 800',
  'relaxante sensual casal':  'R$ 400 a R$ 800',
  'massagem as cegas':        'R$ 200',
  'massagem grupo':           'R$ 200',
};

// Lista formatada para o bot responder quando perguntam "quanto custa"
const TABELA_COMPLETA = `
TRADICIONAIS:
• Relaxante Sensual: R$ 320
• Relaxante Tradicional: R$ 250
• Massagem 4 Mãos: R$ 650
• Miofascial: R$ 320
• Ventosaterapia: R$ 250

SENSUAIS:
• Tântrica Experience (Lingam): R$ 400
• Hidrotantra (banheira): R$ 450
• Tântrica Mútua: R$ 499

ERÓTICAS:
• HOT Massagem: R$ 180 a R$ 230
• Quick Massage (25min): R$ 250
• Nuru Summa (corpo a corpo): R$ 499
• Massagem dos Deuses (vinho+petiscos): R$ 750
• Burn: R$ 399
• Summa Experientia: R$ 1.350 ⭐ (única com interação íntima)

FETISH:
• Podoloterapia: R$ 449
• Blind Experience: R$ 499
• Tie and Teaser BDSM: R$ 450

CASAIS:
• Tântrica Casal: R$ 480 a R$ 800
• Nuru Casal: R$ 650
• Relaxante Sensual Casal: R$ 400 a R$ 800

EXPERIÊNCIAS:
• Massagem às Cegas (grupo): R$ 200
`;

// ── Áudios e vídeos por massagem ──
const MASSAGENS: Record<string, { audio: string; video: string }> = {
  'relaxante sensual': {
    audio: 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/3dd77b15c_relaxante_sensual.mp3',
    video: 'https://drive.google.com/file/d/11-2dPRI-12wXk-YG0kEoaQzHDMCDKXLn/view',
  },
  'tantrica experience': {
    audio: 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/5ebaa1cb7_tantra_experience.mp3',
    video: 'https://drive.google.com/file/d/1iX0TQyZtnH5Te1oKJDQRkM2ah1Id9gsT/view',
  },
  'quick massage': {
    audio: 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/9b0bfdb87_quick.mp3',
    video: 'https://drive.google.com/file/d/19UFSp-pYb-_GeZfBoGVnmhVjxdm_ifqi/view',
  },
  'miofascial': {
    audio: 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/c605ad306_miofascial.mp3',
    video: 'https://drive.google.com/file/d/1WsXJH2FHG9qW2Cvh9DXBxAkQicwnOJhj/view',
  },
  'nuru summa': {
    audio: 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/fa37daf7b_nuru.mp3',
    video: 'https://drive.google.com/file/d/12drdn_6WstMhAuDfkxgdz7mryfNnapBB/view',
  },
  'tantrica mutua': {
    audio: 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/9e4019729_tantra_mutua.mp3',
    video: 'https://drive.google.com/file/d/1kPCvgZpc6HZUZjlZLlsB_1cydVzfEPzl/view',
  },
  'blind experience': {
    audio: 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/3d7e0aa91_blind.mp3',
    video: 'https://drive.google.com/file/d/1e2zigQk2sKRZJzz-gpGfVzeVYO1-ha-H/view',
  },
  'massagem dos deuses': {
    audio: 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/c67565fce_deuses.mp3',
    video: 'https://drive.google.com/file/d/1ZmA8cPeoWq2r6EXxCiWGYSsj96S_cqlA/view',
  },
  'hot': {
    audio: 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/2cf6b9baf_7d3111fba_Hotmassagem.ogg',
    video: 'https://drive.google.com/file/d/1CXkvTG3UeANayJp2-taDU7dbnT1JEnmB/view',
  },
  'tie and teaser': {
    audio: 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/d229e48c4_tie_teaser.mp3',
    video: 'https://drive.google.com/file/d/1LsOQ__1GVRIkHhB0JaLX8moX34qHMzEa/view',
  },
  'bdsm': {
    audio: 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/d229e48c4_tie_teaser.mp3',
    video: 'https://drive.google.com/file/d/1LsOQ__1GVRIkHhB0JaLX8moX34qHMzEa/view',
  },
  'hidrotantra': {
    audio: 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/6160220ba_hidrotantra.mp3',
    video: 'https://drive.google.com/file/d/1rHJNPd4mVVieHvhFT9c8Zs58YbgdYGOo/view',
  },
  'burn': {
    audio: 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/8970682cf_burn.mp3',
    video: 'https://drive.google.com/file/d/1yVnDrJNcJMUMX3cghb904Ph6AlD5axNp/view',
  },
  'summa experientia': {
    audio: 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/13d3b5d71_summa_experientia.mp3',
    video: 'https://drive.google.com/file/d/1P6WR-AyHFsXOk9gcQvo6DDYGbNkDlMX0/view',
  },
  '4 maos': {
    audio: 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/d6b331670_4maos.mp3',
    video: 'https://www.loshombres.com.br/index.html#massagem-4-maos',
  },
  'podoloterapia': {
    audio: 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/44675462b_podoloterapia.mp3',
    video: 'https://drive.google.com/file/d/1tMZpDTEW0aTuQHTICdPJiJx3ZPhmQ14n/view',
  },
  'tantrica casal': {
    audio: 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/3dc790b06_tantra_casal.mp3',
    video: 'https://drive.google.com/file/d/1FnOivOdKreK4hZ-wFTLRgUxNBNarDKZV/view',
  },
  'relaxante sensual casal': {
    audio: 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/6c22f5ac1_relaxante_sensual_casal.mp3',
    video: 'https://drive.google.com/file/d/1B1f-GeDCRQD8lEUiQccO59fhRb_71RiM/view',
  },
  'nuru casal': {
    audio: 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/787e65832_nuru_casal.mp3',
    video: 'https://drive.google.com/file/d/1rJ70vOebyKpQ_RhzGXzjQ-Dw1-xt4eLM/view',
  },
};

function norm(t: string): string {
  return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function detectarMassagem(texto: string): string | null {
  const n = norm(texto);
  const chaves = Object.keys(MASSAGENS).sort((a, b) => b.length - a.length);
  for (const k of chaves) { if (n.includes(norm(k))) return k; }
  if (n.includes('relaxante') && !n.includes('casal')) return 'relaxante sensual';
  if (n.includes('tantra') && n.includes('casal')) return 'tantrica casal';
  if (n.includes('tantra') && n.includes('mutua')) return 'tantrica mutua';
  if ((n.includes('tantra') || n.includes('tantrica')) && !n.includes('casal') && !n.includes('mutua')) return 'tantrica experience';
  if (n.includes('nuru') && n.includes('casal')) return 'nuru casal';
  if (n.includes('nuru')) return 'nuru summa';
  if (n.includes('4 maos') || n.includes('quatro maos')) return '4 maos';
  if (n.includes('deuses')) return 'massagem dos deuses';
  if (n.includes('blind') || n.includes('cego') || n.includes('venda')) return 'blind experience';
  if (n.includes('quick') || n.includes('25 min')) return 'quick massage';
  if (n.includes('hidro') || n.includes('banheira')) return 'hidrotantra';
  if (n.includes('tie') || n.includes('teaser') || n.includes('bdsm')) return 'tie and teaser';
  if (n.includes('summa') || n.includes('intima')) return 'summa experientia';
  if (n.includes('mio') || n.includes('fascial') || n.includes('esportiva')) return 'miofascial';
  if (n.includes('podo') || n.includes(' pe ') || n.includes(' pes')) return 'podoloterapia';
  if (n.includes('burn') || n.includes('termico')) return 'burn';
  if (n.includes('hot')) return 'hot';
  if (n.includes('mutua') || n.includes('mutuo')) return 'tantrica mutua';
  return null;
}

function ePedidoDeExplicacao(texto: string): boolean {
  const n = norm(texto);
  return n.includes('explique') || n.includes('explica') || n.includes('fale') ||
    n.includes('me conta') || n.includes('me fala') || n.includes('como e') ||
    n.includes('como funciona') || n.includes('o que e') || n.includes('quero saber') ||
    n.includes('detalhe') || n.includes('mais sobre') || n.includes('me diz') ||
    n.includes('me explica') || n.includes('curioso') || n.includes('curiosa') ||
    n.includes('conta mais') || n.includes('conta sobre');
}

function ePerguntaDePreco(texto: string): boolean {
  const n = norm(texto);
  return n.includes('valor') || n.includes('preco') || n.includes('quanto') ||
    n.includes('custa') || n.includes('cobra') || n.includes('tabela') ||
    n.includes('acessivel') || n.includes('caro') || n.includes('barato');
}

const SYSTEM = `Você é o assistente de atendimento do Jonathan, massagista do Estúdio Los Hombres em BH.

REGRAS ABSOLUTAS:
- NUNCA envie o cliente para um link externo para saber preços. Os preços ESTÃO aqui embaixo. Use-os diretamente na resposta.
- NUNCA use travessões (—). Nunca.
- Sempre responda em português natural, caloroso, sem julgamento.
- Mantenha o contexto total da conversa. Não esqueça o que foi dito antes.
- Seja direto. Se sabe a resposta, responda. Não peça mais informações desnecessárias.
- Máximo 4 parágrafos curtos por resposta.

IDENTIDADE: Jonathan, massagista especializado em atendimento masculino de alto padrão em BH.
Unidades: Savassi (Rua Tomé de Souza, 503, Sala 208) | Betim (Rua Pernambuco, 341 - Bairro Nossa Sra das Graças)
WhatsApp: (31) 98324-4713

TABELA COMPLETA DE PREÇOS (responda diretamente, sem mandar para link):
${TABELA_COMPLETA}

AGENDAMENTO:
Sinal R$30 PIX CNPJ 17342740000109 (JG Espaço Multserviços). Cancelamento menos de 12h: sinal retido. Trazer RG ou CNH.
Agenda Savassi: https://calendar.app.google/jBk4U8zf5WGb73MH6
Agenda Betim: https://calendar.app.google/dandDDiGYKtD36Q19

RESPOSTAS DIRETAS:
- "Onde fica?" = dê os dois endereços completos
- "Tem sexo?" = não, exceto Summa Experientia (única com interação íntima, PrEP+preservativo, R$1.350)
- "Quanto custa?" ou "qual o valor?" = liste os preços diretamente na conversa, nunca mande link
- "Quero agendar" = pergunte qual unidade (Savassi ou Betim) e passe o link correspondente
- Tatuagem = redirecione para WhatsApp 31991266270
- Conteúdo adulto = redirecione para WhatsApp 31987862117
- Vagas = formulário + (31) 98787-0330
- Micose = aguardar cicatrização completa
- Vergonha do corpo = atende todos os corpos, sem julgamento

QUANDO DESCREVER UMA MASSAGEM: use linguagem sensorial e envolvente, foque na experiência. O sistema já envia o áudio e vídeo automaticamente, não mencione isso.`;

async function salvarLead(contato: string, sessaoId: string) {
  try {
    await fetch(`https://base44.app/api/apps/${APP_ID}/entities/LeadConversa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SVC_TOKEN}` },
      body: JSON.stringify({
        whatsapp: contato, canal_origem: 'chat_web', etapa_funil: 'consulta',
        ultima_mensagem: `Chat web - sessão ${sessaoId}`,
        data_ultimo_contato: new Date().toISOString(), observacoes: `Sessão: ${sessaoId}`,
      }),
    });
  } catch (_) {}
}

async function responderIA(msgs: { role: string; content: string }[]): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 500, temperature: 0.6, messages: [{ role: 'system', content: SYSTEM }, ...msgs] }),
  });
  const d = await res.json();
  return d.choices?.[0]?.message?.content?.trim() || 'Me chama no WhatsApp: (31) 98324-4713 😊';
}

const HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Los Hombres — Atendimento</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--gold:#c9a84c;--gold2:#7a5418;--bg:#0a0a0a;--surface:#141414;--surf2:#1c1c1c;--border:#252525;--text:#f0f0f0;--muted:#666;--bot:#0d0d20;--green:#22c55e}
html,body{height:100%;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;overflow:hidden}
.wrap{display:flex;flex-direction:column;height:100dvh;max-width:640px;margin:0 auto}
.hdr{background:linear-gradient(180deg,#1c1c1c,#111);border-bottom:1px solid var(--border);padding:10px 16px;display:flex;align-items:center;gap:12px;flex-shrink:0}
.av-w{position:relative;flex-shrink:0}
.av{width:56px;height:56px;border-radius:50%;object-fit:cover;object-position:center top;border:2.5px solid var(--gold);box-shadow:0 0 0 4px rgba(201,168,76,.12)}
.dot{position:absolute;bottom:2px;right:2px;width:13px;height:13px;background:var(--green);border-radius:50%;border:2.5px solid #111}
.hdr-i{flex:1}.hdr-i h2{font-size:16px;font-weight:700;color:#fff}
.on{font-size:12px;color:var(--green);font-weight:500;margin-top:1px}
.sub{font-size:11px;color:var(--muted);margin-top:2px}
.logo-txt{font-size:7.5px;letter-spacing:4px;color:var(--gold);text-transform:uppercase;font-weight:900;line-height:2;text-align:right;flex-shrink:0}
.notice{text-align:center;font-size:11px;color:var(--muted);padding:4px 12px;background:#0c0c0c;border-bottom:1px solid var(--border);flex-shrink:0}
.msgs{flex:1;overflow-y:auto;padding:14px 10px 8px;display:flex;flex-direction:column;gap:10px}
.msgs::-webkit-scrollbar{width:3px}.msgs::-webkit-scrollbar-thumb{background:#222;border-radius:2px}
.row{display:flex;align-items:flex-end;gap:7px}.row.bot{justify-content:flex-start}.row.me{justify-content:flex-end}
.rav{width:30px;height:30px;border-radius:50%;object-fit:cover;object-position:center top;flex-shrink:0;border:1.5px solid var(--gold)}
.col{display:flex;flex-direction:column;max-width:82%}.row.me .col{align-items:flex-end}
.bub{padding:9px 13px;border-radius:18px;font-size:14px;line-height:1.6;white-space:pre-wrap;word-break:break-word}
.bub.bot{background:var(--bot);border-bottom-left-radius:4px;border:1px solid #1a1a35}
.bub.me{background:linear-gradient(135deg,#b8903e,#6b4710);border-bottom-right-radius:4px;color:#fff;font-weight:500}
.ts{font-size:10px;color:var(--muted);margin-top:3px;padding:0 3px}
.media-card{background:#0a0a1e;border:1px solid #1a1a35;border-radius:14px;overflow:hidden;max-width:290px;margin-top:5px}
.mc-audio{padding:10px 13px;display:flex;align-items:center;gap:9px;border-bottom:1px solid #1a1a35}
.play-btn{width:36px;height:36px;border-radius:50%;background:var(--gold);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;-webkit-tap-highlight-color:transparent}
.audio-info{flex:1}.audio-nome{font-size:12px;font-weight:600;color:var(--gold)}.audio-sub{font-size:11px;color:var(--muted);margin-top:1px}
.mc-video{padding:10px 13px}
.mc-video a{color:#53bdeb;font-size:12px;text-decoration:none;display:flex;align-items:center;gap:6px;font-weight:500}
.tbub{display:inline-flex;align-items:center;gap:5px;padding:13px 17px;background:var(--bot);border-radius:18px;border-bottom-left-radius:4px;border:1px solid #1a1a35}
.td{width:7px;height:7px;background:#333;border-radius:50%;animation:b 1.3s infinite}
.td:nth-child(2){animation-delay:.22s}.td:nth-child(3){animation-delay:.44s}
@keyframes b{0%,55%,100%{transform:translateY(0);background:#333}27%{transform:translateY(-7px);background:var(--gold)}}
.quick{display:flex;gap:8px;overflow-x:auto;padding:8px 10px;background:#0c0c0c;border-top:1px solid var(--border);flex-shrink:0;scrollbar-width:none}
.quick::-webkit-scrollbar{display:none}
.qb{background:var(--surf2);border:1px solid #2a2a2a;color:var(--gold);border-radius:20px;padding:7px 14px;font-size:13px;cursor:pointer;white-space:nowrap;flex-shrink:0;font-family:inherit}
.qb:active{background:#252525}
.inp-area{background:var(--surface);border-top:1px solid var(--border);padding:10px 12px;display:flex;align-items:flex-end;gap:8px;flex-shrink:0}
#inp{flex:1;background:var(--surf2);border:1.5px solid var(--border);border-radius:22px;padding:10px 15px;font-size:14px;color:var(--text);outline:none;resize:none;max-height:100px;min-height:44px;font-family:inherit;line-height:1.45;transition:border-color .2s}
#inp:focus{border-color:var(--gold)}#inp::placeholder{color:var(--muted)}
#sbtn{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold2));border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;-webkit-tap-highlight-color:transparent;transition:transform .1s}
#sbtn:active{transform:scale(.88)}#sbtn:disabled{opacity:.3;cursor:default;transform:none}
.fab{position:fixed;bottom:78px;right:12px;background:#229ED9;color:#fff;border-radius:50px;padding:10px 15px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:7px;box-shadow:0 4px 18px rgba(34,158,217,.35);text-decoration:none;z-index:99}
@media(max-width:420px){.fab .ft{display:none}.fab{border-radius:50%;padding:11px;bottom:72px}}
</style>
</head>
<body>
<div class="wrap">
<div class="hdr">
  <div class="av-w">
    <img class="av" src="${FOTO}" alt="Jonathan" onerror="this.style.background='#1e1e1e'">
    <div class="dot"></div>
  </div>
  <div class="hdr-i">
    <h2>Jonathan</h2>
    <div class="on">online agora</div>
    <div class="sub">Massagista · Savassi &amp; Betim · BH</div>
  </div>
  <div class="logo-txt">LOS<br>HOMBRES</div>
</div>
<div class="notice">🔒 Atendimento sigiloso · Suas informações não são compartilhadas</div>
<div class="msgs" id="msgs"></div>
<div class="quick" id="quick">
  <button class="qb" data-q="Quais massagens vocês oferecem?">💆 Massagens</button>
  <button class="qb" data-q="Quero agendar uma sessão">📅 Agendar</button>
  <button class="qb" data-q="Quanto custa cada massagem?">💰 Preços</button>
  <button class="qb" data-q="Tem massagem para casais?">👫 Casais</button>
  <button class="qb" data-q="Onde fica o estúdio?">📍 Onde fica</button>
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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.01 9.47c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.48 14.4l-2.95-.924c-.64-.204-.654-.64.136-.95l11.527-4.444c.537-.194 1.006.131.37.166z"/></svg>
  <span class="ft">Telegram</span>
</a>
<script>
var EP='https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/functions/chatCliente';
var FOTO='${FOTO}';
var msgsEl=document.getElementById('msgs'),inpEl=document.getElementById('inp'),sbtnEl=document.getElementById('sbtn'),quickEl=document.getElementById('quick');
var busy=false,hist=[],sessaoId=Math.random().toString(36).slice(2,10),contatoOk=false;
function hora(){var d=new Date();return('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);}
function scroll(){msgsEl.scrollTop=msgsEl.scrollHeight;}
function mkAv(){var i=document.createElement('img');i.className='rav';i.src=FOTO;i.alt='J';return i;}
function addMsgBot(txt,audio,video,nomeM){
  var row=document.createElement('div');row.className='row bot';row.appendChild(mkAv());
  var col=document.createElement('div');col.className='col';
  var bub=document.createElement('div');bub.className='bub bot';bub.textContent=txt;
  var ts=document.createElement('div');ts.className='ts';ts.textContent=hora();
  col.appendChild(bub);col.appendChild(ts);
  if(audio||video){
    var card=document.createElement('div');card.className='media-card';
    if(audio){
      var audioEl=new Audio(audio);var playing=false;
      var mc=document.createElement('div');mc.className='mc-audio';
      var pb=document.createElement('button');pb.className='play-btn';
      pb.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M8 5v14l11-7z"/></svg>';
      pb.onclick=function(){if(playing){audioEl.pause();pb.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M8 5v14l11-7z"/></svg>';playing=false;}else{audioEl.play();pb.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';playing=true;}};
      audioEl.onended=function(){pb.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M8 5v14l11-7z"/></svg>';playing=false;};
      var ai=document.createElement('div');ai.className='audio-info';
      var an=document.createElement('div');an.className='audio-nome';an.textContent='🎧 '+(nomeM||'Áudio da massagem');
      var as2=document.createElement('div');as2.className='audio-sub';as2.textContent='Toque para ouvir';
      ai.appendChild(an);ai.appendChild(as2);mc.appendChild(pb);mc.appendChild(ai);card.appendChild(mc);
    }
    if(video){
      var mv=document.createElement('div');mv.className='mc-video';
      var va=document.createElement('a');va.href=video;va.target='_blank';va.rel='noopener';
      va.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="#53bdeb"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg> Ver vídeo da massagem';
      mv.appendChild(va);card.appendChild(mv);
    }
    col.appendChild(card);
  }
  row.appendChild(col);msgsEl.appendChild(row);scroll();
}
function addMsgMe(txt){
  var row=document.createElement('div');row.className='row me';
  var col=document.createElement('div');col.className='col';
  var bub=document.createElement('div');bub.className='bub me';bub.textContent=txt;
  var ts=document.createElement('div');ts.className='ts';ts.textContent=hora();
  col.appendChild(bub);col.appendChild(ts);row.appendChild(col);msgsEl.appendChild(row);scroll();
}
function showTyping(){
  var row=document.createElement('div');row.className='row bot';row.id='typing';row.appendChild(mkAv());
  var tb=document.createElement('div');tb.className='tbub';
  for(var i=0;i<3;i++){var d=document.createElement('div');d.className='td';tb.appendChild(d);}
  row.appendChild(tb);msgsEl.appendChild(row);scroll();
}
function hideTyping(){var e=document.getElementById('typing');if(e&&e.parentNode)e.parentNode.removeChild(e);}
function isContato(t){return /(\d[\d\s\-()\+]{7,})|(@[\w.]{3,})|([\w.+-]+@[\w.]+\.\w{2,})/.test(t);}
function salvarContato(c){contatoOk=true;fetch(EP,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({_salvar:true,contato:c,sessaoId:sessaoId})}).catch(function(){});}
function enviar(txt){
  if(busy)return;var t=txt.trim();if(!t)return;
  inpEl.value='';inpEl.style.height='auto';busy=true;sbtnEl.disabled=true;
  addMsgMe(t);hist.push({role:'user',content:t});
  if(!contatoOk&&isContato(t))salvarContato(t);
  showTyping();
  fetch(EP,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mensagem:t,historico:hist.slice(-16),sessaoId:sessaoId})})
  .then(function(r){return r.json();})
  .then(function(d){
    hideTyping();
    addMsgBot(d.resposta||'Me chama no WhatsApp: (31) 98324-4713 😊',d.audio||null,d.video||null,d.massagem||null);
    hist.push({role:'assistant',content:d.resposta||''});
    busy=false;sbtnEl.disabled=false;inpEl.focus();
  })
  .catch(function(){hideTyping();addMsgBot('Probleminha aqui. Me chama no WhatsApp: (31) 98324-4713 😊',null,null,null);busy=false;sbtnEl.disabled=false;});
}
quickEl.addEventListener('click',function(e){var b=e.target.closest('.qb');if(b&&!busy)enviar(b.getAttribute('data-q'));});
inpEl.addEventListener('input',function(){sbtnEl.disabled=!this.value.trim();this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px';});
inpEl.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();enviar(this.value);}});
sbtnEl.addEventListener('click',function(){enviar(inpEl.value);});
setTimeout(function(){
  addMsgBot('Olá! Seja bem-vindo ao Estúdio Los Hombres. 😊\n\nSou o Jonathan, massagista especializado em atendimento masculino de alto padrão em BH, com espaços na Savassi e em Betim.',null,null,null);
  hist.push({role:'assistant',content:'Olá! Seja bem-vindo ao Estúdio Los Hombres. Sou o Jonathan, massagista especializado em atendimento masculino em BH, com unidades na Savassi e em Betim.'});
  setTimeout(function(){
    addMsgBot('Pode me perguntar o que quiser: massagens, valores, como funciona, onde fica. Estou aqui pra te ajudar sem enrolação. 😉',null,null,null);
    hist.push({role:'assistant',content:'Pode me perguntar o que quiser: massagens, valores, como funciona, onde fica. Estou aqui pra te ajudar sem enrolação.'});
  },800);
},350);
</script>
</body>
</html>`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
  }

  if (req.method === 'GET') {
    return new Response(HTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; media-src * blob: data:; img-src * data:; connect-src *;" },
    });
  }

  if (req.method !== 'POST') return new Response('', { status: 405 });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch (_) {}

  if (body._salvar) {
    await salvarLead(String(body.contato || ''), String(body.sessaoId || ''));
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }

  const mensagem  = String(body.mensagem || '').slice(0, 600);
  const historico = Array.isArray(body.historico) ? body.historico : [];
  if (!mensagem) return new Response(JSON.stringify({ resposta: 'Me chama no WhatsApp: (31) 98324-4713 😊' }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });

  const massagemDetectada = detectarMassagem(mensagem);
  const pedindoExplicacao = ePedidoDeExplicacao(mensagem);

  const msgs = [...historico.map((m: Record<string, string>) => ({ role: m.role, content: m.content })), { role: 'user', content: mensagem }];
  const resposta = await responderIA(msgs);

  let audio: string | null = null;
  let video: string | null = null;
  let nomeM: string | null = null;

  if (massagemDetectada && (pedindoExplicacao || historico.length <= 2)) {
    const m = MASSAGENS[massagemDetectada];
    if (m) {
      audio = m.audio;
      video = m.video;
      nomeM = massagemDetectada.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }

  return new Response(JSON.stringify({ resposta, audio, video, massagem: nomeM }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
});
