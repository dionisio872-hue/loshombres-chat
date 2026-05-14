// chatCliente v10 — Los Hombres
// GET  → HTML do chat
// POST → processar mensagem (IA + agenda + agendamento completo)

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const APP_ID     = '6a04cc22bf7a0dcea87e3c43';
const SVC_TOKEN  = Deno.env.get('BASE44_SERVICE_TOKEN') || '';
const BOT_TOKEN  = Deno.env.get('TELEGRAM_CLIENT_BOT_TOKEN') || '';
const ADMIN_ID   = '7200577395';
const SHEET_ID   = '1XHF_Jw2dPtw9w8b5Eae3EmPK1CyBepjOyZ7JKWZd7Uk';
const DEST_EMAIL = 'dionisio872@gmail.com';
const FOTO_URL   = 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/461551448_jonathan_perfil.jpg';
const EP         = 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/functions/chatCliente';
const FORM_URL   = 'https://docs.google.com/forms/d/e/1FAIpQLSdL6c1o3rXGHQjRyi0wzSxvAKOZ6XPIZhX6TJHn2cfEnNoiWA/viewform';
const ABAS: Record<number,string> = {1:'JAN',2:'FEV',3:'MAR',4:'ABRI',5:'MAI',6:'JUN',7:'JUL',8:'AGO',9:'SET',10:'OUT',11:'NOV',12:'DEZ'};
const HORARIOS_PADRAO = ['9:30','11:00','13:00','14:30','16:00','17:30','19:00'];
// Duração padrão de cada sessão em minutos (para calcular bloqueio de hora seguinte)
const DURACAO_SESSAO = 90;

// ─── TABELA DE PREÇOS ───────────────────────────────────────────────────────
const PRECOS: Record<string,number> = {
  'relaxante sensual':320,'relaxante tradicional':250,'4 maos':650,'miofascial':320,
  'ventosaterapia':250,'tantrica experience':400,'hidrotantra':450,'tantrica mutua':499,
  'hot':200,'quick massage':250,'nuru summa':499,'massagem dos deuses':750,'burn':399,
  'summa experientia':1350,'podoloterapia':449,'blind experience':499,'tie and teaser':450,
  'tantrica casal':640,'nuru casal':650,'relaxante sensual casal':600,'massagem grupo cegas':200,
};
const TABELA = `TRADICIONAIS:
• Relaxante Sensual: R$ 320 (30 dias antes: R$ 256)
• Relaxante Tradicional: R$ 250
• Massagem 4 Maos: R$ 650
• Miofascial: R$ 320
• Ventosaterapia: R$ 250

SENSUAIS:
• Tantrica Experience (Lingam): R$ 400 (30 dias antes: R$ 320)
• Hidrotantra (banheira): R$ 450 (30 dias antes: R$ 360)
• Tantrica Mutua: R$ 499 (30 dias antes: R$ 399)

EROTICAS:
• HOT Massagem: R$ 180 a R$ 230
• Quick Massage (25min): R$ 250
• Nuru Summa (corpo a corpo): R$ 499 (30 dias antes: R$ 399)
• Massagem dos Deuses (vinho+petiscos): R$ 750
• Burn: R$ 399
• Summa Experientia: R$ 1.350 (unica com interacao intima - PrEP + preservativo)

FETISH:
• Podoloterapia: R$ 449
• Blind Experience: R$ 499
• Tie and Teaser BDSM: R$ 450

CASAIS:
• Tantrica Casal: R$ 480 a R$ 800
• Nuru Casal: R$ 650
• Relaxante Sensual Casal: R$ 400 a R$ 800

EXPERIENCIAS:
• Massagem as Cegas (grupo): R$ 200

Agendando com 30 dias de antecedencia: 20% de desconto!`;

