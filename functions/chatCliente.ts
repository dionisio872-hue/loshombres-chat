/**
 * chatCliente v20 — Los Hombres
 * v15: fix tokens OAuth + horários corretos + fluxo rigoroso + sem RG/banho + gpt-4o + temperature 0.85
 * 1. Desconto 20% correto: só se data >= 30 dias a partir de HOJE
 * 2. Horários por unidade/dia da semana:
 *    - Betim: terça a partir das 14h, quinta a partir das 16h (sem outros dias)
 *    - Savassi: quinta 18h a segunda 19h (seg,qui,sex,sab,dom)
 * 3. Gravação efetiva na planilha e Calendar após confirmação de pagamento + dados do cliente
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const OPENAI_KEY   = Deno.env.get('OPENAI_API_KEY') || '';
const BOT_TOKEN    = Deno.env.get('TELEGRAM_CLIENT_BOT_TOKEN') || '';
const SVC_TOKEN    = Deno.env.get('BASE44_SERVICE_TOKEN') || '';

// Cria request autenticado com service token para uso em funções chamadas externamente
function makeAuthRequest(originalReq: Request): Request {
  const headers = new Headers(originalReq.headers);
  if (!headers.get('Authorization') && SVC_TOKEN) {
    headers.set('Authorization', `Bearer ${SVC_TOKEN}`);
  }
  return new Request(originalReq.url, {
    method: originalReq.method,
    headers,
    body: null,
  });
}

async function getGoogleTokens(req: Request): Promise<{sheetsToken:string;calToken:string;gmailToken:string}> {
  let sheetsToken='', calToken='', gmailToken='';
  try {
    const authReq = makeAuthRequest(req);
    const b = createClientFromRequest(authReq);
    const [s, c, g] = await Promise.all([
      b.asServiceRole.connectors.getConnection('googlesheets').catch(() => ({accessToken:''})),
      b.asServiceRole.connectors.getConnection('googlecalendar').catch(() => ({accessToken:''})),
      b.asServiceRole.connectors.getConnection('gmail').catch(() => ({accessToken:''})),
    ]);
    sheetsToken = s.accessToken || '';
    calToken    = c.accessToken || '';
    gmailToken  = g.accessToken || '';
    console.log('Tokens OK — sheets:', sheetsToken.length>10, 'cal:', calToken.length>10, 'gmail:', gmailToken.length>10);
  } catch(e:any) {
    console.error('getGoogleTokens ERRO:', e.message);
  }
  return { sheetsToken, calToken, gmailToken };
}
const ADMIN_ID   = '7200577395';
const GRUPO_JG_ID = '-1003866193031'; // Gestão JG
const MIN_ANTECEDENCIA_HORAS = 2; // Mínimo 2h de antecedência para agendamento
const SHEET_ID   = '1XHF_Jw2dPtw9w8b5Eae3EmPK1CyBepjOyZ7JKWZd7Uk';
const DEST_EMAIL = 'dionisio872@gmail.com';
const FOTO_URL   = 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/461551448_jonathan_perfil.jpg';
const EP         = 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/functions/chatCliente';
const FORM_URL   = 'https://docs.google.com/forms/d/e/1FAIpQLSdL6c1o3rXGHQjRyi0wzSxvAKOZ6XPIZhX6TJHn2cfEnNoiWA/viewform';
const ABAS: Record<number,string> = {1:'JAN',2:'FEV',3:'MAR',4:'ABRI',5:'MAI',6:'JUN',7:'JUL',8:'AGO',9:'SET',10:'OUT',11:'NOV',12:'DEZ'};
const DUR = 90; // duração padrão em minutos

// ─── REGRAS DE HORÁRIO POR UNIDADE E DIA DA SEMANA ────────────────────────
// 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
const HORARIOS_BETIM: Record<number, string[]> = {
  2: ['14:00','15:30','17:00','18:30'],        // Terça: a partir das 14h
  4: ['16:00','17:30','19:00'],                // Quinta: a partir das 16h
};
const HORARIOS_SAVASSI: Record<number, string[]> = {
  0: ['19:00','20:30'],                         // Domingo
  1: ['19:00','20:30'],                         // Segunda
  4: ['18:00','19:30','21:00'],                 // Quinta
  5: ['18:00','19:30','21:00'],                 // Sexta
  6: ['18:00','19:30','21:00'],                 // Sábado
};

const PRECOS: Record<string,number> = {
  'relaxante sensual':320,'4 maos':650,'miofascial':320,'tantrica experience':400,
  'hidrotantra':450,'tantrica mutua':499,'hot':200,'quick massage':250,'nuru summa':499,
  'massagem dos deuses':750,'burn':399,'summa experientia':1350,'podoloterapia':449,
  'blind experience':499,'tie and teaser':450,'tantrica casal':640,'nuru casal':650,
  'relaxante sensual casal':600,'ventosaterapia':250,
};

const MIDIAS: Record<string,{audio:string;video:string}> = {
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
  'hidrotantra':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/6160220ba_hidrotantra.mp3',video:'https://drive.google.com/file/d/1rHJNPd4mVVieHvhFT9c8Zs58YbgdYGOo/view'},
  'burn':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/8970682cf_burn.mp3',video:'https://drive.google.com/file/d/1yVnDrJNcJMUMX3cghb904Ph6AlD5axNp/view'},
  'summa experientia':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/13d3b5d71_summa_experientia.mp3',video:'https://drive.google.com/file/d/1P6WR-AyHFsXOk9gcQvo6DDYGbNkDlMX0/view'},
  '4 maos':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/d6b331670_4maos.mp3',video:''},
  'podoloterapia':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/44675462b_podoloterapia.mp3',video:'https://drive.google.com/file/d/1tMZpDTEW0aTuQHTICdPJiJx3ZPhmQ14n/view'},
  'tantrica casal':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/3dc790b06_tantra_casal.mp3',video:'https://drive.google.com/file/d/1FnOivOdKreK4hZ-wFTLRgUxNBNarDKZV/view'},
  'relaxante sensual casal':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/6c22f5ac1_relaxante_sensual_casal.mp3',video:'https://drive.google.com/file/d/1B1f-GeDCRQD8lEUiQccO59fhRb_71RiM/view'},
  'nuru casal':{audio:'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/787e65832_nuru_casal.mp3',video:'https://drive.google.com/file/d/1rJ70vOebyKpQ_RhzGXzjQ-Dw1-xt4eLM/view'},
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
  if(n.includes('nuru')&&n.includes('casal'))return 'nuru casal';
  if(n.includes('tantra')&&n.includes('casal'))return 'tantrica casal';
  if(n.includes('tantra')&&n.includes('mutua'))return 'tantrica mutua';
  if(n.includes('tantra')||n.includes('tantrica'))return 'tantrica experience';
  if(n.includes('nuru'))return 'nuru summa';
  if(n.includes('relaxante'))return 'relaxante sensual';
  if(n.includes('deuses'))return 'massagem dos deuses';
  if(n.includes('blind')||n.includes('cego'))return 'blind experience';
  if(n.includes('quick')||n.includes('25min'))return 'quick massage';
  if(n.includes('hidro')||n.includes('banheira'))return 'hidrotantra';
  if(n.includes('tie')||n.includes('teaser')||n.includes('bdsm'))return 'tie and teaser';
  if(n.includes('summa')||n.includes('intima'))return 'summa experientia';
  if(n.includes('mio')||n.includes('fascial'))return 'miofascial';
  if(n.includes('podo'))return 'podoloterapia';
  if(n.includes('burn'))return 'burn';
  if(n.includes('hot'))return 'hot';
  return null;
}

function extrairData(texto:string):{dia:string|null;mes:number|null;dataISO:string|null}{
  // Usar timezone Brasil
  const agora = new Date(new Date().toLocaleString('en-US',{timeZone:'America/Sao_Paulo'}));
  const n=texto.toLowerCase();
  let dia:string|null=null,mes:number|null=null,dataISO:string|null=null;
  if(n.includes('amanha')||n.includes('amanhã')){
    const a=new Date(agora);a.setDate(agora.getDate()+1);
    dia=String(a.getDate());mes=a.getMonth()+1;
    dataISO=`2026-${String(mes).padStart(2,'0')}-${String(a.getDate()).padStart(2,'0')}`;
  }else if(n.includes('hoje')){
    dia=String(agora.getDate());mes=agora.getMonth()+1;
    dataISO=`2026-${String(mes).padStart(2,'0')}-${String(agora.getDate()).padStart(2,'0')}`;
  }else{
    const m1=texto.match(/(\d{1,2})[\/\-](\d{1,2})/);
    if(m1){
      const d1=parseInt(m1[1]),m1v=parseInt(m1[2]);
      // Validar: dia 1-31, mes 1-12
      if(d1>=1&&d1<=31&&m1v>=1&&m1v<=12){dia=m1[1];mes=m1v;dataISO=`2026-${String(mes).padStart(2,'0')}-${m1[1].padStart(2,'0')}`;}
    }
    if(!dia){const m2=texto.match(/dia\s+(\d{1,2})/i);if(m2){dia=m2[1];mes=agora.getMonth()+1;dataISO=`2026-${String(mes).padStart(2,'0')}-${m2[1].padStart(2,'0')}`;}}
  }
  return{dia,mes,dataISO};
}

function extrairHorario(texto:string):string|null{
  const m=texto.match(/(\d{1,2})\s*[h:]\s*(\d{0,2})/i);
  if(!m)return null;
  const h=parseInt(m[1]),min=parseInt(m[2]||'0');
  if(h>=8&&h<=22)return `${h}:${String(min).padStart(2,'0')}`;
  return null;
}

function extrairWhatsApp(texto:string):string|null{
  const m=texto.match(/\(?(\d{2})\)?\s*(\d{4,5})[\s\-]?(\d{4})/);
  if(m)return `(${m[1]}) ${m[2]}-${m[3]}`;
  return null;
}

// CORREÇÃO 1: desconto só se data >= 30 dias a partir de HOJE
function calcularDesconto(dataISO:string|null,valor:number):{valorFinal:number;dias:number;comDesconto:boolean}{
  if(!dataISO)return{valorFinal:valor,dias:0,comDesconto:false};
  const hoje=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Sao_Paulo'}));
  hoje.setHours(0,0,0,0);
  const dataAlvo=new Date(dataISO+'T00:00:00');
  const dias=Math.floor((dataAlvo.getTime()-hoje.getTime())/86400000);
  const comDesconto=dias>=30;
  return{valorFinal:comDesconto?Math.round(valor*0.8):valor,dias,comDesconto};
}

// CORREÇÃO 2: horários válidos por unidade + dia da semana
function getHorariosBase(unidade:string|null, dataISO:string|null):string[]{
  if(!dataISO||!unidade)return [];
  const dt=new Date(dataISO+'T12:00:00-03:00');
  const dow=dt.getDay(); // 0=Dom,1=Seg,...,6=Sab
  const isBetim=unidade.toLowerCase().includes('betim');
  if(isBetim){
    return HORARIOS_BETIM[dow]||[];
  }else{
    return HORARIOS_SAVASSI[dow]||[];
  }
}

// ─── BUSCAR HORÁRIOS LIVRES ──────────────────────────────────────────────────
async function buscarHorariosLivres(
  req:Request, dia:string, mes:number, _unidade:string|null
):Promise<{livres:{hora:string;linha:number}[];ocupados:{hora:string;linha:number;quem:string}[];diaSemana:string}>{
  const DIAS=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const dInt=parseInt(dia);
  const dStr=String(dInt).padStart(2,'0');
  const mesStr=String(mes).padStart(2,'0');
  const dataISO=`2026-${mesStr}-${dStr}`;
  const dow=new Date(dataISO+'T12:00:00-03:00').getDay();
  const diaSemana=DIAS[dow];

  const{sheetsToken,calToken}=await getGoogleTokens(req);
  if(!sheetsToken) return{livres:[],ocupados:[],diaSemana};

  const aba=ABAS[mes]||'MAI';

  // ─── 1. LER PLANILHA ────────────────────────────────────────────────────
  const res=await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${aba}!A1:H500`,
    {headers:{Authorization:`Bearer ${sheetsToken}`}}
  );
  const rows:string[][]=(await res.json()).values||[];

  const livres:{hora:string;linha:number}[]=[];
  const ocupados:{hora:string;linha:number;quem:string}[]=[];

  for(let i=0;i<rows.length;i++){
    const r=[...rows[i]];while(r.length<8)r.push('');
    const colA=(r[0]||'').trim();
    const colG=(r[6]||'').trim();
    const colB=(r[1]||'').trim();
    if(colA!==String(dInt)&&colA!==dStr) continue;
    if(!colG) continue;
    const horaDisplay=normHora(colG)||colG;
    const ehHoraValida=/^\d{1,2}[h:]\d{0,2}$|^\d{1,2}h$/i.test(colG.trim());
    if(ehHoraValida){
      if(!colB) livres.push({hora:horaDisplay,linha:i+1});
      else ocupados.push({hora:horaDisplay,linha:i+1,quem:colB});
    } else {
      ocupados.push({hora:colG.slice(0,20),linha:i+1,quem:colB||'evento'});
    }
  }

  // ─── 2. CRUZAR COM GOOGLE CALENDAR ──────────────────────────────────────
  // Busca todos os eventos do dia no Calendar e bloqueia slots livres que conflitem
  if(calToken){
    try{
      const calRes=await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/dionisio872%40gmail.com/events?timeMin=${dataISO}T00:00:00-03:00&timeMax=${dataISO}T23:59:59-03:00&singleEvents=true&orderBy=startTime`,
        {headers:{Authorization:`Bearer ${calToken}`}}
      );
      const calData=await calRes.json();
      const eventos:(typeof calData.items)=calData.items||[];
      console.log(`Calendar dia ${dStr}/${mesStr}: ${eventos.length} eventos`);

      for(const ev of eventos){
        const dtStart=ev.start?.dateTime||ev.start?.date||'';
        if(!dtStart) continue;
        const evH=parseInt(dtStart.slice(11,13));
        const evM=parseInt(dtStart.slice(14,16)||'0');
        const evHora=`${String(evH).padStart(2,'0')}:${String(evM).padStart(2,'0')}`;
        const quem=ev.summary||'evento externo';

        // Para cada slot livre da planilha, verificar se conflita com evento do Calendar
        for(let idx=livres.length-1;idx>=0;idx--){
          const slotNorm=normHora(livres[idx].hora);
          if(slotNorm===evHora){
            console.log(`⚠️ Slot ${evHora} livre na planilha mas OCUPADO no Calendar por: ${quem} — bloqueando`);
            // Mover de livres para ocupados
            ocupados.push({hora:livres[idx].hora,linha:livres[idx].linha,quem:`[Calendar] ${quem}`});
            livres.splice(idx,1);
          }
        }

        // Também registrar eventos do Calendar que não têm linha na planilha
        const jaOcupado=ocupados.some(o=>normHora(o.hora)===evHora);
        const jaLivre=livres.some(l=>normHora(l.hora)===evHora);
        if(!jaOcupado&&!jaLivre){
          console.log(`📅 Evento no Calendar sem linha na planilha: ${evHora} — ${quem}`);
          ocupados.push({hora:evHora,linha:-1,quem:`[Calendar] ${quem}`});
        }
      }
    }catch(ce:any){console.error('Calendar busca erro:',ce.message);}
  }

  // ── FILTRAR slots com menos de 2h de antecedência (agendamento no mesmo dia) ──
  const agora = new Date(new Date().toLocaleString('en-US',{timeZone:'America/Sao_Paulo'}));
  const agoraMins = agora.getHours()*60 + agora.getMinutes();
  // Verificar se a data solicitada é hoje
  const dataReq = new Date(`${dataISO}T12:00:00-03:00`);
  const dataHoje = new Date(new Date().toLocaleString('en-US',{timeZone:'America/Sao_Paulo'}));
  const ehHoje = dataReq.getDate()===dataHoje.getDate() && dataReq.getMonth()===dataHoje.getMonth();
  if(ehHoje){
    const MIN_ANTEC = 120; // 2 horas = 120 minutos
    const livresFiltrados = livres.filter(slot=>{
      const norm = normHora(slot.hora);
      if(!norm) return false;
      const [h,m] = norm.split(':').map(Number);
      const slotMins = h*60 + m;
      return (slotMins - agoraMins) >= MIN_ANTEC;
    });
    console.log(`Filtro 2h: ${livres.length} slots → ${livresFiltrados.length} disponíveis`);
    return{livres:livresFiltrados,ocupados,diaSemana};
  }
  return{livres,ocupados,diaSemana};
}

async function gravarAgendamento(req:Request,p:{
  nome:string;whatsapp:string;servico:string;unidade:string;
  dia:string;mes:number;horario:string;valor:number;
  clienteId?:string;fingerprint?:string;
}):Promise<{ok:boolean;erro?:string;linha?:number}>{
  const{sheetsToken,calToken,gmailToken}=await getGoogleTokens(req);
  const aba=ABAS[p.mes]||'MAI';
  const dInt=parseInt(p.dia),dStr=String(dInt).padStart(2,'0'),mStr=String(p.mes).padStart(2,'0');
  const sinal=30,restante=p.valor-sinal;
  const horaAlvo=normHora(p.horario);
  const[hh,mm]=(horaAlvo+':00').split(':').map(Number);

  try{
    // ── 1. PLANILHA ──────────────────────────────────────────────────────────
    // Lógica: col A = dia buscado + col G = hora buscada + col B VAZIA = gravar aqui (UPDATE)
    // Se não encontrar linha exata, inserir nova linha no bloco do dia
    if(sheetsToken){
      try{
        const lRes=await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${aba}!A1:H500`,
          {headers:{Authorization:`Bearer ${sheetsToken}`}}
        );
        const rows:string[][]=(await lRes.json()).values||[];
        const dInt2=parseInt(p.dia);

        let linhaExata=-1;      // linha com dia+hora+nome vazio
        let ultimaLinhaDia=-1;  // última linha do bloco deste dia (fallback insert)

        for(let i=0;i<rows.length;i++){
          const r=[...rows[i]];while(r.length<8)r.push('');
          const colA=(r[0]||'').trim();
          const colG=normHora((r[6]||'').trim());
          const colB=(r[1]||'').trim();

          if(colA!==String(dInt2)&&colA!==dStr) continue;
          ultimaLinhaDia=i;

          // Linha exata: mesmo dia, mesma hora na col G, col B vazia
          if(colG===horaAlvo&&!colB&&linhaExata<0){
            linhaExata=i;
          }
        }

        if(linhaExata>=0){
          // UPDATE: gravar B,C,D,E,F (nome,tel,serv,form,obs) + H (valor)
          // NUNCA tocar em col G — hora já está pré-preenchida na planilha
          const linhaNum=linhaExata+1;
          const rangeBF=`${aba}!B${linhaNum}:F${linhaNum}`;
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${rangeBF}?valueInputOption=USER_ENTERED`,
            {method:'PUT',headers:{Authorization:`Bearer ${sheetsToken}`,'Content-Type':'application/json'},
             body:JSON.stringify({range:rangeBF,values:[[
               p.nome.toUpperCase(),
               p.whatsapp,
               p.servico.toUpperCase(),
               FORM_URL,
               `Sinal R$${sinal} pago - falta R$${restante}`
             ]]})}
          );
          // H separado (pula G)
          const rangeH=`${aba}!H${linhaNum}`;
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${rangeH}?valueInputOption=USER_ENTERED`,
            {method:'PUT',headers:{Authorization:`Bearer ${sheetsToken}`,'Content-Type':'application/json'},
             body:JSON.stringify({range:rangeH,values:[[`R$${p.valor}`]]})}
          );
          console.log('✅ Planilha UPDATE linha',linhaNum,'B:F+H — G intacto');
        } else if(ultimaLinhaDia>=0){
          // INSERT: hora não existe como linha pré-criada — inserir nova no bloco do dia
          const metaRes=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`,{headers:{Authorization:`Bearer ${sheetsToken}`}});
          const meta=await metaRes.json();
          const sheetIdNum:number=meta.sheets?.find((s:any)=>s.properties?.title===aba)?.properties?.sheetId??0;
          const linhaInsert=ultimaLinhaDia+2; // 1-indexado, inserir após última linha do dia

          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate`,{
            method:'POST',
            headers:{Authorization:`Bearer ${sheetsToken}`,'Content-Type':'application/json'},
            body:JSON.stringify({requests:[{insertDimension:{
              range:{sheetId:sheetIdNum,dimension:'ROWS',startIndex:linhaInsert-1,endIndex:linhaInsert},
              inheritFromBefore:true
            }}]})
          });
          const rangeNova=`${aba}!A${linhaInsert}:H${linhaInsert}`;
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${rangeNova}?valueInputOption=USER_ENTERED`,
            {method:'PUT',headers:{Authorization:`Bearer ${sheetsToken}`,'Content-Type':'application/json'},
             body:JSON.stringify({range:rangeNova,values:[[
               String(dInt2),p.nome.toUpperCase(),p.whatsapp,p.servico.toUpperCase(),
               FORM_URL,`Sinal R$${sinal} pago - falta R$${restante}`,p.horario,`R$${p.valor}`
             ]]})}
          );
          console.log('✅ Planilha INSERT linha',linhaInsert,'(dia',dInt2,'hora',p.horario,')');
        } else {
          // APPEND: dia não encontrado
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${aba}!A:H:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
            {method:'POST',headers:{Authorization:`Bearer ${sheetsToken}`,'Content-Type':'application/json'},
             body:JSON.stringify({values:[[String(dInt2),p.nome.toUpperCase(),p.whatsapp,p.servico.toUpperCase(),FORM_URL,`Sinal R$${sinal}`,p.horario,`R$${p.valor}`]]})}
          );
          console.log('⚠️ Dia não encontrado — append final');
        }
      }catch(se:any){console.error('Sheets erro:',se.message);}
    }

    // ── 2. GOOGLE CALENDAR ───────────────────────────────────────────────────
    if(calToken){
      const enderecoUnidade=p.unidade.toLowerCase().includes('betim')
        ?'Rua Pernambuco, 341 - Betim, MG'
        :'Rua Tomé de Souza, 503, Sala 208 - Savassi, BH';
      const ini=new Date(`2026-${mStr}-${dStr}T${String(hh).padStart(2,'0')}:${String(mm||0).padStart(2,'0')}:00-03:00`);
      const fim=new Date(ini.getTime()+DUR*60000);
      // Criar evento apenas no calendário principal (evitar duplicatas em múltiplas agendas)
      const calEvRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/dionisio872%40gmail.com/events',{
        method:'POST',headers:{Authorization:`Bearer ${calToken}`,'Content-Type':'application/json'},
        body:JSON.stringify({
          summary:`${p.nome} - ${p.servico}`,
          location:enderecoUnidade,
          description:`WhatsApp: ${p.whatsapp}\nValor: R$${p.valor} (sinal R$${sinal}, falta R$${restante})`,
          start:{dateTime:ini.toISOString(),timeZone:'America/Sao_Paulo'},
          end:{dateTime:fim.toISOString(),timeZone:'America/Sao_Paulo'},
          guestsCanModify:false,
          visibility:'private',
          sendUpdates:'none',
        })
      });
      console.log('Calendar status:',calEvRes.status);
      if(!calEvRes.ok){const err=await calEvRes.text();console.error('Calendar erro:',err.slice(0,200));}
    }

    // ── 3. TELEGRAM ───────────────────────────────────────────────────────────
    const agendaNow = new Date(new Date().toLocaleString('en-US',{timeZone:'America/Sao_Paulo'}));
    const agendaData = new Date(`2026-${mStr}-${dStr}T${String(hh).padStart(2,'0')}:${String(mm||0).padStart(2,'0')}:00`);
    const horasRestantes = Math.round((agendaData.getTime()-agendaNow.getTime())/(1000*60*60));
    const isMesmodia = agendaData.getDate()===agendaNow.getDate() && agendaData.getMonth()===agendaNow.getMonth();

    // Alerta padrão para o grupo
    const textoBase = `🔔 *NOVO AGENDAMENTO — Chat Web*\n\n👤 *${p.nome}*\n📱 ${p.whatsapp}\n💆 ${p.servico}\n📍 ${p.unidade}\n📅 ${dStr}/${mStr} às ${p.horario}\n💰 R$${p.valor} (sinal R$${sinal} pago)\n✅ Planilha e Calendar atualizados.`;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({chat_id:GRUPO_JG_ID,parse_mode:'Markdown',text:textoBase})
    }).catch(()=>{});

    // Alerta de URGÊNCIA separado quando é no mesmo dia
    if(isMesmodia){
      // Montar link WA com mensagem de confirmação para o cliente
      const telCliente = (p.whatsapp||'').replace(/\D/g,'');
      const waNumero   = telCliente.startsWith('55') ? telCliente : `55${telCliente}`;
      const waMsgConf  = encodeURIComponent(
        `Olá ${p.nome.split(' ')[0]}! 🌿 Seu agendamento está confirmado para HOJE às ${p.horario}h na unidade ${p.unidade}. Estamos te aguardando! ✨`
      );
      const waLink = `https://wa.me/${waNumero}?text=${waMsgConf}`;

      // Callback ID para cancelar — codifica os dados mínimos necessários
      const cancelKey = `cancel_urgente:${dStr}:${mStr}:${p.horario.replace(':','')}:${p.nome.slice(0,15).replace(/ /g,'_')}`;

      const textoUrgencia = [
        '🚨🚨🚨 *URGENTE — AGENDAMENTO HOJE* 🚨🚨🚨',
        '⚠️⚠️⚠️ *ATENÇÃO IMEDIATA NECESSÁRIA* ⚠️⚠️⚠️',
        '',
        `🟡 Cliente chegando em aprox. *${horasRestantes}h*`,
        '',
        `👤 *${p.nome}*`,
        `📱 ${p.whatsapp}`,
        `💆 ${p.servico.replace(/\b\w/g,(c:string)=>c.toUpperCase())}`,
        `📍 ${p.unidade}`,
        `🕐 HOJE às *${p.horario}*`,
        `💰 R$${p.valor} (sinal R$30 pago · falta R$${p.valor-30})`,
        '',
        '🔴 *AÇÃO NECESSÁRIA — use os botões abaixo* 🔴',
      ].join('\n');

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          chat_id:GRUPO_JG_ID,
          parse_mode:'Markdown',
          text:textoUrgencia,
          reply_markup:{
            inline_keyboard:[
              [
                {text:'✅ Confirmar para cliente (WA)',url:waLink},
              ],
              [
                {text:'❌ Cancelar evento',callback_data:cancelKey},
                {text:'📋 Ver planilha',url:`https://docs.google.com/spreadsheets/d/1XHF_Jw2dPtw9w8b5Eae3EmPK1CyBepjOyZ7JKWZd7Uk/edit`},
              ],
            ]
          }
        })
      }).catch(()=>{});
    }

    // ── 4. EMAIL ──────────────────────────────────────────────────────────────
    if(gmailToken){
      const subj=`Agendamento: ${p.nome} - ${dStr}/${mStr} às ${p.horario}`;
      const html=`<h2>🔔 Novo Agendamento</h2><p><b>Cliente:</b> ${p.nome}</p><p><b>WhatsApp:</b> ${p.whatsapp}</p><p><b>Serviço:</b> ${p.servico}</p><p><b>Unidade:</b> ${p.unidade}</p><p><b>Data:</b> ${dStr}/${mStr} às ${p.horario}</p><p><b>Valor:</b> R$${p.valor} (sinal R$${sinal}, falta R$${restante})</p>`;
      const raw=`To: ${DEST_EMAIL}\r\nSubject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subj)))}?=\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${html}`;
      const enc=btoa(unescape(encodeURIComponent(raw))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
      await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{
        method:'POST',headers:{Authorization:`Bearer ${gmailToken}`,'Content-Type':'application/json'},
        body:JSON.stringify({raw:enc})
      }).catch(()=>{});
    }

    // ── 5. LEAD ───────────────────────────────────────────────────────────────
    try{
      const b=createClientFromRequest(makeAuthRequest(req));
      await b.asServiceRole.entities.LeadConversa.create({
        nome:p.nome,whatsapp:p.whatsapp,canal_origem:'chat_web',etapa_funil:'confirmado',
        massagem_interesse:p.servico,unidade_interesse:p.unidade,converteu:true,
        data_ultima_mensagem:new Date().toISOString(),
        observacoes:`${dStr}/${mStr} às ${p.horario} — R$${p.valor} | clienteId:${p.clienteId||''} fp:${p.fingerprint||''}`
      });
    }catch(_){}

    return{ok:true};
  }catch(e:any){console.error('gravarAgendamento ERRO:',e.message);return{ok:false,erro:e.message};}
}



// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────
const SYSTEM = `Você é o Jonathan, massagista do Estúdio Los Hombres em BH. Você mesmo está respondendo — fale como você, não como um bot.

REGRA ABSOLUTA: NUNCA repita boas-vindas se já houver histórico. Continue de onde parou. Responda o que o cliente acabou de dizer.

COMO VOCÊ FALA:
- Como um cara que entende do assunto e é direto ao ponto. Simples, calmo, sem enrolação.
- PROIBIDO usar essas frases ou variações: "Você merece essa entrega", "uma viagem de sensações", "proporcionar conforto e bem-estar", "Conte comigo para escolher a experiência perfeita", "envolvimento único e inesquecível", "experiência transformadora".
- PROIBIDO: emoji em toda frase. No máximo 1 por resposta, só se fizer sentido real.
- PROIBIDO: parágrafo longo. Máximo 2-3 frases curtas por resposta.
- PROIBIDO: listar 3 opções quando o cliente não pediu. Sugira UMA baseada no que ele disse.
- "Qual me indica?" → primeiro pergunte o que ele busca (relaxamento, algo mais intenso, algo diferente?). Aí sugere uma.
- Normalize dúvidas sobre nudez, vergonha do corpo — sem cerimônia, como quem já falou isso mil vezes.

EXEMPLOS DO SEU TOM (imite exatamente esse jeito):
- "Relaxante Sensual é uma boa pra começar. R$320, 90 minutos."
- "Me conta o que você tá buscando — relaxar, algo mais intenso, algo diferente?"
- "Sem problema nenhum. Aqui não tem julgamento, pode vir tranquilo."
- "Qual data você tá pensando?"
- "Tem duas unidades: Savassi e Betim. Qual fica melhor pra você?"

MASSAGENS E PREÇOS:
Relaxante Sensual R$320 | Tântrica Experience R$400 | Quick Massage R$250 | Miofascial R$320
Nuru Summa R$499 | Tântrica Mútua R$499 | Blind Experience R$499 | Massagem dos Deuses R$750
HOT R$200 | Tie and Teaser R$450 | Hidrotantra R$450 | Burn R$399
Summa Experientia R$1.350 (única com interação íntima — PrEP + preservativo)
4 Mãos R$650 | Podoloterapia R$449 | Tântrica Casal R$640 | Relaxante Sensual Casal R$600 | Nuru Casal R$650

Desconto 20% para agendamentos com 30+ dias de antecedência.
Sinal R$30 via PIX CNPJ 17342740000109 (JG Espaço Multserviços).
Tabela completa: https://www.loshombres.com.br/tabela.html

FLUXO DE AGENDAMENTO (siga essa ordem):
1. Confirme qual massagem e valor
2. Pergunte Savassi ou Betim
3. Pergunte a data
4. Você receberá HORARIOS LIVRES no contexto — liste só eles, de forma simples
5. Cliente confirma horário → peça nome completo e WhatsApp
6. Após gravado → diga que está confirmado e que vai entrar em contato

NUNCA diga "massagem sensual" — nome correto é "Relaxante Sensual".
Para Summa Experientia: fale normalmente sobre o protocolo de saúde (PrEP + preservativo).
Respostas sempre em português.`;

async function chamarIA(msgs:{role:string;content:string}[],ctx?:string):Promise<string>{
  const sys=ctx?SYSTEM+'\n\nCONTEXTO DO SISTEMA:\n'+ctx:SYSTEM;
  const r=await fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${OPENAI_KEY}`},
    body:JSON.stringify({model:'gpt-4o',max_tokens:600,temperature:0.85,
      messages:[{role:'system',content:sys},...msgs]})
  });
  const d=await r.json();
  return d.choices?.[0]?.message?.content?.trim()||'Me chama no WhatsApp: (31) 98324-4713';
}

function analisarHistorico(hist:{role:string;content:string}[]){
  const txt=hist.map(m=>m.content||'').join(' ');
  const n=norm(txt);
  const massagem=detectarMassagem(txt);
  const unidade=n.includes('betim')?'Betim':n.includes('savassi')?'Savassi':null;
  let dia:string|null=null,mes:number|null=null,dataISO:string|null=null,horario:string|null=null;
  for(const m of hist){
    const d=extrairData(m.content||'');
    if(d.dia&&d.mes&&parseInt(d.dia)>=1&&d.mes>=1){dia=d.dia;mes=d.mes;dataISO=d.dataISO;}
    const h=extrairHorario(m.content||'');
    if(h&&parseInt(h.split(':')[0])>=8&&parseInt(h.split(':')[0])<=22)horario=h;
  }
  const valorBase=massagem?PRECOS[massagem]||300:300;
  const{valorFinal,dias,comDesconto}=calcularDesconto(dataISO,valorBase);

  const botPediuPix=hist.some(m=>
    m.role==='assistant'&&norm(m.content||'').includes('pix')&&norm(m.content||'').includes('sinal')
  );
  const clientePagou=hist.some(m=>
    m.role==='user'&&/paguei|feito|fiz|transferi|enviado|mandei|pago|ja fiz|ok|done/.test(norm(m.content||''))
  );
  const botPediuContato=hist.some(m=>
    m.role==='assistant'&&/nome completo|whatsapp|numero de contato/.test(norm(m.content||''))
  );

  let whatsapp:string|null=null,nome:string|null=null;
  for(let i=hist.length-1;i>=0;i--){
    const m=hist[i];if(m.role!=='user')continue;
    const w=extrairWhatsApp(m.content||'');if(w&&!whatsapp)whatsapp=w;
    const t=(m.content||'').trim();
    if(!nome&&t.length>3&&t.length<60&&!/\d{5,}/.test(t)&&/^[a-záàâãéèêíïóôõöúüçñ ]+$/i.test(t)&&t.split(' ').length>=2)
      nome=t;
  }
  return{massagem,unidade,dia,mes,horario,valor:valorFinal,dias,comDesconto,dataISO,botPediuPix,clientePagou,botPediuContato,nome,whatsapp};
}

// ─── HTML ────────────────────────────────────────────────────────────────────
const HTML_TEMPLATE=`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Los Hombres</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--gold:#c9a84c;--g2:#7a5418;--bg:#0a0a0a;--s1:#141414;--s2:#1c1c1c;--bd:#252525;--tx:#f0f0f0;--mu:#666;--bot:#0d0d20;--gr:#22c55e}
html,body{height:100%;background:var(--bg);color:var(--tx);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;overflow:hidden}
.wrap{display:flex;flex-direction:column;height:100dvh;max-width:640px;margin:0 auto}
.hdr{background:linear-gradient(180deg,#1c1c1c,#111);border-bottom:1px solid var(--bd);padding:10px 16px;display:flex;align-items:center;gap:12px;flex-shrink:0}
.avw{position:relative;flex-shrink:0}.av{width:56px;height:56px;border-radius:50%;object-fit:cover;object-position:center top;border:2.5px solid var(--gold)}
.dot{position:absolute;bottom:2px;right:2px;width:12px;height:12px;background:var(--gr);border-radius:50%;border:2px solid #111}
.hi{flex:1}.hi h2{font-size:16px;font-weight:700;color:#fff}.on{font-size:12px;color:var(--gr);font-weight:500}.sub{font-size:11px;color:var(--mu);margin-top:2px}
.logo{font-size:7px;letter-spacing:4px;color:var(--gold);text-transform:uppercase;font-weight:900;line-height:2;text-align:right}
.noti{text-align:center;font-size:11px;color:var(--mu);padding:4px 12px;background:#0c0c0c;border-bottom:1px solid var(--bd);flex-shrink:0}
.msgs{flex:1;overflow-y:auto;padding:14px 10px 8px;display:flex;flex-direction:column;gap:10px}
.msgs::-webkit-scrollbar{width:3px}.msgs::-webkit-scrollbar-thumb{background:#222;border-radius:2px}
.row{display:flex;align-items:flex-end;gap:7px}.row.bot{justify-content:flex-start}.row.me{justify-content:flex-end}
.rav{width:30px;height:30px;border-radius:50%;object-fit:cover;object-position:center top;flex-shrink:0;border:1.5px solid var(--gold)}
.col{display:flex;flex-direction:column;max-width:82%}.row.me .col{align-items:flex-end}
.bub{padding:9px 13px;border-radius:18px;font-size:14px;line-height:1.6;white-space:pre-wrap;word-break:break-word}
.bub.bot{background:var(--bot);border-bottom-left-radius:4px;border:1px solid #1a1a35}
.bub.me{background:linear-gradient(135deg,#b8903e,#6b4710);border-bottom-right-radius:4px;color:#fff;font-weight:500}
.ts{font-size:10px;color:var(--mu);margin-top:3px;padding:0 3px}
.mc{background:#0a0a1e;border:1px solid #1a1a35;border-radius:14px;overflow:hidden;max-width:290px;margin-top:5px}
.mca{padding:10px 13px;display:flex;align-items:center;gap:9px;border-bottom:1px solid #1a1a35}
.pb{width:36px;height:36px;border-radius:50%;background:var(--gold);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;-webkit-tap-highlight-color:transparent}
.ai{flex:1}.an{font-size:12px;font-weight:600;color:var(--gold)}.as{font-size:11px;color:var(--mu);margin-top:1px}
.mcv{padding:10px 13px}.mcv a{color:#53bdeb;font-size:12px;text-decoration:none;display:flex;align-items:center;gap:6px;font-weight:500}
.typ{display:inline-flex;align-items:center;gap:5px;padding:13px 17px;background:var(--bot);border-radius:18px;border-bottom-left-radius:4px;border:1px solid #1a1a35}
.td{width:7px;height:7px;background:#333;border-radius:50%;animation:b 1.3s infinite}.td:nth-child(2){animation-delay:.22s}.td:nth-child(3){animation-delay:.44s}
@keyframes b{0%,55%,100%{transform:translateY(0);background:#333}27%{transform:translateY(-7px);background:var(--gold)}}
.cbox{background:#0a1e0a;border:1px solid var(--gr);border-radius:14px;padding:12px 15px;margin-top:8px;font-size:13px;line-height:1.8}
.ct{color:var(--gr);font-weight:700;font-size:14px;margin-bottom:8px}.cr{display:flex;gap:8px;color:#ccc}.cl{color:#888;min-width:80px;flex-shrink:0}
.fb{display:inline-block;margin-top:10px;background:linear-gradient(135deg,#b8903e,#6b4710);color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;text-decoration:none;font-weight:600}
.quick{display:flex;gap:8px;overflow-x:auto;padding:8px 10px;background:#0c0c0c;border-top:1px solid var(--bd);flex-shrink:0;scrollbar-width:none}.quick::-webkit-scrollbar{display:none}
.qb{background:var(--s2);border:1px solid #2a2a2a;color:var(--gold);border-radius:20px;padding:7px 14px;font-size:13px;cursor:pointer;white-space:nowrap;flex-shrink:0;font-family:inherit}
.ia{background:var(--s1);border-top:1px solid var(--bd);padding:10px 12px;display:flex;align-items:flex-end;gap:8px;flex-shrink:0}
#inp{flex:1;background:var(--s2);border:1.5px solid var(--bd);border-radius:22px;padding:10px 15px;font-size:14px;color:var(--tx);outline:none;resize:none;max-height:100px;min-height:44px;font-family:inherit;line-height:1.45}
#inp:focus{border-color:var(--gold)}#inp::placeholder{color:var(--mu)}
#sb{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--g2));border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;-webkit-tap-highlight-color:transparent}
#sb:disabled{opacity:.3;cursor:default}
.fab{position:fixed;bottom:130px;right:12px;background:#229ED9;color:#fff;border-radius:50px;padding:10px 15px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:7px;box-shadow:0 4px 18px rgba(34,158,217,.35);text-decoration:none;z-index:99}
</style>
</head>
<body>
<div class="wrap">
<div class="hdr">
  <div class="avw"><img class="av" src="__FOTO__" alt="Jonathan"><div class="dot"></div></div>
  <div class="hi"><h2>Jonathan</h2><div class="on">online agora</div><div class="sub">Massagista &middot; Savassi &amp; Betim &middot; BH</div></div>
  <div class="logo">LOS<br>HOMBRES</div>
</div>
<div class="noti">Atendimento sigiloso &middot; Suas informações não são compartilhadas</div>
<div class="msgs" id="msgs"></div>
<div class="quick" id="qk">
  <button class="qb" data-q="Quais massagens vocês oferecem?">Massagens</button>
  <button class="qb" data-q="Quero agendar uma sessão">Agendar</button>
  <button class="qb" data-q="Quanto custa?">Preços</button>
  <button class="qb" data-q="Tem massagem para casais?">Casais</button>
  <button class="qb" data-q="Onde fica o estúdio?">Onde fica</button>
  <button class="qb" data-q="Tenho dúvidas">Dúvidas</button>
</div>
<div class="ia">
  <textarea id="inp" rows="1" placeholder="Digite sua mensagem..." maxlength="600"></textarea>
  <button id="sb" disabled><svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>
</div>
</div>
<a class="fab" href="https://t.me/Atendimentoloshombresbot" target="_blank" rel="noopener">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.01 9.47c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.48 14.4l-2.95-.924c-.64-.204-.654-.64.136-.95l11.527-4.444c.537-.194 1.006.131.37.166z"/></svg>
  Telegram
</a>
<script>
var EP='__EP__',FOTO='__FOTO__',FORM='__FORM__';
var el=document.getElementById('msgs'),inp=document.getElementById('inp'),sb=document.getElementById('sb'),qk=document.getElementById('qk');
var busy=false,hist=[];
function h(){var d=new Date();return('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);}
function sc(){el.scrollTop=el.scrollHeight;}
function av(){var i=document.createElement('img');i.className='rav';i.src=FOTO;return i;}
function delay(t){return Math.min(3500,Math.max(1200,(t||'').length*14));}
function botMsg(txt,aud,vid,nm,conf){
  var row=document.createElement('div');row.className='row bot';row.appendChild(av());
  var col=document.createElement('div');col.className='col';
  if(txt){var b=document.createElement('div');b.className='bub bot';b.textContent=txt;col.appendChild(b);}
  var ts=document.createElement('div');ts.className='ts';ts.textContent=h();col.appendChild(ts);
  if(aud||vid){
    var card=document.createElement('div');card.className='mc';
    if(aud){
      var ae=new Audio(aud);var pl=false;
      var mca=document.createElement('div');mca.className='mca';
      var pb=document.createElement('button');pb.className='pb';
      pb.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M8 5v14l11-7z"/></svg>';
      pb.onclick=function(){if(pl){ae.pause();pb.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M8 5v14l11-7z"/></svg>';pl=false;}else{ae.play();pb.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';pl=true;}};
      ae.onended=function(){pb.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M8 5v14l11-7z"/></svg>';pl=false;};
      var ai=document.createElement('div');ai.className='ai';
      var an=document.createElement('div');an.className='an';an.textContent=nm||'Áudio';
      var as=document.createElement('div');as.className='as';as.textContent='Toque para ouvir';
      ai.appendChild(an);ai.appendChild(as);mca.appendChild(pb);mca.appendChild(ai);card.appendChild(mca);
    }
    if(vid){var mv=document.createElement('div');mv.className='mcv';var va=document.createElement('a');va.href=vid;va.target='_blank';va.rel='noopener';va.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="#53bdeb"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg> Ver vídeo';mv.appendChild(va);card.appendChild(mv);}
    col.appendChild(card);
  }
  if(conf){
    var box=document.createElement('div');box.className='cbox';
    var ct=document.createElement('div');ct.className='ct';ct.textContent='Agendamento Confirmado';box.appendChild(ct);
    [['Cliente',conf.nome],['WhatsApp',conf.whatsapp],['Massagem',conf.servico],['Unidade',conf.unidade],['Data',conf.data+' às '+conf.horario],['Valor','R$ '+conf.valor+' (sinal R$30 pago)']].forEach(function(r){
      var rw=document.createElement('div');rw.className='cr';
      var lb=document.createElement('span');lb.className='cl';lb.textContent=r[0]+':';
      var vl=document.createElement('span');vl.textContent=r[1];rw.appendChild(lb);rw.appendChild(vl);box.appendChild(rw);
    });
    var fa=document.createElement('a');fa.href=FORM;fa.target='_blank';fa.rel='noopener';fa.className='fb';fa.textContent='Formulário de Preparação';box.appendChild(fa);col.appendChild(box);
  }
  row.appendChild(col);el.appendChild(row);sc();
}
function meMsg(txt){var row=document.createElement('div');row.className='row me';var col=document.createElement('div');col.className='col';var b=document.createElement('div');b.className='bub me';b.textContent=txt;var ts=document.createElement('div');ts.className='ts';ts.textContent=h();col.appendChild(b);col.appendChild(ts);row.appendChild(col);el.appendChild(row);sc();}
function showTyp(){var row=document.createElement('div');row.className='row bot';row.id='typ';row.appendChild(av());var tb=document.createElement('div');tb.className='typ';for(var i=0;i<3;i++){var d=document.createElement('div');d.className='td';tb.appendChild(d);}row.appendChild(tb);el.appendChild(row);sc();}
function hideTyp(){var e=document.getElementById('typ');if(e)e.remove();}
function enviar(t){
  if(busy)return;t=(t||'').trim();if(!t)return;
  inp.value='';inp.style.height='auto';busy=true;sb.disabled=true;
  meMsg(t);hist.push({role:'user',content:t});showTyp();
  fetch(EP,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mensagem:t,historico:hist.slice(-30)})})
    .then(function(r){return r.json();})
    .then(function(d){
      setTimeout(function(){
        hideTyp();
        botMsg(d.resposta||'Me chama no WhatsApp: (31) 98324-4713',d.audio||null,d.video||null,d.massagem||null,d.confirmacao||null);
        hist.push({role:'assistant',content:d.resposta||''});
        busy=false;sb.disabled=false;inp.focus();
      },delay(d.resposta||''));
    }).catch(function(){hideTyp();botMsg('Probleminha técnico. Me chama: (31) 98324-4713',null,null,null,null);busy=false;sb.disabled=false;});
}
qk.addEventListener('click',function(e){var b=e.target.closest('.qb');if(b&&!busy)enviar(b.dataset.q);});
inp.addEventListener('input',function(){sb.disabled=!this.value.trim();this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px';});
inp.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();enviar(this.value);}});
sb.addEventListener('click',function(){enviar(inp.value);});
setTimeout(function(){
  botMsg('Olá! Bem-vindo ao Estúdio Los Hombres.\\n\\nSou o Jonathan, massagista especializado em atendimento masculino de alto padrão. Atendo na Savassi e em Betim.',null,null,null,null);
  hist.push({role:'assistant',content:'Sou o Jonathan. Savassi e Betim, BH.'});
  setTimeout(function(){botMsg('Pode me perguntar sobre massagens, valores ou agendamento. Quem agenda com 30 dias de antecedência garante 20% de desconto.',null,null,null,null);hist.push({role:'assistant',content:'30 dias de antecedência = 20% desconto.'});},2200);
},600);
</script>
</body>
</html>`;

// ─── HANDLER ──────────────────────────────────────────────────────────────────
Deno.serve(async(req:Request)=>{
  const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
  if(req.method==='OPTIONS')return new Response(null,{headers:cors});

  if(req.method==='GET'){
    const html=HTML_TEMPLATE
      .replace(/__FOTO__/g,FOTO_URL)
      .replace(/__EP__/g,EP)
      .replace(/__FORM__/g,FORM_URL);
    return new Response(html,{headers:{
      ...cors,'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',
      'Content-Security-Policy':"default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; media-src * blob: data:; img-src * data:; connect-src *;"
    }});
  }

  if(req.method!=='POST')return new Response('',{status:405});
  let body:Record<string,unknown>={};
  try{body=await req.json();}catch(_){}
  const mensagem=String(body.mensagem||'').slice(0,800);
  const historico=(Array.isArray(body.historico)?body.historico:[]) as {role:string;content:string}[];
  const clienteIdWeb=String(body.clienteId||'').slice(0,100);
  const fingerprintWeb=String(body.fingerprint||'').slice(0,100);
  const nomeClienteWeb=String(body.nomeCliente||'').slice(0,100);
  const whatsappWeb=String(body.whatsapp||'').slice(0,20);
  if(!mensagem)return new Response(JSON.stringify({resposta:'Me chama no WhatsApp: (31) 98324-4713'}),{headers:{...cors,'Content-Type':'application/json'}});

  const hist=[...historico,{role:'user',content:mensagem}];
  const estado=analisarHistorico(hist);
  let ctx='';
  let confirmacao:Record<string,string>|null=null;

  // Buscar horários se data identificada
  const{dia:dm,mes:mm2,dataISO:di}=extrairData(mensagem);
  const diaF=dm||estado.dia;
  const mesF=mm2||estado.mes;
  const dataF=di||estado.dataISO;

  if(diaF&&mesF){
    try{
      const{livres,ocupados,diaSemana}=await buscarHorariosLivres(req,diaF,mesF,estado.unidade);
      const{valorFinal,dias,comDesconto}=calcularDesconto(dataF,estado.valor);

      // Filtrar livres com hora válida e respeitar 4h de antecedência
      const agora=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Sao_Paulo'}));
      const mesStr2=String(mesF).padStart(2,'0');
      const diaStr2=String(parseInt(diaF)).padStart(2,'0');
      const livresValidos=livres.filter(l=>{
        if(l.hora==='(sem hora)')return false;
        const[hh2,mm2]=(l.hora+':00').split(':').map(Number);
        const dtSlot=new Date(`2026-${mesStr2}-${diaStr2}T${String(hh2).padStart(2,'0')}:${String(mm2).padStart(2,'0')}:00-03:00`);
        return dtSlot.getTime()-agora.getTime()>=4*3600000;
      });

      const horasLivres=livresValidos.map(l=>l.hora);
      const horasOcupadas=ocupados.map(o=>`${o.hora}(${o.quem.slice(0,15)})`);

      ctx=`DATA: ${diaF}/${mesF} (${diaSemana})
HORARIOS LIVRES (USE SOMENTE ESTES): ${horasLivres.length>0?horasLivres.join(', '):'NENHUM — sugira outro dia'}
OCUPADOS: ${horasOcupadas.join(', ')||'nenhum'}
ANTECEDENCIA: ${dias} dias${comDesconto?' — DESCONTO 20% APLICÁVEL':''}
VALOR: R$${valorFinal}
UNIDADE: ${estado.unidade||'aguardar confirmação'}`;
    }catch(e:any){console.error(e.message);}
  }

  // GRAVAR se bot pediu contato e cliente respondeu com whatsapp
  const wppMsg=extrairWhatsApp(mensagem);
  if(estado.botPediuContato&&wppMsg&&estado.massagem&&estado.unidade&&estado.dia&&estado.mes&&estado.horario){
    const semNum=mensagem.replace(/[\d\s\-\(\)\+]/g,' ').replace(/\s+/g,' ').trim();
    const nomeF=semNum.length>3?semNum:(estado.nome||'Cliente');
    const res=await gravarAgendamento(req,{
      nome:nomeF,whatsapp:wppMsg,
      servico:estado.massagem.split(' ').map((w:string)=>w.charAt(0).toUpperCase()+w.slice(1)).join(' '),
      unidade:estado.unidade,dia:estado.dia,mes:estado.mes,horario:estado.horario,valor:estado.valor,
      clienteId:clienteIdWeb,fingerprint:fingerprintWeb
    });
    if(res.ok){
      const ds=String(parseInt(estado.dia)).padStart(2,'0');
      const ms=String(estado.mes).padStart(2,'0');
      confirmacao={nome:nomeF,whatsapp:wppMsg,
        servico:estado.massagem.split(' ').map((w:string)=>w.charAt(0).toUpperCase()+w.slice(1)).join(' '),
        unidade:estado.unidade,data:`${ds}/${ms}`,horario:estado.horario,valor:String(estado.valor)};
      ctx=(ctx?ctx+'\n\n':'')+`AGENDAMENTO GRAVADO COM SUCESSO na planilha e no Calendar. Confirme ao cliente: está tudo registrado, o link do formulário aparece abaixo. Diga que o horário está garantido e que entrará em contato pelo WhatsApp informado.`;
    }else{
      ctx=(ctx?ctx+'\n\n':'')+`ERRO ao gravar agendamento: ${res.erro}. Peça ao cliente para entrar em contato pelo WhatsApp (31) 98324-4713 para finalizar.`;
    }
  }

  // Mídia da massagem atual
  const mAtual=detectarMassagem(mensagem);
  let audio:string|null=null,video:string|null=null,nomeMidia:string|null=null;
  if(mAtual){const md=MIDIAS[mAtual];if(md){audio=md.audio;video=md.video;nomeMidia=mAtual.split(' ').map((w:string)=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');}}

  const resposta=await chamarIA(
    [...historico.map((m:{role:string;content:string})=>({role:m.role,content:m.content})),{role:'user',content:mensagem}],
    ctx||undefined
  );

  return new Response(JSON.stringify({resposta,audio,video,massagem:nomeMidia,confirmacao}),
    {headers:{...cors,'Content-Type':'application/json'}});
});
