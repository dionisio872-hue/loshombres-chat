/**
 * chatCliente v13 — Los Hombres
 * v13b: linguagem refinada + gpt-4o + temperature 0.85
 * 1. Desconto 20% correto: só se data >= 30 dias a partir de HOJE
 * 2. Horários por unidade/dia da semana:
 *    - Betim: terça a partir das 14h, quinta a partir das 16h (sem outros dias)
 *    - Savassi: quinta 18h a segunda 19h (seg,qui,sex,sab,dom)
 * 3. Gravação efetiva na planilha e Calendar após confirmação de pagamento + dados do cliente
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const BOT_TOKEN  = Deno.env.get('TELEGRAM_CLIENT_BOT_TOKEN') || '';
const ADMIN_ID   = '7200577395';
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
    if(m1){dia=m1[1];mes=parseInt(m1[2]);dataISO=`2026-${String(mes).padStart(2,'0')}-${m1[1].padStart(2,'0')}`;}
    else{const m2=texto.match(/dia\s+(\d{1,2})/i);if(m2){dia=m2[1];mes=agora.getMonth()+1;dataISO=`2026-${String(mes).padStart(2,'0')}-${m2[1].padStart(2,'0')}`;}}
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
async function buscarHorariosLivres(req:Request,dia:string,mes:number,unidade:string|null):Promise<{
  livres:string[];ocupados:Record<string,string>;diaSemana:string;temAtendimento:boolean
}>{
  const DIAS=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const diaInt=parseInt(dia);
  const diaStr=String(diaInt).padStart(2,'0');
  const mesStr=String(mes).padStart(2,'0');
  const dataISO=`2026-${mesStr}-${diaStr}`;
  const dt=new Date(dataISO+'T12:00:00-03:00');
  const dow=dt.getDay();
  const diaSemana=DIAS[dow];

  // Verificar se há atendimento nesse dia/unidade
  const horariosBase=getHorariosBase(unidade,dataISO);
  if(horariosBase.length===0){
    return{livres:[],ocupados:{},diaSemana,temAtendimento:false};
  }

  let sheetsToken='',calToken='';
  try{
    const b=createClientFromRequest(req);
    sheetsToken=(await b.asServiceRole.connectors.getConnection('googlesheets')).accessToken||'';
    calToken=(await b.asServiceRole.connectors.getConnection('googlecalendar')).accessToken||'';
  }catch(e:any){console.error('tokens:',e.message);}

  const aba=ABAS[mes]||'MAI';
  const ocupados:Record<string,string>={};

  // Planilha
  if(sheetsToken){
    try{
      const res=await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${aba}!A1:I300`,
        {headers:{Authorization:`Bearer ${sheetsToken}`}}
      );
      const rows:string[][]=(await res.json()).values||[];
      for(const r of rows){
        const rDia=(r[0]||'').trim();
        if(rDia!==String(diaInt)&&rDia!==diaStr)continue;
        const rNome=(r[1]||'').trim();
        const rHor=(r[6]||'').trim().replace(/h/i,':');
        if(!rHor||!rNome||rNome.toUpperCase().includes('CANCELADO'))continue;
        ocupados[rHor]=rNome;
        const[h,m2]=(rHor+':0').split(':').map(Number);
        const fimMin=h*60+(m2||0)+DUR;
        for(const hr of horariosBase){
          const[hh,mm]=hr.split(':').map(Number);
          const hrMin=hh*60+mm;
          if(hrMin>(h*60+(m2||0))&&hrMin<fimMin)ocupados[hr]=`bloqueado(${rHor})`;
        }
      }
    }catch(e:any){console.error('sheets:',e.message);}
  }

  // Calendar
  if(calToken){
    try{
      const ini=encodeURIComponent(`2026-${mesStr}-${diaStr}T00:00:00-03:00`);
      const fim=encodeURIComponent(`2026-${mesStr}-${diaStr}T23:59:00-03:00`);
      const res=await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${ini}&timeMax=${fim}&singleEvents=true&orderBy=startTime`,
        {headers:{Authorization:`Bearer ${calToken}`}}
      );
      const evs=(await res.json()).items||[];
      for(const ev of evs){
        if(ev.status==='cancelled')continue;
        const s=ev.start?.dateTime||'';if(!s)continue;
        const dt2=new Date(s);
        let durEv=DUR;
        const sn=norm(ev.summary||'');
        if(sn.includes('curso'))durEv=300;
        else if(sn.includes('gravacao'))durEv=150;
        else if(sn.includes('reuniao'))durEv=30;
        const evEnd=ev.end?.dateTime?new Date(ev.end.dateTime):new Date(dt2.getTime()+durEv*60000);
        const inicioEv=dt2.getHours()*60+dt2.getMinutes();
        const fimEv=evEnd.getHours()*60+evEnd.getMinutes();
        for(const hr of horariosBase){
          const[hh,mm]=hr.split(':').map(Number);
          const hrMin=hh*60+mm;
          if(hrMin+DUR>inicioEv&&hrMin<fimEv)ocupados[hr]=ev.summary||'Ocupado';
        }
      }
    }catch(e:any){console.error('calendar:',e.message);}
  }

  // Regra 4h mínimo
  const agora=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Sao_Paulo'}));
  for(const hr of horariosBase){
    const[hh,mm]=hr.split(':').map(Number);
    const dtS=new Date(`2026-${mesStr}-${diaStr}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00-03:00`);
    if(dtS.getTime()-agora.getTime()<4*3600000)ocupados[hr]='menos de 4h';
  }

  return{livres:horariosBase.filter(h=>!ocupados[h]),ocupados,diaSemana,temAtendimento:true};
}

// ─── GRAVAR AGENDAMENTO ──────────────────────────────────────────────────────
async function gravarAgendamento(req:Request,p:{
  nome:string;whatsapp:string;servico:string;unidade:string;
  dia:string;mes:number;horario:string;valor:number;
}):Promise<{ok:boolean;erro?:string}>{
  let sheetsToken='',calToken='',gmailToken='';
  try{
    const b=createClientFromRequest(req);
    sheetsToken=(await b.asServiceRole.connectors.getConnection('googlesheets')).accessToken||'';
    calToken=(await b.asServiceRole.connectors.getConnection('googlecalendar')).accessToken||'';
    gmailToken=(await b.asServiceRole.connectors.getConnection('gmail')).accessToken||'';
  }catch(e:any){console.error('tokens gravar:',e.message);}

  const aba=ABAS[p.mes]||'MAI';
  const dStr=String(parseInt(p.dia)).padStart(2,'0');
  const mStr=String(p.mes).padStart(2,'0');
  const sinal=30,restante=p.valor-sinal;
  const[hh,mm]=(p.horario+':0').split(':').map(Number);

  try{
    // 1. PLANILHA
    if(sheetsToken){
      const linha=[
        String(parseInt(p.dia)),
        p.nome.toUpperCase(),
        p.whatsapp,
        `${p.servico} - ${p.unidade}`.toUpperCase(),
        '',
        FORM_URL,
        p.horario,
        `Sinal R$${sinal} pago - falta R$${restante}`,
        `R$ ${p.valor}`
      ];
      const r=await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${aba}!A:I:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {method:'POST',headers:{Authorization:`Bearer ${sheetsToken}`,'Content-Type':'application/json'},
         body:JSON.stringify({values:[linha]})}
      );
      const rd=await r.json();
      console.log('Planilha gravar status:',r.status, JSON.stringify(rd).slice(0,200));
    }else{
      console.error('ERRO: sem sheetsToken para gravar planilha');
    }

    // 2. CALENDAR
    if(calToken){
      const enderecoUnidade=p.unidade.toLowerCase().includes('betim')
        ?'Rua Pernambuco, 341 - Betim, MG'
        :'Rua Tomé de Souza, 503, Sala 208 - Savassi, BH';
      const ini=new Date(`2026-${mStr}-${dStr}T${String(hh).padStart(2,'0')}:${String(mm||0).padStart(2,'0')}:00-03:00`);
      const fim=new Date(ini.getTime()+DUR*60000);
      const r=await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events',{
        method:'POST',
        headers:{Authorization:`Bearer ${calToken}`,'Content-Type':'application/json'},
        body:JSON.stringify({
          summary:`${p.nome} - ${p.servico}`,
          location:enderecoUnidade,
          description:`WhatsApp: ${p.whatsapp}\nValor: R$ ${p.valor} (sinal R$${sinal} pago, falta R$${restante})\nFormulário: ${FORM_URL}`,
          start:{dateTime:ini.toISOString(),timeZone:'America/Sao_Paulo'},
          end:{dateTime:fim.toISOString(),timeZone:'America/Sao_Paulo'},
        })
      });
      console.log('Calendar gravar status:',r.status);
    }else{
      console.error('ERRO: sem calToken para gravar Calendar');
    }

    // 3. TELEGRAM alerta para Jonathan
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        chat_id:ADMIN_ID,parse_mode:'Markdown',
        text:`🔔 *NOVO AGENDAMENTO — Chat Web*\n\n*${p.nome}*\n📱 ${p.whatsapp}\n💆 ${p.servico}\n📍 ${p.unidade}\n📅 ${dStr}/${mStr} às ${p.horario}\n💰 R$ ${p.valor} (sinal R$${sinal} pago)\n\n✅ Gravado na planilha e Calendar.`
      })
    }).catch(()=>{});

    // 4. EMAIL
    if(gmailToken){
      const subj=`Novo agendamento: ${p.nome} - ${dStr}/${mStr} às ${p.horario}`;
      const html=`<h2 style="color:#1a1a2e">Novo Agendamento — Chat Web</h2>
        <p><b>Cliente:</b> ${p.nome}</p><p><b>WhatsApp:</b> ${p.whatsapp}</p>
        <p><b>Serviço:</b> ${p.servico}</p><p><b>Unidade:</b> ${p.unidade}</p>
        <p><b>Data/Hora:</b> ${dStr}/${mStr}/2026 às ${p.horario}</p>
        <p><b>Valor total:</b> R$ ${p.valor}</p>
        <p><b>Sinal pago:</b> R$ ${sinal} | <b>Restante:</b> R$ ${restante}</p>
        <p><a href="https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit">Ver Planilha</a></p>`;
      const raw=`To: ${DEST_EMAIL}\r\nSubject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subj)))}?=\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${html}`;
      const enc=btoa(unescape(encodeURIComponent(raw))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
      await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{
        method:'POST',headers:{Authorization:`Bearer ${gmailToken}`,'Content-Type':'application/json'},
        body:JSON.stringify({raw:enc})
      }).catch(()=>{});
    }

    // 5. Registrar lead convertido
    try{
      const b=createClientFromRequest(req);
      await b.asServiceRole.entities.LeadConversa.create({
        nome:p.nome,whatsapp:p.whatsapp,canal_origem:'chat_web',
        etapa_funil:'confirmado',massagem_interesse:p.servico,
        unidade_interesse:p.unidade,converteu:true,
        data_ultima_mensagem:new Date().toISOString(),
        observacoes:`Agendado ${dStr}/${mStr} às ${p.horario} — R$ ${p.valor} (sinal R$${sinal} pago)`
      });
    }catch(_){}

    return{ok:true};
  }catch(e:any){
    console.error('gravarAgendamento ERRO:',e.message);
    return{ok:false,erro:e.message};
  }
}

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────
const SYSTEM=`Você é Jonathan, massagista do Estúdio Los Hombres em BH. Fala em primeira pessoa, com voz masculina, calma, elegante e acolhedora.

IDENTIDADE E TOM:
Você é experiente, seguro, presente. Não usa linguagem robótica nem lista de itens. Escreve como alguém que realmente entende do que faz e que recebe cada pessoa com cuidado. Frases naturais, ritmo de conversa real. Sem perguntas desnecessárias, sem formalidade excessiva.
Use linguagem sensorial quando descrever massagens: calor, fluidez, presença, entrega, toque, profundidade. Normalize desejos e remova inseguranças com naturalidade.

REGRAS DE ESCRITA:
- NUNCA use travessão. Vírgula ou dois-pontos quando precisar pausar.
- Máximo 3 parágrafos curtos por mensagem. Sem listas numeradas nas respostas ao cliente.
- Varie o ritmo. Conecte ideias. Não use frases curtas e repetitivas.
- Emojis com moderação: 🌿 🔥 ✨ quando fizerem sentido. Nunca em excesso.

FRASES QUE VOCÊ USA NATURALMENTE:
"Aqui você pode simplesmente existir e receber."
"Não há nada que precise esconder. Este é um espaço seguro."
"Você merece essa entrega."
"Permita-se o luxo de ser tocado com presença e intenção."

QUANDO DESCREVER MASSAGENS:
Fale como alguém que vive aquela experiência. Não liste características. Evoque sensações. Seja específico e evocativo, não genérico.

DESCONTO 20%:
Somente para datas com 30+ dias a partir de hoje. Para datas mais próximas, não há desconto e você não menciona o assunto. Se o cliente perguntar, explique naturalmente que o benefício é para quem planeja com bastante antecedência.

ENDEREÇOS:
Savassi: Rua Tomé de Souza, 503, Sala 208. Betim: Rua Pernambuco, 341, Bairro Nossa Sra. das Graças.

HORÁRIOS:
Betim: Terças a partir das 14h e Quintas a partir das 16h. Outros dias não atendo lá.
Savassi: Quintas, Sextas e Sábados a partir das 18h. Domingos e Segundas a partir das 19h. Outros dias não atendo lá.
Se o dia não tiver horário na unidade escolhida, informe com naturalidade e ofereça os dias disponíveis.

FLUXO DE AGENDAMENTO (siga sem pular etapas, mas com linguagem humana):
1. Entender qual experiência o cliente busca
2. Perguntar a unidade de preferência: Savassi ou Betim
3. Perguntar a data desejada
4. Usar SOMENTE os HORÁRIOS LIVRES do CONTEXTO. Nunca invente horários.
5. Cliente escolhe horário: informar o valor correto (com ou sem desconto, conforme CONTEXTO) e pedir o sinal de R$30 via PIX, CNPJ 17342740000109 (JG Espaço Multserviços).
6. Cliente confirma pagamento: pedir nome completo e número de WhatsApp para finalizar o registro.
7. Quando CONTEXTO indicar AGENDAMENTO GRAVADO: confirme com calma que está tudo registrado. Peça para trazer um documento com foto (RG ou CNH) e vir de banho tomado.`;

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
    const d=extrairData(m.content||'');if(d.dia){dia=d.dia;mes=d.mes;dataISO=d.dataISO;}
    const h=extrairHorario(m.content||'');if(h)horario=h;
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
      const{livres,ocupados,diaSemana,temAtendimento}=await buscarHorariosLivres(req,diaF,mesF,estado.unidade);
      const{valorFinal,dias,comDesconto}=calcularDesconto(dataF,estado.valor);

      if(!temAtendimento){
        const u=estado.unidade||'a unidade';
        ctx=`DATA: ${diaF}/${mesF} (${diaSemana})\nSEM ATENDIMENTO: ${u} não atende na ${diaSemana}.\n`;
        if(estado.unidade?.toLowerCase().includes('betim')){
          ctx+=`Betim atende apenas Terças (a partir das 14h) e Quintas (a partir das 16h). Peça nova data.`;
        }else{
          ctx+=`Savassi atende Quintas, Sextas, Sábados (18h+), Domingos e Segundas (19h+). Peça nova data.`;
        }
      }else{
        ctx=`DATA: ${diaF}/${mesF} (${diaSemana})\nHORARIOS LIVRES (USE SOMENTE ESTES): ${livres.length>0?livres.join(', '):'NENHUM - sugira outro dia disponível'}\nOCUPADOS: ${Object.entries(ocupados).map(([h,n])=>`${h}(${n})`).join(', ')||'nenhum'}\nANTECEDENCIA: ${dias} dias a partir de hoje${comDesconto?' - DESCONTO 20% APLICÁVEL':' - SEM desconto (menos de 30 dias)'}\nVALOR: R$ ${valorFinal}${comDesconto?' (com 20% de desconto)':''}\nUNIDADE: ${estado.unidade||'aguardar'}`;
      }
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
      unidade:estado.unidade,dia:estado.dia,mes:estado.mes,horario:estado.horario,valor:estado.valor
    });
    if(res.ok){
      const ds=String(parseInt(estado.dia)).padStart(2,'0');
      const ms=String(estado.mes).padStart(2,'0');
      confirmacao={nome:nomeF,whatsapp:wppMsg,
        servico:estado.massagem.split(' ').map((w:string)=>w.charAt(0).toUpperCase()+w.slice(1)).join(' '),
        unidade:estado.unidade,data:`${ds}/${ms}`,horario:estado.horario,valor:String(estado.valor)};
      ctx=(ctx?ctx+'\n\n':'')+`AGENDAMENTO GRAVADO COM SUCESSO na planilha e no Calendar. Confirme ao cliente: está tudo registrado, o link do formulário aparece abaixo. Instrua: trazer RG ou CNH, vir de banho tomado.`;
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