// ─── MIDIAS ─────────────────────────────────────────────────────────────────
const MIDIAS: Record<string,{audio:string;video:string;descricao:string}> = {
  'relaxante sensual':{
    audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/3dd77b15c_relaxante_sensual.mp3',
    video:'https://drive.google.com/file/d/11-2dPRI-12wXk-YG0kEoaQzHDMCDKXLn/view',
    descricao:'Massagem relaxante com toque sensorial envolvente. Ideal para desligar do mundo com um toque cuidadoso e presente, que percorre o corpo todo com tecnica e sensibilidade. R$ 320 (ou R$ 256 com 30 dias de antecedencia).'
  },
  'tantrica experience':{
    audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/5ebaa1cb7_tantra_experience.mp3',
    video:'https://drive.google.com/file/d/1iX0TQyZtnH5Te1oKJDQRkM2ah1Id9gsT/view',
    descricao:'Experiencia bioenergetica e sensorial com Lingam Massagem. Trabalha a energia vital do corpo, promovendo relaxamento profundo e conexao intima. R$ 400 (ou R$ 320 com 30 dias de antecedencia).'
  },
  'quick massage':{
    audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/9b0bfdb87_quick.mp3',
    video:'https://drive.google.com/file/d/19UFSp-pYb-_GeZfBoGVnmhVjxdm_ifqi/view',
    descricao:'25 minutos de tecnica oriental com deslizamento corporal. Ideal para uma pausa rapida e intensa no dia. R$ 250.'
  },
  'miofascial':{
    audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/c605ad306_miofascial.mp3',
    video:'https://drive.google.com/file/d/1WsXJH2FHG9qW2Cvh9DXBxAkQicwnOJhj/view',
    descricao:'Liberacao miofascial com massagem esportiva em roupas intimas. Para quem vive em movimento e quer alivio tecnico com toque envolvente. R$ 320.'
  },
  'nuru summa':{
    audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/fa37daf7b_nuru.mp3',
    video:'https://drive.google.com/file/d/12drdn_6WstMhAuDfkxgdz7mryfNnapBB/view',
    descricao:'Corpo a corpo com oleo especial, deslizamento completo, ambos nus. Imersao sensorial profunda e intensa. R$ 499 (ou R$ 399 com 30 dias de antecedencia).'
  },
  'tantrica mutua':{
    audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/9e4019729_tantra_mutua.mp3',
    video:'https://drive.google.com/file/d/1kPCvgZpc6HZUZjlZLlsB_1cydVzfEPzl/view',
    descricao:'Toque consciente mutuo, ambos nus, experiencia guiada. Conexao energetica e autoconhecimento compartilhado. R$ 499 (ou R$ 399 com 30 dias de antecedencia).'
  },
  'blind experience':{
    audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/3d7e0aa91_blind.mp3',
    video:'https://drive.google.com/file/d/1e2zigQk2sKRZJzz-gpGfVzeVYO1-ha-H/view',
    descricao:'Privacao visual, sensacoes amplificadas. O toque se torna muito mais intenso sem a visao. R$ 499.'
  },
  'massagem dos deuses':{
    audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/c67565fce_deuses.mp3',
    video:'https://drive.google.com/file/d/1ZmA8cPeoWq2r6EXxCiWGYSsj96S_cqlA/view',
    descricao:'Imersao sensorial com vinho e petiscos, interacao permitida. Experiencia premium e sofisticada. R$ 750.'
  },
  'hot':{
    audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/2cf6b9baf_7d3111fba_Hotmassagem.ogg',
    video:'https://drive.google.com/file/d/1CXkvTG3UeANayJp2-taDU7dbnT1JEnmB/view',
    descricao:'Estimulos sensoriais localizados e concentrados. Curta, objetiva e marcante. R$ 180 a R$ 230.'
  },
  'tie and teaser':{
    audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/d229e48c4_tie_teaser.mp3',
    video:'https://drive.google.com/file/d/1LsOQ__1GVRIkHhB0JaLX8moX34qHMzEa/view',
    descricao:'Sensorial guiado por controle e provocacao consciente. Experiencia BDSM com seguranca e cuidado. R$ 450.'
  },
  'hidrotantra':{
    audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/6160220ba_hidrotantra.mp3',
    video:'https://drive.google.com/file/d/1rHJNPd4mVVieHvhFT9c8Zs58YbgdYGOo/view',
    descricao:'Vivencia aquatica com banheira de hidromassagem. Relaxamento com agua quente e toque fluido. R$ 450 (ou R$ 360 com 30 dias de antecedencia).'
  },
  'burn':{
    audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/8970682cf_burn.mp3',
    video:'https://drive.google.com/file/d/1yVnDrJNcJMUMX3cghb904Ph6AlD5axNp/view',
    descricao:'Estimulos termicos e sensoriais. Ativacao corporal profunda e intensa. R$ 399.'
  },
  'summa experientia':{
    audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/13d3b5d71_summa_experientia.mp3',
    video:'https://drive.google.com/file/d/1P6WR-AyHFsXOk9gcQvo6DDYGbNkDlMX0/view',
    descricao:'Experiencia maxima completa. A unica com interacao intima integrada. R$ 1.350. Protocolos de saude: PrEP + preservativo.'
  },
  '4 maos':{
    audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/d6b331670_4maos.mp3',
    video:'https://www.loshombres.com.br/index.html#massagem-4-maos',
    descricao:'Dois terapeutas em sincronia perfeita. Imersao sensorial completa e envolvente. R$ 650.'
  },
  'podoloterapia':{
    audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/44675462b_podoloterapia.mp3',
    video:'https://drive.google.com/file/d/1tMZpDTEW0aTuQHTICdPJiJx3ZPhmQ14n/view',
    descricao:'Foco total nos pes, alivio de tensoes e relaxamento profundo. R$ 449.'
  },
  'tantrica casal':{
    audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/3dc790b06_tantra_casal.mp3',
    video:'https://drive.google.com/file/d/1FnOivOdKreK4hZ-wFTLRgUxNBNarDKZV/view',
    descricao:'Toque consciente para casais. Reconexao emocional e sensorial a dois. R$ 480 a R$ 800.'
  },
  'relaxante sensual casal':{
    audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/6c22f5ac1_relaxante_sensual_casal.mp3',
    video:'https://drive.google.com/file/d/1B1f-GeDCRQD8lEUiQccO59fhRb_71RiM/view',
    descricao:'Relaxamento compartilhado com toque sensorial leve e envolvente para casais. R$ 400 a R$ 800.'
  },
  'nuru casal':{
    audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/787e65832_nuru_casal.mp3',
    video:'https://drive.google.com/file/d/1rJ70vOebyKpQ_RhzGXzjQ-Dw1-xt4eLM/view',
    descricao:'Deslizamento corpo a corpo com oleo especial para casais. Conexao intensa e sensorial. R$ 650.'
  },
};

