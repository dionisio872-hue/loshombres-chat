// chatCliente — Los Hombres v9
// GET  → HTML do chat
// POST /track → rastrear clique em link/audio/video
// POST (default) → processar mensagem com IA

const OPENAI_KEY  = Deno.env.get('OPENAI_API_KEY') || '';
const APP_ID      = '6a04cc22bf7a0dcea87e3c43';
const SVC_TOKEN   = Deno.env.get('BASE44_SERVICE_TOKEN') || '';
const FOTO        = 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/461551448_jonathan_perfil.jpg';
const SHEET_ID    = '1XHF_Jw2dPtw9w8b5Eae3EmPK1CyBepjOyZ7JKWZd7Uk';
const SHEETS_KEY  = Deno.env.get('GOOGLESHEETS_ACCESS_TOKEN') || '';
const CAL_KEY     = Deno.env.get('GOOGLECALENDAR_ACCESS_TOKEN') || '';

// ── Horários padrão de atendimento ──
const HORARIOS_PADRAO = ['9:30','11:00','13:00','14:30','16:00','17:30','19:00'];

// ── Abas da planilha por mês ──
const ABAS_MES: Record<number,string> = {1:'JAN',2:'FEV',3:'MAR',4:'ABRI',5:'MAI',6:'JUN',7:'JUL',8:'AGO',9:'SET',10:'OUT',11:'NOV',12:'DEZ'};

// ── Tabela de preços ──
const TABELA_COMPLETA = `TRADICIONAIS:
• Relaxante Sensual: R$ 320 (com 20% de antecedência: R$ 256)
• Relaxante Tradicional: R$ 250
• Massagem 4 Mãos: R$ 650
• Miofascial: R$ 320
• Ventosaterapia: R$ 250

SENSUAIS:
• Tântrica Experience (Lingam): R$ 400 (com 20%: R$ 320)
• Hidrotantra (banheira): R$ 450 (com 20%: R$ 360)
• Tântrica Mútua: R$ 499 (com 20%: R$ 399)

ERÓTICAS:
• HOT Massagem: R$ 180 a R$ 230
• Quick Massage (25min): R$ 250
• Nuru Summa (corpo a corpo): R$ 499 (com 20%: R$ 399)
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

💡 Agendando com 30 dias de antecedência você garante 20% de desconto!`;