// ─── HELPERS ────────────────────────────────────────────────────────────────
function norm(t:string):string{
  return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
}
function detectarMassagem(texto:string):string|null{
  const n=norm(texto);
  const chaves=Object.keys(MIDIAS).sort((a,b)=>b.length-a.length);
  for(const k of chaves){if(n.includes(norm(k)))return k;}
  if(n.includes('relaxante')&&n.includes('casal'))return 'relaxante sensual casal';
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

// ─── AGENDA: buscar horários REALMENTE livres ─────────────────────────────
async function buscarHorariosLivres(dia:string, mes:number, unidade:string): Promise<{livres:string[];ocupados:Record<string,string>}> {
  const sheetsToken = Deno.env.get('GOOGLESHEETS_ACCESS_TOKEN')||'';
  const calToken    = Deno.env.get('GOOGLECALENDAR_ACCESS_TOKEN')||'';
  const aba         = ABAS[mes]||'MAI';
  const diaInt      = parseInt(dia);
  const diaStr      = String(diaInt);
  const diaStr2     = String(diaInt).padStart(2,'0');
  const ano         = 2026;

  // 1. Planilha — pegar todos os horários do dia
  const ocupadosPlanilha: Record<string,string> = {};
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${aba}!A1:I300`,
      {headers:{Authorization:`Bearer ${sheetsToken}`}}
    );
    const d = await res.json();
    const rows:string[][] = d.values||[];
    for(const r of rows){
      const rDia = (r[0]||'').trim();
      if(rDia!==diaStr && rDia!==diaStr2) continue;
      const rNome = (r[1]||'').trim();
      const rHor  = (r[6]||'').trim().replace('h',':');
      if(!rHor) continue;
      // Considera ocupado se tem nome E não está CANCELADO
      if(rNome && rNome!=='' && !rNome.toUpperCase().includes('CANCELADO') && rNome.toUpperCase()!=='FERIADO'){
        ocupadosPlanilha[rHor] = rNome;
        // Bloquear horário seguinte se a sessão durar 90min
        // (ex: sessão às 17:00 bloqueia 18:00/18:30)
        const [h,m]=(rHor+':00').split(':').map(Number);
        const fimMin = h*60 + (m||0) + DURACAO_SESSAO;
        for(const hr of HORARIOS_PADRAO){
          const [hh,mm]=(hr+':00').split(':').map(Number);
          const hrMin = hh*60+(mm||0);
          // Se o horário padrão cai dentro da sessão atual, bloquear
          if(hrMin > h*60+(m||0) && hrMin < fimMin){
            ocupadosPlanilha[hr] = `(bloqueado - sessão de ${rHor})`;
          }
        }
      }
    }
  } catch(e:any){ console.error('Planilha busca:', e.message); }

  // 2. Google Calendar — pegar eventos do dia inteiro
  const ocupadosCalendar: Record<string,string> = {};
  try {
    const inicio = new Date(`${ano}-${String(mes).padStart(2,'0')}-${diaStr2}T00:00:00-03:00`).toISOString();
    const fim    = new Date(`${ano}-${String(mes).padStart(2,'0')}-${diaStr2}T23:59:00-03:00`).toISOString();
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${inicio}&timeMax=${fim}&singleEvents=true&orderBy=startTime`,
      {headers:{Authorization:`Bearer ${calToken}`}}
    );
    const d = await res.json();
    for(const ev of (d.items||[])){
      if(ev.status==='cancelled') continue;
      const evStart = ev.start?.dateTime||ev.start?.date||'';
      if(!evStart) continue;
      const dt = new Date(evStart);
      const hEvt = dt.getHours();
      const mEvt = dt.getMinutes();
      const evEndDt = ev.end?.dateTime ? new Date(ev.end.dateTime) : new Date(dt.getTime()+90*60000);
      const hFim  = evEndDt.getHours()*60 + evEndDt.getMinutes();
      // Bloquear todos os horários padrão que colidem com esse evento
      for(const hr of HORARIOS_PADRAO){
        const [hh,mm]=(hr+':00').split(':').map(Number);
        const hrMin=hh*60+(mm||0);
        const inicioEvMin=hEvt*60+mEvt;
        // Colide se começa antes do fim do evento E termina depois do início
        if(hrMin+DURACAO_SESSAO > inicioEvMin && hrMin < hFim){
          ocupadosCalendar[hr] = ev.summary||'Compromisso';
        }
      }
    }
  } catch(e:any){ console.error('Calendar busca:', e.message); }

  // 3. Regra: mínimo 4h de antecedência
  const agora    = new Date();
  const minimoMs = 4*60*60*1000;
  const ocupadosPorAntecedencia: Record<string,string> = {};
  for(const hr of HORARIOS_PADRAO){
    const [hh,mm]=(hr+':00').split(':').map(Number);
    const dtSessao = new Date(`${ano}-${String(mes).padStart(2,'0')}-${diaStr2}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00-03:00`);
    if(dtSessao.getTime() - agora.getTime() < minimoMs){
      ocupadosPorAntecedencia[hr] = 'menos de 4h de antecedencia';
    }
  }

  // Unir todos os ocupados
  const todosOcupados = {...ocupadosPlanilha,...ocupadosCalendar,...ocupadosPorAntecedencia};
  const livres = HORARIOS_PADRAO.filter(hr => !todosOcupados[hr]);

  return { livres, ocupados: todosOcupados };
}