// ── Áudios e vídeos ──
const MASSAGENS: Record<string,{audio:string;video:string}> = {
  'relaxante sensual':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/3dd77b15c_relaxante_sensual.mp3',video:'https://drive.google.com/file/d/11-2dPRI-12wXk-YG0kEoaQzHDMCDKXLn/view'},
  'tantrica experience':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/5ebaa1cb7_tantra_experience.mp3',video:'https://drive.google.com/file/d/1iX0TQyZtnH5Te1oKJDQRkM2ah1Id9gsT/view'},
  'quick massage':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/9b0bfdb87_quick.mp3',video:'https://drive.google.com/file/d/19UFSp-pYb-_GeZfBoGVnmhVjxdm_ifqi/view'},
  'miofascial':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/c605ad306_miofascial.mp3',video:'https://drive.google.com/file/d/1WsXJH2FHG9qW2Cvh9DXBxAkQicwnOJhj/view'},
  'nuru summa':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/fa37daf7b_nuru.mp3',video:'https://drive.google.com/file/d/12drdn_6WstMhAuDfkxgdz7mryfNnapBB/view'},
  'tantrica mutua':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/9e4019729_tantra_mutua.mp3',video:'https://drive.google.com/file/d/1kPCvgZpc6HZUZjlZLlsB_1cydVzfEPzl/view'},
  'blind experience':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/3d7e0aa91_blind.mp3',video:'https://drive.google.com/file/d/1e2zigQk2sKRZJzz-gpGfVzeVYO1-ha-H/view'},
  'massagem dos deuses':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/c67565fce_deuses.mp3',video:'https://drive.google.com/file/d/1ZmA8cPeoWq2r6EXxCiWGYSsj96S_cqlA/view'},
  'hot':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/2cf6b9baf_7d3111fba_Hotmassagem.ogg',video:'https://drive.google.com/file/d/1CXkvTG3UeANayJp2-taDU7dbnT1JEnmB/view'},
  'tie and teaser':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/d229e48c4_tie_teaser.mp3',video:'https://drive.google.com/file/d/1LsOQ__1GVRIkHhB0JaLX8moX34qHMzEa/view'},
  'bdsm':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/d229e48c4_tie_teaser.mp3',video:'https://drive.google.com/file/d/1LsOQ__1GVRIkHhB0JaLX8moX34qHMzEa/view'},
  'hidrotantra':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/6160220ba_hidrotantra.mp3',video:'https://drive.google.com/file/d/1rHJNPd4mVVieHvhFT9c8Zs58YbgdYGOo/view'},
  'burn':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/8970682cf_burn.mp3',video:'https://drive.google.com/file/d/1yVnDrJNcJMUMX3cghb904Ph6AlD5axNp/view'},
  'summa experientia':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/13d3b5d71_summa_experientia.mp3',video:'https://drive.google.com/file/d/1P6WR-AyHFsXOk9gcQvo6DDYGbNkDlMX0/view'},
  '4 maos':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/d6b331670_4maos.mp3',video:'https://www.loshombres.com.br/index.html#massagem-4-maos'},
  'podoloterapia':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/44675462b_podoloterapia.mp3',video:'https://drive.google.com/file/d/1tMZpDTEW0aTuQHTICdPJiJx3ZPhmQ14n/view'},
  'tantrica casal':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/3dc790b06_tantra_casal.mp3',video:'https://drive.google.com/file/d/1FnOivOdKreK4hZ-wFTLRgUxNBNarDKZV/view'},
  'relaxante sensual casal':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/6c22f5ac1_relaxante_sensual_casal.mp3',video:'https://drive.google.com/file/d/1B1f-GeDCRQD8lEUiQccO59fhRb_71RiM/view'},
  'nuru casal':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/787e65832_nuru_casal.mp3',video:'https://drive.google.com/file/d/1rJ70vOebyKpQ_RhzGXzjQ-Dw1-xt4eLM/view'},
};

function norm(t:string):string{
  return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
}
function detectarMassagem(texto:string):string|null{
  const n=norm(texto);
  const chaves=Object.keys(MASSAGENS).sort((a,b)=>b.length-a.length);
  for(const k of chaves){if(n.includes(norm(k)))return k;}
  if(n.includes('relaxante')&&!n.includes('casal'))return 'relaxante sensual';
  if(n.includes('tantra')&&n.includes('casal'))return 'tantrica casal';
  if(n.includes('tantra')&&n.includes('mutua'))return 'tantrica mutua';
  if((n.includes('tantra')||n.includes('tantrica'))&&!n.includes('casal')&&!n.includes('mutua'))return 'tantrica experience';
  if(n.includes('nuru')&&n.includes('casal'))return 'nuru casal';
  if(n.includes('nuru'))return 'nuru summa';
  if(n.includes('4 maos')||n.includes('quatro maos'))return '4 maos';
  if(n.includes('deuses'))return 'massagem dos deuses';
  if(n.includes('blind')||n.includes('cego')||n.includes('venda'))return 'blind experience';
  if(n.includes('quick')||n.includes('25 min'))return 'quick massage';
  if(n.includes('hidro')||n.includes('banheira'))return 'hidrotantra';
  if(n.includes('tie')||n.includes('teaser')||n.includes('bdsm'))return 'tie and teaser';
  if(n.includes('summa')||n.includes('intima'))return 'summa experientia';
  if(n.includes('mio')||n.includes('fascial'))return 'miofascial';
  if(n.includes('podo'))return 'podoloterapia';
  if(n.includes('burn'))return 'burn';
  if(n.includes('hot'))return 'hot';
  if(n.includes('mutua'))return 'tantrica mutua';
  return null;
}
function ePedidoDeExplicacao(t:string):boolean{
  const n=norm(t);
  return ['explique','explica','fale','me conta','me fala','como e','como funciona','o que e',
    'quero saber','detalhe','mais sobre','me diz','me explica','curioso','curiosa','conta mais','conta sobre'].some(x=>n.includes(x));
}

// ── Verificar disponibilidade na planilha ──
async function verificarPlanilha(dia:string, mes:number, horario:string): Promise<{livre:boolean; dados:string[]}> {
  try {
    const aba = ABAS_MES[mes] || 'MAI';
    const token = Deno.env.get('GOOGLESHEETS_ACCESS_TOKEN') || SHEETS_KEY;
    const resp = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${aba}!A1:I200`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await resp.json();
    const rows: string[][] = data.values || [];

    // Normalizar horário (9:30, 09:30, 9h30, etc)
    const horNorm = horario.replace('h',':').replace('H',':').padStart(5,'0');

    // Encontrar linhas do dia
    const linhasDia = rows.filter(r => r[0] === dia || r[0] === dia.padStart(2,'0') || r[0] === String(parseInt(dia)));

    // Verificar se horário está ocupado (tem nome na coluna B)
    for(const linha of linhasDia){
      const horLinha = (linha[6] || '').trim().padStart(5,'0');
      if(horLinha === horNorm || horLinha === horario){
        const nome = (linha[1] || '').trim();
        if(nome && nome !== '' && nome.toUpperCase() !== 'FERIADO'){
          return { livre: false, dados: linha };
        }
        return { livre: true, dados: linha };
      }
    }
    return { livre: true, dados: [] };
  } catch(e:any) {
    console.error('Planilha error:', e.message);
    return { livre: true, dados: [] }; // fallback permissivo
  }
}

// ── Verificar disponibilidade no Google Calendar ──
async function verificarCalendar(dataISO:string, horario:string): Promise<{livre:boolean; eventos:string[]}> {
  try {
    const token = Deno.env.get('GOOGLECALENDAR_ACCESS_TOKEN') || CAL_KEY;
    // Montar window de 1h ao redor do horário
    const [h, m] = horario.replace('h',':').split(':').map(Number);
    const inicio = new Date(`${dataISO}T${String(h).padStart(2,'0')}:${String(m||0).padStart(2,'0')}:00-03:00`);
    const fim = new Date(inicio.getTime() + 90*60*1000);

    const resp = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${inicio.toISOString()}&timeMax=${fim.toISOString()}&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await resp.json();
    const eventos: string[] = (data.items || []).map((e:any) => e.summary || 'Compromisso');
    return { livre: eventos.length === 0, eventos };
  } catch(e:any) {
    console.error('Calendar error:', e.message);
    return { livre: true, eventos: [] };
  }
}

// ── Gravar agendamento na planilha ──
async function gravarPlanilha(dia:string, mes:number, horario:string, nome:string, telefone:string, servico:string, valor:string): Promise<boolean> {
  try {
    const aba = ABAS_MES[mes] || 'MAI';
    const token = Deno.env.get('GOOGLESHEETS_ACCESS_TOKEN') || SHEETS_KEY;

    // Buscar linhas para encontrar a linha correta do dia+horário
    const resp = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${aba}!A1:I200`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await resp.json();
    const rows: string[][] = data.values || [];
    const horNorm = horario.replace('h',':').padStart(5,'0');

    let targetRow = -1;
    for(let i=0; i<rows.length; i++){
      const r = rows[i];
      const diaLinha = (r[0]||'').trim();
      const horLinha = (r[6]||'').trim().padStart(5,'0');
      if((diaLinha === dia || diaLinha === dia.padStart(2,'0') || diaLinha === String(parseInt(dia))) && horLinha === horNorm){
        targetRow = i + 1; // 1-based
        break;
      }
    }
    if(targetRow === -1) return false;

    // Atualizar a linha com os dados
    const updateResp = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${aba}!B${targetRow}:H${targetRow}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [[nome, telefone, servico, '', '', horario, valor]] }),
      }
    );
    return updateResp.ok;
  } catch(e:any) {
    console.error('Gravar planilha error:', e.message);
    return false;
  }
}