// ─── GRAVAR AGENDAMENTO COMPLETO ─────────────────────────────────────────────
async function gravarAgendamento(params:{
  nome:string; telefone:string; servico:string; unidade:string;
  dia:string; mes:number; horario:string; valor:number; obs?:string;
}): Promise<{ok:boolean;erro?:string}> {
  const sheetsToken = Deno.env.get('GOOGLESHEETS_ACCESS_TOKEN')||'';
  const calToken    = Deno.env.get('GOOGLECALENDAR_ACCESS_TOKEN')||'';
  const gmailToken  = Deno.env.get('GMAIL_ACCESS_TOKEN')||'';
  const aba         = ABAS[params.mes]||'MAI';
  const diaStr      = String(parseInt(params.dia)).padStart(2,'0');
  const mesStr      = String(params.mes).padStart(2,'0');
  const ano         = 2026;
  const [hh,mm]     = (params.horario+':00').split(':').map(Number);
  const sinal       = 30;
  const restante    = params.valor - sinal;

  try {
    // 1. PLANILHA — append
    const novaLinha = [
      String(parseInt(params.dia)),
      params.nome.toUpperCase(),
      params.telefone,
      `${params.servico} - ${params.unidade}`.toUpperCase(),
      params.obs||'',
      FORM_URL,
      params.horario,
      `Sinal R$${sinal} pago - falta R$${restante}`,
      `R$ ${params.valor}`
    ];
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${aba}!A:I:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {method:'POST',headers:{Authorization:`Bearer ${sheetsToken}`,'Content-Type':'application/json'},
       body:JSON.stringify({values:[novaLinha]})}
    );

    // 2. GOOGLE CALENDAR — criar evento
    const inicio = new Date(`${ano}-${mesStr}-${diaStr}T${String(hh).padStart(2,'0')}:${String(mm||0).padStart(2,'0')}:00-03:00`);
    const fimCal = new Date(inicio.getTime() + DURACAO_SESSAO*60000);
    const enderecoUnidade = params.unidade.toUpperCase().includes('BETIM')
      ? 'Rua Pernambuco, 341 - Bairro Nossa Senhora das Gracas, Betim'
      : 'Rua Tome de Souza, 503, Sala 208 - Savassi, Belo Horizonte';
    await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {method:'POST',headers:{Authorization:`Bearer ${calToken}`,'Content-Type':'application/json'},
       body:JSON.stringify({
         summary:`${params.nome} - ${params.servico}`,
         location: enderecoUnidade,
         description:`Telefone: ${params.telefone}\nServico: ${params.servico}\nUnidade: ${params.unidade}\nValor: R$ ${params.valor} (Sinal R$${sinal} pago - falta R$${restante})\nFormulario: ${FORM_URL}`,
         start:{dateTime:inicio.toISOString(),timeZone:'America/Sao_Paulo'},
         end:{dateTime:fimCal.toISOString(),timeZone:'America/Sao_Paulo'},
       })}
    );

    // 3. TELEGRAM — notificação imediata para Jonathan
    const msgTg = `🔔 *NOVO AGENDAMENTO*\n\n👤 *${params.nome}*\n📱 ${params.telefone}\n💆 ${params.servico}\n📍 ${params.unidade}\n📅 ${diaStr}/${mesStr} as ${params.horario}\n💰 R$ ${params.valor} (sinal R$${sinal} pago)\n\nFormulario enviado ao cliente.`;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({chat_id:ADMIN_ID,text:msgTg,parse_mode:'Markdown'})
    });

    // 4. EMAIL
    const subject = `Novo agendamento: ${params.nome} - ${diaStr}/${mesStr} as ${params.horario}`;
    const htmlEmail = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1a1a2e;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">Novo Agendamento Confirmado</h2>
        <p style="margin:5px 0 0;opacity:.8">Estudio Los Hombres</p>
      </div>
      <div style="background:#f9f9f9;padding:20px;border:1px solid #ddd;border-radius:0 0 8px 8px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;font-weight:bold;color:#555;width:35%">Cliente</td><td>${params.nome}</td></tr>
          <tr style="background:#fff"><td style="padding:8px;font-weight:bold;color:#555">Telefone</td><td>${params.telefone}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;color:#555">Servico</td><td>${params.servico}</td></tr>
          <tr style="background:#fff"><td style="padding:8px;font-weight:bold;color:#555">Unidade</td><td>${params.unidade}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;color:#555">Data</td><td>${diaStr}/${mesStr}/${ano} as ${params.horario}</td></tr>
          <tr style="background:#fff"><td style="padding:8px;font-weight:bold;color:#555">Valor Total</td><td>R$ ${params.valor}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;color:#555">Sinal Pago</td><td>R$ ${sinal}</td></tr>
          <tr style="background:#fff"><td style="padding:8px;font-weight:bold;color:#555">Restante</td><td>R$ ${restante}</td></tr>
        </table>
        <div style="margin-top:15px;text-align:center">
          <a href="https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit" style="background:#1a1a2e;color:#fff;padding:10px 20px;border-radius:5px;text-decoration:none;margin-right:10px">Ver Planilha</a>
          <a href="https://calendar.google.com/calendar/r" style="background:#4285f4;color:#fff;padding:10px 20px;border-radius:5px;text-decoration:none">Ver Calendar</a>
        </div>
      </div>
    </div>`;
    const raw = `To: ${DEST_EMAIL}\r\nSubject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${htmlEmail}`;
    const encoded = btoa(unescape(encodeURIComponent(raw))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{
      method:'POST',headers:{Authorization:`Bearer ${gmailToken}`,'Content-Type':'application/json'},
      body:JSON.stringify({raw:encoded})
    }).catch(()=>{});

    // 5. ENTITY LeadConversa — atualizar status
    try {
      await fetch(`https://base44.app/api/apps/${APP_ID}/entities/LeadConversa`,{
        method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${SVC_TOKEN}`},
        body:JSON.stringify({nome:params.nome,whatsapp:params.telefone,canal_origem:'chat_web',etapa_funil:'agendamento',
          massagem_interesse:params.servico,unidade_interesse:params.unidade,
          data_ultima_mensagem:new Date().toISOString(),
          observacoes:`Agendado ${diaStr}/${mesStr} as ${params.horario} - R$ ${params.valor}`})
      });
    } catch(_){}

    return {ok:true};
  } catch(e:any){
    return {ok:false,erro:e.message};
  }
}

// ─── SYSTEM PROMPT ──────────────────────────────────────────────────────────
const SYSTEM = `Voce e o assistente de atendimento do Jonathan, massagista do Estudio Los Hombres em BH.