// ── Rastreamento de eventos ──
async function registrarEvento(tipo:string, alvo:string, sessaoId:string, extra:Record<string,unknown>={}) {
  try {
    await fetch(`https://base44.app/api/apps/${APP_ID}/entities/LeadConversa/filter`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${SVC_TOKEN}` },
      body: JSON.stringify({ observacoes: { $like: `%${sessaoId}%` } }),
    }).then(async r => {
      const d = await r.json();
      const lead = Array.isArray(d) ? d[0] : null;
      const obs = lead?.observacoes || '';
      const novaObs = `${obs}\n[${new Date().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}] ${tipo}: ${alvo}`;
      if(lead?.id){
        await fetch(`https://base44.app/api/apps/${APP_ID}/entities/LeadConversa/${lead.id}`, {
          method:'PUT', headers:{'Content-Type':'application/json','Authorization':`Bearer ${SVC_TOKEN}`},
          body: JSON.stringify({ observacoes: novaObs.slice(-2000) }),
        });
      }
    });
  } catch(_) {}
}

// ── System prompt ──
const SYSTEM = `Você é o assistente de atendimento do Jonathan, massagista do Estúdio Los Hombres em BH.

REGRAS ABSOLUTAS:
- NUNCA use travessões (—). Nunca.
- NUNCA mande o cliente para link externo para ver preços. Todos os preços estão listados abaixo — use direto na resposta.
- Responda em português natural, caloroso, sem julgamento.
- Mantenha contexto total da conversa. Não esqueça nada do que foi dito.
- Seja direto. Se sabe a resposta, responda sem rodeios.
- Máximo 3 parágrafos curtos por resposta.
- SEMPRE mencione o desconto de 20% quando falar de agendamento ou preços: "Agendando com 30 dias de antecedência você garante 20% de desconto!"

IDENTIDADE: Jonathan, massagista especializado em atendimento masculino de alto padrão em BH.
Savassi: Rua Tomé de Souza, 503, Sala 208
Betim: Rua Pernambuco, 341 - Bairro Nossa Sra das Graças
WhatsApp: (31) 98324-4713

${TABELA_COMPLETA}

AGENDAMENTO — FLUXO OBRIGATÓRIO:
1. Perguntar qual massagem deseja
2. Perguntar qual unidade (Savassi ou Betim)
3. Perguntar data e horário desejado
4. O sistema vai verificar disponibilidade automaticamente (não invente disponibilidade)
5. Se disponível: pedir sinal R$30 via PIX CNPJ 17342740000109 (JG Espaço Multserviços)
6. Após confirmação do pagamento: confirmar agendamento com endereço e instruções
7. Cancelamento com menos de 12h: sinal retido. Trazer RG ou CNH.

DISPONIBILIDADE: O sistema verifica automaticamente no Google Calendar e na planilha. NUNCA confirme sem essa verificação.

RESPOSTAS DIRETAS:
- "Onde fica?" = dê os dois endereços completos
- "Tem sexo?" = não, exceto Summa Experientia (única com interação íntima, R$1.350, PrEP+preservativo)
- "Quanto custa?" = liste os preços na conversa + mencione o desconto de 20%
- Tatuagem = WhatsApp 31991266270 | Conteúdo adulto = WhatsApp 31987862117
- Vagas = formulário + (31) 98787-0330
- Vergonha do corpo = atende todos, sem julgamento

QUANDO DESCREVER MASSAGEM: use linguagem sensorial e envolvente. O sistema já envia áudio e vídeo automaticamente.`;