REGRAS ABSOLUTAS:
- NUNCA use travessoes (dash duplo). Nunca.
- NUNCA mande link externo para ver precos. Precos estao abaixo, use direto.
- Responda em portugues natural, caloroso, sem julgamento.
- Maximo 3 paragrafos curtos por resposta.
- SEMPRE mencione desconto de 20% para 30 dias de antecedencia.
- Quando o usuario perguntar sobre massagem especifica: o sistema JA envia audio e video automaticamente. Voce so precisa escrever a descricao da massagem.

IDENTIDADE: Jonathan, massagista em BH.
Savassi: Rua Tome de Souza, 503, Sala 208
Betim: Rua Pernambuco, 341 - Bairro Nossa Sra das Gracas
WhatsApp: (31) 98324-4713

${TABELA}

FLUXO DE AGENDAMENTO (SIGA ESTRITAMENTE):
1. Identificar qual massagem o cliente quer
2. Perguntar qual unidade (Savassi ou Betim)
3. Perguntar data desejada
4. O SISTEMA VERIFICARA automaticamente e retornara os horarios REALMENTE livres no CONTEXTO DE AGENDA abaixo. Use EXATAMENTE esses horarios.
5. Apos cliente escolher horario: informar valor (com/sem desconto conforme antecedencia) e pedir sinal R$30 via PIX CNPJ 17342740000109 (JG Espaco Multservicos)
6. Apos pagamento do sinal: PEDIR O TELEFONE de contato do cliente
7. Apos receber telefone: confirmar tudo, enviar link do formulario e informar que o agendamento sera gravado.
8. O SISTEMA GRAVA automaticamente na planilha, cria evento no Calendar e envia notificacao.

REGRAS DE AGENDA:
- NUNCA invente horarios livres. Use APENAS os horarios do CONTEXTO DE AGENDA.
- Minimo 4h de antecedencia obrigatorio.
- Um compromisso de 90min bloqueia o horario seguinte tambem.
- Verificar PLANILHA e CALENDAR simultaneamente.
- Se nao houver horarios livres no dia, sugerir outro dia.

RESPOSTAS DIRETAS:
- "Onde fica?" = dar os dois enderecos completos
- "Tem sexo?" = nao, exceto Summa Experientia (R$1.350, PrEP+preservativo)
- "Quanto custa?" = listar precos direto, nao mandar link
- Tatuagem = WhatsApp 31991266270
- Conteudo adulto = WhatsApp 31987862117
- Vagas = formulario + (31) 98787-0330
- Vergonha do corpo = atende todos, sem julgamento, corpos reais`;

// ─── IA ─────────────────────────────────────────────────────────────────────
async function responderIA(msgs:{role:string;content:string}[], extra?:string): Promise<string> {
  const sys = extra ? SYSTEM+'\n\nCONTEXTO DE AGENDA:\n'+extra : SYSTEM;
  const res = await fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${OPENAI_KEY}`},
    body:JSON.stringify({model:'gpt-4o-mini',max_tokens:600,temperature:0.55,
      messages:[{role:'system',content:sys},...msgs]})
  });
  const d = await res.json();
  return d.choices?.[0]?.message?.content?.trim()||'Me chama no WhatsApp: (31) 98324-4713';
}

// ─── EXTRAIR DATA/HORÁRIO DA MENSAGEM ────────────────────────────────────────
function extrairDataHorario(texto:string):{dia:string|null;mes:number|null;horario:string|null;dataISO:string|null}{
  const hoje = new Date();
  const n = texto.toLowerCase();
  let dia:string|null=null, mes:number|null=null, dataISO:string|null=null;

  if(n.includes('amanha')||n.includes('amanhã')){
    const a=new Date(hoje); a.setDate(hoje.getDate()+1);
    dia=String(a.getDate()); mes=a.getMonth()+1;
    dataISO=`2026-${String(mes).padStart(2,'0')}-${String(a.getDate()).padStart(2,'0')}`;
  } else if(n.includes('hoje')){
    dia=String(hoje.getDate()); mes=hoje.getMonth()+1;
    dataISO=`2026-${String(mes).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`;
  } else {
    const m1 = texto.match(/(\d{1,2})[\/\-](\d{1,2})/);
    if(m1){dia=m1[1];mes=parseInt(m1[2]);dataISO=`2026-${String(mes).padStart(2,'0')}-${m1[1].padStart(2,'0')}`;}
    else {
      const m2=texto.match(/dia\s+(\d{1,2})/i);
      if(m2){dia=m2[1];mes=hoje.getMonth()+1;dataISO=`2026-${String(mes).padStart(2,'0')}-${m2[1].padStart(2,'0')}`;}
    }
  }

  const hMatch=texto.match(/(\d{1,2})[h:\s]?(\d{0,2})(?:\s*(?:h|hs|hrs|horas))?/i);
  let horario:string|null=null;
  if(hMatch){
    const h=parseInt(hMatch[1]); const m=parseInt(hMatch[2]||'0');
    if(h>=8&&h<=21) horario=`${h}:${String(m).padStart(2,'0')}`;
  }
  return {dia,mes,horario,dataISO};
}

function calcularDesconto(dataISO:string|null,valor:number):{comDesconto:boolean;valorFinal:number;dias:number}{
  if(!dataISO)return{comDesconto:false,valorFinal:valor,dias:0};
  const dias=Math.floor((new Date(dataISO).getTime()-Date.now())/(1000*60*60*24));
  return{comDesconto:dias>=30,valorFinal:dias>=30?Math.round(valor*0.8):valor,dias};
}

// ─── HTML ────────────────────────────────────────────────────────────────────
// O HTML e gerado estaticamente e servido pelo GitHub Pages
// O EP aponta para esta funcao para processar mensagens

const HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Los Hombres - Atendimento</title>
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
.inp-area{background:var(--surface);border-top:1px solid var(--border);padding:10px 12px;display:flex;align-items:flex-end;gap:8px;flex-shrink:0;position:relative;z-index:200}
#inp{flex:1;background:var(--surf2);border:1.5px solid var(--border);border-radius:22px;padding:10px 15px;font-size:14px;color:var(--text);outline:none;resize:none;max-height:100px;min-height:44px;font-family:inherit;line-height:1.45;transition:border-color .2s}
#inp:focus{border-color:var(--gold)}#inp::placeholder{color:var(--muted)}
#sbtn{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold2));border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;-webkit-tap-highlight-color:transparent;transition:transform .1s}
#sbtn:active{transform:scale(.88)}#sbtn:disabled{opacity:.3;cursor:default;transform:none}
.fab{position:fixed;bottom:140px;right:12px;background:#229ED9;color:#fff;border-radius:50px;padding:10px 15px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:7px;box-shadow:0 4px 18px rgba(34,158,217,.35);text-decoration:none;z-index:99}
@media(max-width:420px){.fab .ft{display:none}.fab{border-radius:50%;padding:11px;bottom:130px}}
</style>
</head>
<body>
<div class="wrap">
<div class="hdr">
  <div class="av-w">
    <img class="av" src="FOTO_AQUI" alt="Jonathan">
    <div class="dot"></div>
  </div>
  <div class="hdr-i">
    <h2>Jonathan</h2>
    <div class="on">online agora</div>
    <div class="sub">Massagista &middot; Savassi &amp; Betim &middot; BH</div>
  </div>
  <div class="logo-txt">LOS<br>HOMBRES</div>
</div>
<div class="notice">Atendimento sigiloso &middot; Suas informacoes nao sao compartilhadas</div>
<div class="msgs" id="msgs"></div>
<div class="quick" id="quick">
  <button class="qb" data-q="Quais massagens voces oferecem?">Massagens</button>
  <button class="qb" data-q="Quero agendar uma sessao">Agendar</button>
  <button class="qb" data-q="Quanto custa cada massagem?">Precos</button>
  <button class="qb" data-q="Tem massagem para casais?">Casais</button>
  <button class="qb" data-q="Onde fica o estudio?">Onde fica</button>
  <button class="qb" data-q="Tem sexo nas massagens?">Duvidas</button>
</div>
<div class="inp-area">
  <textarea id="inp" rows="1" placeholder="Digite sua mensagem..." maxlength="600"></textarea>
  <button id="sbtn" type="button" disabled>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
  </button>
</div>
</div>
<a class="fab" href="https://t.me/Atendimentoloshombresbot" target="_blank" rel="noopener" id="fabTg">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.01 9.47c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.48 14.4l-2.95-.924c-.64-.204-.654-.64.136-.95l11.527-4.444c.537-.194 1.006.131.37.166z"/></svg>
  <span class="ft">Telegram</span>
</a>
<script>
var EP='EP_AQUI';
var FOTO='FOTO_AQUI';
var msgsEl=document.getElementById('msgs');
var inpEl=document.getElementById('inp');
var sbtnEl=document.getElementById('sbtn');
var quickEl=document.getElementById('quick');
var busy=false,hist=[],sessaoId=Math.random().toString(36).slice(2,10),contatoOk=false;

document.getElementById('fabTg').onclick=function(){
  try{fetch(EP,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({_track:true,tipo:'link',alvo:'telegram',sessaoId:sessaoId})});}catch(e){}
};