async function responderIA(msgs:{role:string;content:string}[], contextoAgenda?:string): Promise<string> {
  const systemFinal = contextoAgenda ? SYSTEM + '\n\nCONTEXTO DE DISPONIBILIDADE:\n' + contextoAgenda : SYSTEM;
  const res = await fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${OPENAI_KEY}`},
    body: JSON.stringify({ model:'gpt-4o-mini', max_tokens:500, temperature:0.6, messages:[{role:'system',content:systemFinal},...msgs] }),
  });
  const d = await res.json();
  return d.choices?.[0]?.message?.content?.trim() || 'Me chama no WhatsApp: (31) 98324-4713 😊';
}

// ── Detectar se mensagem tem data/horário de agendamento ──
function extrairDataHorario(texto:string): {dia:string|null; mes:number|null; horario:string|null; dataStr:string|null} {
  const n = texto.toLowerCase();
  const hoje = new Date();

  // Detectar "amanhã"
  let dia: string|null = null, mes: number|null = null, dataStr: string|null = null;
  if(n.includes('amanha')||n.includes('amanhã')){
    const amanha = new Date(hoje); amanha.setDate(hoje.getDate()+1);
    dia = String(amanha.getDate()).padStart(2,'0');
    mes = amanha.getMonth()+1;
    dataStr = amanha.toISOString().split('T')[0];
  } else {
    // Formato DD/MM ou "dia X"
    const match = texto.match(/(\d{1,2})[\/\-](\d{1,2})/);
    if(match){ dia=match[1].padStart(2,'0'); mes=parseInt(match[2]); dataStr=`2026-${String(mes).padStart(2,'0')}-${dia}`; }
    else {
      const m2 = texto.match(/dia\s+(\d{1,2})/i);
      if(m2){ dia=m2[1].padStart(2,'0'); mes=hoje.getMonth()+1; dataStr=`2026-${String(mes).padStart(2,'0')}-${dia}`; }
    }
  }

  // Detectar horário
  const hMatch = texto.match(/(\d{1,2})[h:\s](\d{0,2})/i);
  let horario: string|null = null;
  if(hMatch){
    const h = parseInt(hMatch[1]);
    const m = parseInt(hMatch[2]||'0');
    if(h >= 8 && h <= 21){ horario = `${h}:${String(m).padStart(2,'0')}`; }
  }

  return { dia, mes, horario, dataStr };
}

// ── Verificar se é 30+ dias de antecedência ──
function calcularDesconto(dataStr:string|null, valorBase:number): {temDesconto:boolean; valorFinal:number; diasAntecedencia:number} {
  if(!dataStr) return {temDesconto:false, valorFinal:valorBase, diasAntecedencia:0};
  const hoje = new Date();
  const data = new Date(dataStr);
  const dias = Math.floor((data.getTime()-hoje.getTime())/(1000*60*60*24));
  const temDesconto = dias >= 30;
  return { temDesconto, valorFinal: temDesconto ? Math.round(valorBase*0.8) : valorBase, diasAntecedencia: dias };
}

async function salvarLead(contato:string, sessaoId:string) {
  try {
    await fetch(`https://base44.app/api/apps/${APP_ID}/entities/LeadConversa`,{
      method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${SVC_TOKEN}`},
      body: JSON.stringify({whatsapp:contato,canal_origem:'chat_web',etapa_funil:'consulta',
        ultima_mensagem:`Chat web - sessão ${sessaoId}`,data_ultimo_contato:new Date().toISOString(),observacoes:`Sessão: ${sessaoId}`}),
    });
  } catch(_){}
}

// ── HTML ──
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
<a class="fab" href="https://t.me/Atendimentoloshombresbot" target="_blank" rel="noopener" onclick="track('link','telegram',sessaoId)">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.01 9.47c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.48 14.4l-2.95-.924c-.64-.204-.654-.64.136-.95l11.527-4.444c.537-.194 1.006.131.37.166z"/></svg>
  <span class="ft">Telegram</span>
</a>
<script>
var EP='https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/functions/chatCliente';
var FOTO='${FOTO}';
var msgsEl=document.getElementById('msgs'),inpEl=document.getElementById('inp'),sbtnEl=document.getElementById('sbtn'),quickEl=document.getElementById('quick');
var busy=false,hist=[],sessaoId=Math.random().toString(36).slice(2,10),contatoOk=false;

// ── RASTREAMENTO ──
function track(tipo,alvo,sid){
  fetch(EP,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({_track:true,tipo:tipo,alvo:alvo,sessaoId:sid||sessaoId})
  }).catch(function(){});
}

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
      pb.onclick=function(){
        if(playing){audioEl.pause();pb.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M8 5v14l11-7z"/></svg>';playing=false;}
        else{
          track('audio',nomeM||'massagem',sessaoId);
          audioEl.play();pb.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';playing=true;
        }
      };
      audioEl.onended=function(){pb.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M8 5v14l11-7z"/></svg>';playing=false;};
      var ai=document.createElement('div');ai.className='audio-info';
      var an=document.createElement('div');an.className='audio-nome';an.textContent='🎧 '+(nomeM||'Áudio da massagem');
      var as2=document.createElement('div');as2.className='audio-sub';as2.textContent='Toque para ouvir';
      ai.appendChild(an);ai.appendChild(as2);mc.appendChild(pb);mc.appendChild(ai);card.appendChild(mc);
    }
    if(video){
      var mv=document.createElement('div');mv.className='mc-video';
      var va=document.createElement('a');va.href=video;va.target='_blank';va.rel='noopener';
      va.onclick=function(){track('video',nomeM||'massagem',sessaoId);};
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

// Delay humanizado antes de mostrar resposta (1.5 a 3.5s baseado no tamanho)
function delayHumano(txt){return Math.min(3500, Math.max(1500, txt.length * 18));}

function enviar(txt){
  if(busy)return;var t=txt.trim();if(!t)return;
  inpEl.value='';inpEl.style.height='auto';busy=true;sbtnEl.disabled=true;
  addMsgMe(t);hist.push({role:'user',content:t});
  if(!contatoOk&&isContato(t))salvarContato(t);
  showTyping();
  fetch(EP,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mensagem:t,historico:hist.slice(-16),sessaoId:sessaoId})})
  .then(function(r){return r.json();})
  .then(function(d){
    var delay=delayHumano(d.resposta||'');
    setTimeout(function(){
      hideTyping();
      addMsgBot(d.resposta||'Me chama no WhatsApp: (31) 98324-4713 😊',d.audio||null,d.video||null,d.massagem||null);
      hist.push({role:'assistant',content:d.resposta||''});
      busy=false;sbtnEl.disabled=false;inpEl.focus();
    }, delay);
  })
  .catch(function(){hideTyping();addMsgBot('Probleminha aqui. Me chama no WhatsApp: (31) 98324-4713 😊',null,null,null);busy=false;sbtnEl.disabled=false;});
}
quickEl.addEventListener('click',function(e){var b=e.target.closest('.qb');if(b&&!busy)enviar(b.getAttribute('data-q'));});
inpEl.addEventListener('input',function(){sbtnEl.disabled=!this.value.trim();this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px';});
inpEl.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();enviar(this.value);}});
sbtnEl.addEventListener('click',function(){enviar(inpEl.value);});

// Boas-vindas com delay humanizado
setTimeout(function(){
  addMsgBot('Olá! Seja bem-vindo ao Estúdio Los Hombres. 😊\\n\\nSou o Jonathan, massagista especializado em atendimento masculino de alto padrão em BH, com espaços na Savassi e em Betim.',null,null,null);
  hist.push({role:'assistant',content:'Olá! Seja bem-vindo ao Estúdio Los Hombres. Sou o Jonathan, massagista especializado em atendimento masculino em BH, com unidades na Savassi e em Betim.'});
  setTimeout(function(){
    addMsgBot('Pode me perguntar sobre massagens, valores, agendamento ou qualquer dúvida. E só lembrando: agendando com 30 dias de antecedência você garante 20% de desconto! 😉',null,null,null);
    hist.push({role:'assistant',content:'Pode me perguntar sobre massagens, valores, agendamento ou qualquer dúvida. Agendando com 30 dias de antecedência você garante 20% de desconto!'});
  },2200);
},500);
</script>
</body>
</html>`;

// ── Servidor principal ──
Deno.serve(async(req:Request)=>{
  const origin = req.headers.get('origin')||'*';
  const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'};

  if(req.method==='OPTIONS') return new Response(null,{headers:cors});
  if(req.method==='GET') return new Response(HTML,{headers:{...cors,'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; media-src * blob: data:; img-src * data:; connect-src *;"}});
  if(req.method!=='POST') return new Response('',{status:405});

  let body:Record<string,unknown>={};
  try{body=await req.json();}catch(_){}

  // Salvar contato
  if(body._salvar){
    await salvarLead(String(body.contato||''),String(body.sessaoId||''));
    return new Response(JSON.stringify({ok:true}),{headers:{...cors,'Content-Type':'application/json'}});
  }

  // Rastrear clique/audio/video
  if(body._track){
    await registrarEvento(String(body.tipo||'click'),String(body.alvo||''),String(body.sessaoId||''));
    return new Response(JSON.stringify({ok:true}),{headers:{...cors,'Content-Type':'application/json'}});
  }

  // Processar mensagem
  const mensagem  = String(body.mensagem||'').slice(0,600);
  const historico = Array.isArray(body.historico)?body.historico:[];
  if(!mensagem) return new Response(JSON.stringify({resposta:'Me chama no WhatsApp: (31) 98324-4713 😊'}),{headers:{...cors,'Content-Type':'application/json'}});

  const massagemDetectada = detectarMassagem(mensagem);
  const pedindoExplicacao = ePedidoDeExplicacao(mensagem);

  // Verificar disponibilidade se mensagem tem data e horário
  let contextoAgenda = '';
  const { dia, mes, horario, dataStr } = extrairDataHorario(mensagem);
  if(dia && mes && horario && dataStr){
    const [planilha, calendar] = await Promise.all([
      verificarPlanilha(dia, mes, horario),
      verificarCalendar(dataStr, horario),
    ]);
    const livre = planilha.livre && calendar.livre;
    const desc = calcularDesconto(dataStr, 320); // valor base genérico p/ desconto
    contextoAgenda = `Data solicitada: ${dia}/${mes} às ${horario} (${dataStr})
Planilha: ${planilha.livre ? 'LIVRE' : 'OCUPADO - ' + (planilha.dados[1]||'reservado')}
Calendar: ${calendar.livre ? 'LIVRE' : 'OCUPADO - ' + calendar.eventos.join(', ')}
Disponível: ${livre ? 'SIM' : 'NÃO'}
Dias de antecedência: ${desc.diasAntecedencia}
Desconto 20% aplicável: ${desc.temDesconto ? 'SIM' : 'NÃO (menos de 30 dias)'}`;
  }

  const msgs = [...historico.map((m:Record<string,string>)=>({role:m.role,content:m.content})),{role:'user',content:mensagem}];
  const resposta = await responderIA(msgs, contextoAgenda || undefined);

  let audio:string|null=null, video:string|null=null, nomeM:string|null=null;
  if(massagemDetectada&&(pedindoExplicacao||historico.length<=2)){
    const m=MASSAGENS[massagemDetectada];
    if(m){audio=m.audio;video=m.video;nomeM=massagemDetectada.split(' ').map((w:string)=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');}
  }

  return new Response(JSON.stringify({resposta,audio,video,massagem:nomeM}),{headers:{...cors,'Content-Type':'application/json'}});
});