function hora(){var d=new Date();return('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);}
function scroll(){msgsEl.scrollTop=msgsEl.scrollHeight;}
function mkAv(){var i=document.createElement('img');i.className='rav';i.src=FOTO;i.alt='J';return i;}
function delayHumano(txt){return Math.min(3500,Math.max(1500,(txt||'').length*14));}

function addMsgBot(txt,audio,video,nomeM){
  var row=document.createElement('div');row.className='row bot';row.appendChild(mkAv());
  var col=document.createElement('div');col.className='col';
  var bub=document.createElement('div');bub.className='bub bot';bub.textContent=txt||'';
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
        else{audioEl.play();pb.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';playing=true;}
      };
      audioEl.onended=function(){pb.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M8 5v14l11-7z"/></svg>';playing=false;};
      var ai=document.createElement('div');ai.className='audio-info';
      var an=document.createElement('div');an.className='audio-nome';an.textContent=(nomeM||'Audio da massagem');
      var as2=document.createElement('div');as2.className='audio-sub';as2.textContent='Toque para ouvir';
      ai.appendChild(an);ai.appendChild(as2);mc.appendChild(pb);mc.appendChild(ai);card.appendChild(mc);
    }
    if(video){
      var mv=document.createElement('div');mv.className='mc-video';
      var va=document.createElement('a');va.href=video;va.target='_blank';va.rel='noopener';
      va.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="#53bdeb"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg> Ver video da massagem';
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

function isContato(t){
  return /\d[\d\s\-\(\)\+]{7,}/.test(t)||/[\w\.\+\-]+@[\w\.]+\.\w{2,}/.test(t);
}
function salvarContato(c){
  contatoOk=true;
  try{fetch(EP,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({_salvar:true,contato:c,sessaoId:sessaoId})});}catch(e){}
}

function enviar(txt){
  if(busy)return;
  var t=(txt||'').trim();
  if(!t)return;
  inpEl.value='';
  inpEl.style.height='auto';
  busy=true;sbtnEl.disabled=true;
  addMsgMe(t);
  hist.push({role:'user',content:t});
  if(!contatoOk&&isContato(t))salvarContato(t);
  showTyping();
  fetch(EP,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mensagem:t,historico:hist.slice(-20),sessaoId:sessaoId})})
    .then(function(r){return r.json();})
    .then(function(d){
      var delay=delayHumano(d.resposta||'');
      setTimeout(function(){
        hideTyping();
        addMsgBot(d.resposta||'Me chama no WhatsApp: (31) 98324-4713',d.audio||null,d.video||null,d.massagem||null);
        hist.push({role:'assistant',content:d.resposta||''});
        // Se veio confirmacao de agendamento gravado
        if(d.agendado){
          setTimeout(function(){
            addMsgBot('Agendamento confirmado e gravado! Formulario: FORM_AQUI\\n\\nEstou te esperando. Traga RG ou CNH e venha de banho tomado.',null,null,null);
          },1500);
        }
        busy=false;sbtnEl.disabled=false;inpEl.focus();
      },delay);
    })
    .catch(function(){
      hideTyping();
      addMsgBot('Probleminha aqui. Me chama no WhatsApp: (31) 98324-4713',null,null,null);
      busy=false;sbtnEl.disabled=false;
    });
}
quickEl.addEventListener('click',function(e){var b=e.target.closest('.qb');if(b&&!busy)enviar(b.getAttribute('data-q'));});
inpEl.addEventListener('input',function(){sbtnEl.disabled=!this.value.trim();this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px';});
inpEl.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();enviar(this.value);}});
sbtnEl.addEventListener('click',function(){enviar(inpEl.value);});

setTimeout(function(){
  addMsgBot('Ola! Bem-vindo ao Estudio Los Hombres.\\n\\nSou o Jonathan, massagista especializado em atendimento masculino de alto padrao em BH, com espacos na Savassi e em Betim.',null,null,null);
  hist.push({role:'assistant',content:'Ola! Sou o Jonathan. Atendimento masculino de alto padrao em BH, Savassi e Betim.'});
  setTimeout(function(){
    addMsgBot('Pode me perguntar sobre massagens, valores ou agendamento. Agendando com 30 dias de antecedencia voce garante 20% de desconto.',null,null,null);
    hist.push({role:'assistant',content:'Pode me perguntar sobre massagens, valores ou agendamento. 30 dias de antecedencia = 20% de desconto.'});
  },2200);
},600);
</script>
</body>
</html>`;

// ─── SERVIDOR ────────────────────────────────────────────────────────────────
Deno.serve(async (req:Request) => {
  const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
  if(req.method==='OPTIONS') return new Response(null,{headers:cors});

  if(req.method==='GET'){
    const htmlFinal = HTML
      .replace(/FOTO_AQUI/g, FOTO_URL)
      .replace(/EP_AQUI/g, EP)
      .replace(/FORM_AQUI/g, FORM_URL);
    return new Response(htmlFinal,{headers:{...cors,'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',
      'Content-Security-Policy':"default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; media-src * blob: data:; img-src * data:; connect-src *;"}});
  }

  if(req.method!=='POST') return new Response('',{status:405});
  let body:Record<string,unknown>={};
  try{body=await req.json();}catch(_){}

  // Salvar contato
  if(body._salvar){
    try{
      await fetch(`https://base44.app/api/apps/${APP_ID}/entities/LeadConversa`,{
        method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${SVC_TOKEN}`},
        body:JSON.stringify({whatsapp:String(body.contato||''),canal_origem:'chat_web',etapa_funil:'consulta',
          ultima_mensagem:'Chat web',data_ultimo_contato:new Date().toISOString(),observacoes:`Sessao: ${body.sessaoId||''}`})
      });
    } catch(_){}
    return new Response(JSON.stringify({ok:true}),{headers:{...cors,'Content-Type':'application/json'}});
  }

  // Track
  if(body._track){
    return new Response(JSON.stringify({ok:true}),{headers:{...cors,'Content-Type':'application/json'}});
  }

  // Processar mensagem
  const mensagem  = String(body.mensagem||'').slice(0,800);
  const historico = Array.isArray(body.historico)?body.historico:[];
  if(!mensagem) return new Response(JSON.stringify({resposta:'Me chama no WhatsApp: (31) 98324-4713'}),{headers:{...cors,'Content-Type':'application/json'}});

  // Detectar massagem
  const massagemKey = detectarMassagem(mensagem);

  // Verificar se mensagem tem data para consultar agenda
  const {dia, mes, horario, dataISO} = extrairDataHorario(mensagem);
  let contextoAgenda = '';
  let horariosLivres: string[] = [];

  // Detectar unidade no histórico ou mensagem
  const textoCompleto = mensagem + ' ' + historico.map((m:Record<string,string>)=>m.content||'').join(' ');
  const temBetim = norm(textoCompleto).includes('betim');
  const temSavassi = norm(textoCompleto).includes('savassi');
  const unidade = temBetim ? 'Betim' : temSavassi ? 'Savassi' : '';

  if(dia && mes){
    const resultado = await buscarHorariosLivres(dia, mes, unidade);
    horariosLivres = resultado.livres;
    const desconto = calcularDesconto(dataISO, 320);
    contextoAgenda = `DATA SOLICITADA: ${dia}/${mes}\nHORARIOS LIVRES: ${horariosLivres.length > 0 ? horariosLivres.join(', ') : 'NENHUM - sugerir outro dia'}\nHORARIOS OCUPADOS: ${Object.entries(resultado.ocupados).map(([h,n])=>`${h} (${n})`).join(', ')||'nenhum'}\nANTECEDENCIA: ${desconto.dias} dias (${desconto.comDesconto?'DESCONTO 20% APLICAVEL':'sem desconto'})\nUNIDADE DETECTADA: ${unidade||'nao informada ainda'}`;
  }

  // Detectar se cliente esta confirmando agendamento com dados completos
  // (telefone presente + histórico tem massagem, unidade, data e horario)
  let agendadoOk = false;
  const nHist = historico.length;
  const temTelefone = /\d[\d\s\-\(\)\+]{8,}/.test(mensagem);
  const historicoConcatenado = historico.map((m:Record<string,string>)=>m.content||'').join(' ');

  if(temTelefone && nHist >= 6){
    // Tentar extrair dados do histórico para gravar
    const massDet = detectarMassagem(historicoConcatenado+' '+mensagem);
    const {dia:dHist, mes:mHist, horario:hHist} = extrairDataHorario(historicoConcatenado);
    const uni = norm(historicoConcatenado).includes('betim')?'Betim':norm(historicoConcatenado).includes('savassi')?'Savassi':'Savassi';
    // Extrair nome do histórico (primeira mensagem geralmente)
    const nomePossivel = historico.find((m:Record<string,string>)=>m.role==='user'&&m.content?.length>2&&m.content?.length<40)?.content||'Cliente';

    if(massDet && dHist && mHist && hHist){
      const valorBase = PRECOS[massDet]||300;
      const {valorFinal} = calcularDesconto(dataISO||`2026-${String(mHist).padStart(2,'0')}-${String(parseInt(dHist)).padStart(2,'0')}`, valorBase);
      const telefone = (mensagem.match(/[\d\s\-\(\)\+]{9,}/)||[''])[0].trim();
      const grav = await gravarAgendamento({
        nome: nomePossivel,
        telefone,
        servico: massDet.split(' ').map((w:string)=>w.charAt(0).toUpperCase()+w.slice(1)).join(' '),
        unidade: uni,
        dia: dHist,
        mes: mHist,
        horario: hHist,
        valor: valorFinal,
      });
      agendadoOk = grav.ok;
    }
  }

  // Montar msgs para IA
  const msgs = [
    ...historico.map((m:Record<string,string>)=>({role:m.role,content:m.content})),
    {role:'user',content:mensagem}
  ];
  const resposta = await responderIA(msgs, contextoAgenda||undefined);

  // Mídia: enviar sempre que massagem especifica for mencionada pela 1a vez
  let audio:string|null=null, video:string|null=null, nomeMidia:string|null=null;
  if(massagemKey){
    const m = MIDIAS[massagemKey];
    if(m){
      audio=m.audio; video=m.video;
      nomeMidia=massagemKey.split(' ').map((w:string)=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
    }
  }

  return new Response(JSON.stringify({resposta,audio,video,massagem:nomeMidia,agendado:agendadoOk,horariosLivres}),
    {headers:{...cors,'Content-Type':'application/json'}});
});
