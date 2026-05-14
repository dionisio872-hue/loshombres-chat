/**
 * chatCliente v11 — Los Hombres
 * GET  → HTML do chat web
 * POST → processar mensagem com IA + fluxo completo de agendamento
 *
 * FLUXO DE AGENDAMENTO:
 * 1. Cliente informa massagem + unidade + data
 * 2. Sistema verifica horários reais (Planilha + Calendar)
 * 3. Cliente escolhe horário → sistema informa valor + pede sinal PIX
 * 4. Cliente diz que pagou → sistema pede NOME + WHATSAPP
 * 5. Cliente informa nome + WhatsApp → sistema GRAVA planilha + Calendar + envia formulário
 * 6. Confirmação final com resumo completo
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
const DURACAO_MIN = 90;

const PRECOS: Record<string,number> = {
  'relaxante sensual':320,'relaxante tradicional':250,'4 maos':650,'miofascial':320,
  'ventosaterapia':250,'tantrica experience':400,'hidrotantra':450,'tantrica mutua':499,
  'hot':200,'quick massage':250,'nuru summa':499,'massagem dos deuses':750,'burn':399,
  'summa experientia':1350,'podoloterapia':449,'blind experience':499,'tie and teaser':450,
  'tantrica casal':640,'nuru casal':650,'relaxante sensual casal':600,
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
function norm(t:string):string{return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();}

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
  if(n.includes('blind')||n.includes('cego'))return 'blind experience';
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

function extrairData(texto:string):{dia:string|null;mes:number|null;dataISO:string|null}{
  const hoje=new Date();
  const n=texto.toLowerCase();
  let dia:string|null=null,mes:number|null=null,dataISO:string|null=null;
  if(n.includes('amanha')||n.includes('amanhã')){
    const a=new Date(hoje);a.setDate(hoje.getDate()+1);
    dia=String(a.getDate());mes=a.getMonth()+1;
    dataISO=`2026-${String(mes).padStart(2,'0')}-${String(a.getDate()).padStart(2,'0')}`;
  } else if(n.includes('hoje')){
    dia=String(hoje.getDate());mes=hoje.getMonth()+1;
    dataISO=`2026-${String(mes).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`;
  } else {
    const m1=texto.match(/(\d{1,2})[\/\-](\d{1,2})/);
    if(m1){dia=m1[1];mes=parseInt(m1[2]);dataISO=`2026-${String(mes).padStart(2,'0')}-${m1[1].padStart(2,'0')}`;}
    else{const m2=texto.match(/dia\s+(\d{1,2})/i);if(m2){dia=m2[1];mes=hoje.getMonth()+1;dataISO=`2026-${String(mes).padStart(2,'0')}-${m2[1].padStart(2,'0')}`;}}
  }
  return{dia,mes,dataISO};
}

function extrairHorario(texto:string):string|null{
  const m=texto.match(/(\d{1,2})[h:\s](\d{0,2})/i);
  if(!m)return null;
  const h=parseInt(m[1]);const min=parseInt(m[2]||'0');
  if(h>=8&&h<=21)return `${h}:${String(min).padStart(2,'0')}`;
  return null;
}

function extrairWhatsApp(texto:string):string|null{
  const m=texto.match(/[\(\s]?(\d{2})[\)\s\-]?\s*(\d{4,5})[\s\-]?(\d{4})/);
  if(m)return `(${m[1]}) ${m[2]}-${m[3]}`;
  const m2=texto.match(/\d[\d\s\-\(\)]{9,14}\d/);
  if(m2)return m2[0].trim();
  return null;
}

function calcularDesconto(dataISO:string|null,valor:number):{comDesconto:boolean;valorFinal:number;dias:number}{
  if(!dataISO)return{comDesconto:false,valorFinal:valor,dias:0};
  const dias=Math.floor((new Date(dataISO).getTime()-Date.now())/(86400000));
  return{comDesconto:dias>=30,valorFinal:dias>=30?Math.round(valor*0.8):valor,dias};
}

// ─── BUSCAR HORÁRIOS LIVRES ─────────────────────────────────────────────────
async function buscarHorariosLivres(req:Request, dia:string, mes:number):{livres:string[];ocupados:Record<string,string>} {
  let sheetsToken='', calToken='';
  try{
    const base44=createClientFromRequest(req);
    const r1=await base44.asServiceRole.connectors.getConnection('googlesheets');
    sheetsToken=r1.accessToken||'';
    const r2=await base44.asServiceRole.connectors.getConnection('googlecalendar');
    calToken=r2.accessToken||'';
  }catch(e:any){console.error('Token error:',e.message);}

  const aba=ABAS[mes]||'MAI';
  const diaInt=parseInt(dia);
  const diaStr=String(diaInt);
  const diaStr2=String(diaInt).padStart(2,'0');
  const ano=2026;
  const ocupados:Record<string,string>={};

  // 1. PLANILHA
  if(sheetsToken){
    try{
      const res=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${aba}!A1:I300`,{headers:{Authorization:`Bearer ${sheetsToken}`}});
      const d=await res.json();
      const rows:string[][]=d.values||[];
      for(const r of rows){
        const rDia=(r[0]||'').trim();
        if(rDia!==diaStr&&rDia!==diaStr2)continue;
        const rNome=(r[1]||'').trim();
        const rHor=(r[6]||'').trim().replace('h',':').replace('H',':');
        if(!rHor)continue;
        if(rNome&&!rNome.toUpperCase().includes('CANCELADO')&&rNome.toUpperCase()!=='FERIADO'&&rNome!==''){
          ocupados[rHor]=rNome;
          const parts=rHor.split(':');const h=parseInt(parts[0]);const m=parseInt(parts[1]||'0');
          const fimMin=h*60+m+DURACAO_MIN;
          for(const hr of HORARIOS_PADRAO){
            const hp=hr.split(':');const hh=parseInt(hp[0]);const mm=parseInt(hp[1]||'0');
            const hrMin=hh*60+mm;
            if(hrMin>h*60+m&&hrMin<fimMin)ocupados[hr]=`bloqueado (sessão ${rHor})`;
          }
        }
      }
    }catch(e:any){console.error('Planilha:',e.message);}
  }

  // 2. CALENDAR
  if(calToken){
    try{
      const ini=new Date(`${ano}-${String(mes).padStart(2,'0')}-${diaStr2}T00:00:00-03:00`).toISOString();
      const fim=new Date(`${ano}-${String(mes).padStart(2,'0')}-${diaStr2}T23:59:00-03:00`).toISOString();
      const res=await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${ini}&timeMax=${fim}&singleEvents=true&orderBy=startTime`,{headers:{Authorization:`Bearer ${calToken}`}});
      const d=await res.json();
      for(const ev of (d.items||[])){
        if(ev.status==='cancelled')continue;
        const evStart=ev.start?.dateTime||ev.start?.date||'';
        if(!evStart)continue;
        const dt=new Date(evStart);
        // Determinar duração pelo tipo de evento
        let durEv=DURACAO_MIN;
        const sumNorm=norm(ev.summary||'');
        if(sumNorm.includes('gravacao')||sumNorm.includes('sg'))durEv=150;
        else if(sumNorm.includes('curso'))durEv=300;
        else if(sumNorm.includes('reuniao'))durEv=30;
        else if(sumNorm.includes('1h')||sumNorm.includes('avulso'))durEv=60;
        const evEnd=ev.end?.dateTime?new Date(ev.end.dateTime):new Date(dt.getTime()+durEv*60000);
        const hEv=dt.getHours();const mEv=dt.getMinutes();
        const fimEv=evEnd.getHours()*60+evEnd.getMinutes();
        for(const hr of HORARIOS_PADRAO){
          const hp=hr.split(':');const hh=parseInt(hp[0]);const mm=parseInt(hp[1]||'0');
          const hrMin=hh*60+mm;
          const inicioEv=hEv*60+mEv;
          if(hrMin+DURACAO_MIN>inicioEv&&hrMin<fimEv)ocupados[hr]=ev.summary||'Ocupado';
        }
      }
    }catch(e:any){console.error('Calendar:',e.message);}
  }

  // 3. Regra 4h mínimas
  const agora=new Date();
  for(const hr of HORARIOS_PADRAO){
    const hp=hr.split(':');const hh=parseInt(hp[0]);const mm=parseInt(hp[1]||'0');
    const dtS=new Date(`${ano}-${String(mes).padStart(2,'0')}-${diaStr2}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00-03:00`);
    if(dtS.getTime()-agora.getTime()<4*60*60*1000)ocupados[hr]='menos de 4h';
  }

  return{livres:HORARIOS_PADRAO.filter(hr=>!ocupados[hr]),ocupados};
}

// ─── GRAVAR AGENDAMENTO COMPLETO ─────────────────────────────────────────────
async function gravarAgendamento(req:Request, params:{
  nome:string; whatsapp:string; servico:string; unidade:string;
  dia:string; mes:number; horario:string; valor:number;
}):Promise<{ok:boolean;erro?:string}>{
  let sheetsToken='', calToken='', gmailToken='';
  try{
    const base44=createClientFromRequest(req);
    const r1=await base44.asServiceRole.connectors.getConnection('googlesheets');
    sheetsToken=r1.accessToken||'';
    const r2=await base44.asServiceRole.connectors.getConnection('googlecalendar');
    calToken=r2.accessToken||'';
    const r3=await base44.asServiceRole.connectors.getConnection('gmail');
    gmailToken=r3.accessToken||'';
  }catch(e:any){console.error('Token error:',e.message);}

  const aba=ABAS[params.mes]||'MAI';
  const diaStr=String(parseInt(params.dia)).padStart(2,'0');
  const mesStr=String(params.mes).padStart(2,'0');
  const ano=2026;
  const sinal=30;
  const restante=params.valor-sinal;
  const [hh,mm]=(params.horario+':00').split(':').map(Number);

  try{
    // 1. GRAVAR NA PLANILHA
    if(sheetsToken){
      const novaLinha=[
        String(parseInt(params.dia)),
        params.nome.toUpperCase(),
        params.whatsapp,
        `${params.servico} - ${params.unidade}`.toUpperCase(),
        '',
        FORM_URL,
        params.horario,
        `Sinal R$${sinal} pago - falta R$${restante}`,
        `R$ ${params.valor}`
      ];
      const appendRes=await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${aba}!A:I:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {method:'POST',headers:{Authorization:`Bearer ${sheetsToken}`,'Content-Type':'application/json'},
         body:JSON.stringify({values:[novaLinha]})}
      );
      if(!appendRes.ok){
        const err=await appendRes.json();
        console.error('Planilha append error:',JSON.stringify(err));
      } else {
        console.log('Planilha: gravado com sucesso');
      }
    }

    // 2. CRIAR EVENTO NO GOOGLE CALENDAR
    if(calToken){
      const enderecoUnidade=params.unidade.toUpperCase().includes('BETIM')
        ?'Rua Pernambuco, 341 - Bairro Nossa Senhora das Gracas, Betim'
        :'Rua Tome de Souza, 503, Sala 208 - Savassi, Belo Horizonte';
      const ini=new Date(`${ano}-${mesStr}-${diaStr}T${String(hh).padStart(2,'0')}:${String(mm||0).padStart(2,'0')}:00-03:00`);
      const fimCal=new Date(ini.getTime()+DURACAO_MIN*60000);
      const calRes=await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events',{
        method:'POST',
        headers:{Authorization:`Bearer ${calToken}`,'Content-Type':'application/json'},
        body:JSON.stringify({
          summary:`${params.nome} - ${params.servico}`,
          location:enderecoUnidade,
          description:`WhatsApp: ${params.whatsapp}\nServico: ${params.servico}\nUnidade: ${params.unidade}\nValor: R$ ${params.valor} (sinal R$${sinal} pago, falta R$${restante})\nFormulario: ${FORM_URL}`,
          start:{dateTime:ini.toISOString(),timeZone:'America/Sao_Paulo'},
          end:{dateTime:fimCal.toISOString(),timeZone:'America/Sao_Paulo'},
        })
      });
      if(!calRes.ok){
        const err=await calRes.json();
        console.error('Calendar error:',JSON.stringify(err));
      } else {
        console.log('Calendar: evento criado');
      }
    }

    // 3. NOTIFICAÇÃO TELEGRAM para Jonathan
    const msgTg=`🔔 *NOVO AGENDAMENTO — Chat Web*\n\n👤 *${params.nome}*\n📱 ${params.whatsapp}\n💆 ${params.servico}\n📍 ${params.unidade}\n📅 ${diaStr}/${mesStr} às ${params.horario}\n💰 R$ ${params.valor} (sinal R$${sinal} pago)\n\n✅ Gravado na planilha e Calendar.`;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({chat_id:ADMIN_ID,text:msgTg,parse_mode:'Markdown'})
    }).catch(()=>{});

    // 4. EMAIL para Jonathan
    if(gmailToken){
      const subj=`Novo agendamento (chat web): ${params.nome} - ${diaStr}/${mesStr} às ${params.horario}`;
      const html=`<div style="font-family:Arial,sans-serif;max-width:600px">
        <div style="background:#1a1a2e;color:#fff;padding:20px;border-radius:8px 8px 0 0"><h2 style="margin:0">Novo Agendamento — Chat Web</h2></div>
        <div style="background:#f9f9f9;padding:20px;border:1px solid #ddd;border-radius:0 0 8px 8px">
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px;font-weight:bold;color:#555;width:35%">Cliente</td><td>${params.nome}</td></tr>
            <tr style="background:#fff"><td style="padding:8px;font-weight:bold;color:#555">WhatsApp</td><td>${params.whatsapp}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;color:#555">Serviço</td><td>${params.servico}</td></tr>
            <tr style="background:#fff"><td style="padding:8px;font-weight:bold;color:#555">Unidade</td><td>${params.unidade}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;color:#555">Data/Hora</td><td>${diaStr}/${mesStr}/${ano} às ${params.horario}</td></tr>
            <tr style="background:#fff"><td style="padding:8px;font-weight:bold;color:#555">Valor Total</td><td>R$ ${params.valor}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;color:#555">Sinal Pago</td><td>R$ ${sinal}</td></tr>
            <tr style="background:#fff"><td style="padding:8px;font-weight:bold;color:#555">Restante</td><td>R$ ${restante}</td></tr>
          </table>
          <div style="margin-top:15px;text-align:center">
            <a href="https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit" style="background:#1a1a2e;color:#fff;padding:10px 20px;border-radius:5px;text-decoration:none;margin-right:8px">Ver Planilha</a>
            <a href="https://calendar.google.com/calendar/r" style="background:#4285f4;color:#fff;padding:10px 20px;border-radius:5px;text-decoration:none">Ver Calendar</a>
          </div>
        </div>
      </div>`;
      const raw=`To: ${DEST_EMAIL}\r\nSubject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subj)))}?=\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${html}`;
      const enc=btoa(unescape(encodeURIComponent(raw))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
      await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{
        method:'POST',headers:{Authorization:`Bearer ${gmailToken}`,'Content-Type':'application/json'},
        body:JSON.stringify({raw:enc})
      }).catch(()=>{});
    }

    // 5. REGISTRAR LEAD
    try{
      const base44=createClientFromRequest(req);
      await base44.asServiceRole.entities.LeadConversa.create({
        nome:params.nome,whatsapp:params.whatsapp,canal_origem:'chat_web',
        etapa_funil:'agendamento',massagem_interesse:params.servico,
        unidade_interesse:params.unidade,data_ultima_mensagem:new Date().toISOString(),
        converteu:true,
        observacoes:`Agendado ${diaStr}/${mesStr} às ${params.horario} - R$ ${params.valor} - Chat Web`
      });
    }catch(_){}

    return{ok:true};
  }catch(e:any){
    console.error('gravarAgendamento error:',e.message);
    return{ok:false,erro:e.message};
  }
}

// ─── SYSTEM PROMPT ──────────────────────────────────────────────────────────
const SYSTEM=`Você é o assistente de atendimento do Jonathan, massagista do Estúdio Los Hombres em BH.

REGRAS ABSOLUTAS:
- NUNCA use travessão (--). Use vírgula ou ponto.
- Responda em português natural, caloroso, sem julgamento.
- Máximo 3 parágrafos curtos por resposta.
- SEMPRE mencione desconto de 20% para 30 dias de antecedência quando falar de preço.

ENDEREÇOS:
- Savassi: Rua Tomé de Souza, 503, Sala 208, BH
- Betim: Rua Pernambuco, 341, Bairro Nossa Sra. das Graças
- WhatsApp: (31) 98324-4713

FLUXO DE AGENDAMENTO — SIGA ESTRITAMENTE ESTA ORDEM:
1. Identificar qual massagem o cliente quer
2. Perguntar qual unidade (Savassi ou Betim)
3. Perguntar a data desejada
4. O sistema vai verificar horários disponíveis e injetar no contexto. Use APENAS os horários do CONTEXTO DE AGENDA. NUNCA invente horários.
5. Cliente escolhe horário → informar o valor (com/sem desconto conforme antecedência) e solicitar sinal de R$30 via PIX CNPJ 17342740000109 (JG Espaço Multserviços)
6. Cliente confirmar pagamento ("paguei", "feito", "ok", "transferi") → pedir NOME COMPLETO e NÚMERO DO WHATSAPP: "Para finalizar o agendamento, preciso do seu nome completo e do seu número de WhatsApp."
7. Sistema vai gravar automaticamente na planilha e no Calendar e enviar o formulário ao cliente. Você deve confirmar isso ao cliente dizendo: "Tudo confirmado! Você vai receber o link do formulário de preparação em instantes."

NUNCA pule a etapa de pedir WhatsApp. É obrigatório.

RESPOSTAS DIRETAS:
- "Onde fica?" = dar os dois endereços
- "Tem sexo?" = não, exceto Summa Experientia (R$1.350, PrEP+preservativo)
- "Quanto custa?" = listar preços, não mandar link externo
- Tatuagem = WhatsApp 31991266270
- Vergonha do corpo = atende todos, sem julgamento`;

// ─── IA ─────────────────────────────────────────────────────────────────────
async function responderIA(msgs:{role:string;content:string}[],extra?:string):Promise<string>{
  const sys=extra?SYSTEM+'\n\nCONTEXTO DE AGENDA:\n'+extra:SYSTEM;
  const res=await fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${OPENAI_KEY}`},
    body:JSON.stringify({model:'gpt-4o-mini',max_tokens:600,temperature:0.5,
      messages:[{role:'system',content:sys},...msgs]})
  });
  const d=await res.json();
  return d.choices?.[0]?.message?.content?.trim()||'Me chama no WhatsApp: (31) 98324-4713';
}

// ─── DETECTAR ESTADO DO FLUXO ────────────────────────────────────────────────
function detectarEstadoFluxo(historico:{role:string;content:string}[]):{
  aguardandoPagamento:boolean;
  aguardandoNomeWhatsApp:boolean;
  massagem:string|null;
  unidade:string|null;
  dia:string|null;
  mes:number|null;
  horario:string|null;
  valor:number;
  dataISO:string|null;
  nome:string|null;
  whatsapp:string|null;
}{
  const textoHist=historico.map(m=>m.content||'').join(' ');
  const textoNorm=norm(textoHist);

  const massagem=detectarMassagem(textoHist);
  const temBetim=textoNorm.includes('betim');
  const temSavassi=textoNorm.includes('savassi');
  const unidade=temBetim?'Betim':temSavassi?'Savassi':null;

  let dia:string|null=null,mes:number|null=null,dataISO:string|null=null,horario:string|null=null;
  for(const m of historico){
    const d=extrairData(m.content||'');
    if(d.dia){dia=d.dia;mes=d.mes;dataISO=d.dataISO;}
    const h=extrairHorario(m.content||'');
    if(h)horario=h;
  }

  const valorBase=massagem?PRECOS[massagem]||300:300;
  const{valorFinal}=calcularDesconto(dataISO,valorBase);

  // Detectar se sistema pediu pagamento e cliente confirmou
  const botPediuPagamento=historico.some(m=>
    m.role==='assistant'&&(
      (m.content||'').toLowerCase().includes('sinal')&&
      (m.content||'').toLowerCase().includes('pix')
    )
  );
  const clienteConfirmouPagamento=historico.some(m=>
    m.role==='user'&&
    /paguei|feito|fiz|transferi|enviado|mandei|ok paid|pago|ta feito|ja fiz|fiz o pix|realizei/.test(norm(m.content||''))
  );
  const aguardandoPagamento=botPediuPagamento&&!clienteConfirmouPagamento;

  // Detectar se sistema pediu nome/whatsapp
  const botPediuNome=historico.some(m=>
    m.role==='assistant'&&
    /nome completo|seu nome|whatsapp|numero de contato|numero do whats/.test(norm(m.content||''))
  );
  const aguardandoNomeWhatsApp=clienteConfirmouPagamento&&botPediuNome;

  // Extrair nome e whatsapp das últimas mensagens do usuário após bot pedir
  let nome:string|null=null,whatsapp:string|null=null;
  if(aguardandoNomeWhatsApp||(!aguardandoNomeWhatsApp&&clienteConfirmouPagamento)){
    for(let i=historico.length-1;i>=0;i--){
      const m=historico[i];
      if(m.role!=='user')continue;
      const wpp=extrairWhatsApp(m.content||'');
      if(wpp&&!whatsapp)whatsapp=wpp;
      // Nome: mensagem que parece nome (2-4 palavras, sem números)
      const txt=(m.content||'').trim();
      if(!nome&&txt.length>3&&txt.length<60&&!/\d{5,}/.test(txt)&&/^[a-záàâãéèêíïóôõöúüçñ ]+$/i.test(txt)&&txt.split(' ').length>=2){
        nome=txt;
      }
    }
  }

  return{aguardandoPagamento,aguardandoNomeWhatsApp,massagem,unidade,dia,mes,horario,valor:valorFinal,dataISO,nome,whatsapp};
}

// ─── HTML ────────────────────────────────────────────────────────────────────
const HTML=`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Los Hombres</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--gold:#c9a84c;--gold2:#7a5418;--bg:#0a0a0a;--surface:#141414;--surf2:#1c1c1c;--border:#252525;--text:#f0f0f0;--muted:#666;--bot:#0d0d20;--green:#22c55e}
html,body{height:100%;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;overflow:hidden}
.wrap{display:flex;flex-direction:column;height:100dvh;max-width:640px;margin:0 auto}
.hdr{background:linear-gradient(180deg,#1c1c1c,#111);border-bottom:1px solid var(--border);padding:10px 16px;display:flex;align-items:center;gap:12px;flex-shrink:0}
.av-w{position:relative;flex-shrink:0}.av{width:56px;height:56px;border-radius:50%;object-fit:cover;object-position:center top;border:2.5px solid var(--gold);box-shadow:0 0 0 4px rgba(201,168,76,.12)}
.dot{position:absolute;bottom:2px;right:2px;width:13px;height:13px;background:var(--green);border-radius:50%;border:2.5px solid #111}
.hdr-i{flex:1}.hdr-i h2{font-size:16px;font-weight:700;color:#fff}
.on{font-size:12px;color:var(--green);font-weight:500;margin-top:1px}.sub{font-size:11px;color:var(--muted);margin-top:2px}
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
.mc-video{padding:10px 13px}.mc-video a{color:#53bdeb;font-size:12px;text-decoration:none;display:flex;align-items:center;gap:6px;font-weight:500}
.tbub{display:inline-flex;align-items:center;gap:5px;padding:13px 17px;background:var(--bot);border-radius:18px;border-bottom-left-radius:4px;border:1px solid #1a1a35}
.td{width:7px;height:7px;background:#333;border-radius:50%;animation:b 1.3s infinite}
.td:nth-child(2){animation-delay:.22s}.td:nth-child(3){animation-delay:.44s}
@keyframes b{0%,55%,100%{transform:translateY(0);background:#333}27%{transform:translateY(-7px);background:var(--gold)}}
.conf-box{background:#0a1e0a;border:1px solid #1a3520;border-radius:14px;padding:12px 15px;margin-top:8px;font-size:13px;line-height:1.7}
.conf-box .cf-title{color:#22c55e;font-weight:700;margin-bottom:6px}
.conf-box .cf-row{display:flex;gap:8px;color:#ccc}
.conf-box .cf-label{color:#888;min-width:80px}
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
  <div class="av-w"><img class="av" src="FOTO_AQUI" alt="Jonathan"><div class="dot"></div></div>
  <div class="hdr-i"><h2>Jonathan</h2><div class="on">online agora</div><div class="sub">Massagista &middot; Savassi &amp; Betim &middot; BH</div></div>
  <div class="logo-txt">LOS<br>HOMBRES</div>
</div>
<div class="notice">Atendimento sigiloso &middot; Suas informações não são compartilhadas</div>
<div class="msgs" id="msgs"></div>
<div class="quick" id="quick">
  <button class="qb" data-q="Quais massagens vocês oferecem?">Massagens</button>
  <button class="qb" data-q="Quero agendar uma sessão">Agendar</button>
  <button class="qb" data-q="Quanto custa cada massagem?">Preços</button>
  <button class="qb" data-q="Tem massagem para casais?">Casais</button>
  <button class="qb" data-q="Onde fica o estúdio?">Onde fica</button>
  <button class="qb" data-q="Tenho dúvidas sobre a massagem">Dúvidas</button>
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
var EP='EP_AQUI';
var FOTO='FOTO_AQUI';
var FORM='FORM_AQUI';
var msgsEl=document.getElementById('msgs');
var inpEl=document.getElementById('inp');
var sbtnEl=document.getElementById('sbtn');
var quickEl=document.getElementById('quick');
var busy=false,hist=[],sessaoId=Math.random().toString(36).slice(2,10);

function hora(){var d=new Date();return('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);}
function scroll(){msgsEl.scrollTop=msgsEl.scrollHeight;}
function mkAv(){var i=document.createElement('img');i.className='rav';i.src=FOTO;i.alt='J';return i;}
function delayHumano(txt){return Math.min(3800,Math.max(1400,(txt||'').length*15));}

function addMsgBot(txt,audio,video,nomeM,confirmacao){
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
      pb.onclick=function(){if(playing){audioEl.pause();pb.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M8 5v14l11-7z"/></svg>';playing=false;}else{audioEl.play();pb.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';playing=true;}};
      audioEl.onended=function(){pb.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M8 5v14l11-7z"/></svg>';playing=false;};
      var ai=document.createElement('div');ai.className='audio-info';
      var an=document.createElement('div');an.className='audio-nome';an.textContent=nomeM||'Áudio da massagem';
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
  if(confirmacao){
    var box=document.createElement('div');box.className='conf-box';
    var title=document.createElement('div');title.className='cf-title';title.textContent='Agendamento Confirmado';
    box.appendChild(title);
    var rows=[
      ['Cliente',confirmacao.nome],
      ['WhatsApp',confirmacao.whatsapp],
      ['Massagem',confirmacao.servico],
      ['Unidade',confirmacao.unidade],
      ['Data/Hora',confirmacao.data+' às '+confirmacao.horario],
      ['Valor','R$ '+confirmacao.valor+' (sinal R$30 pago)'],
    ];
    rows.forEach(function(r){
      var rw=document.createElement('div');rw.className='cf-row';
      var lb=document.createElement('span');lb.className='cf-label';lb.textContent=r[0]+':';
      var vl=document.createElement('span');vl.textContent=r[1];
      rw.appendChild(lb);rw.appendChild(vl);box.appendChild(rw);
    });
    col.appendChild(box);
    // Botão formulário
    var fa=document.createElement('a');fa.href=FORM;fa.target='_blank';fa.rel='noopener';
    fa.style.cssText='display:inline-block;margin-top:8px;background:linear-gradient(135deg,#b8903e,#6b4710);color:#fff;padding:9px 16px;border-radius:20px;font-size:13px;text-decoration:none;font-weight:600';
    fa.textContent='Preencher Formulário de Preparação';
    col.appendChild(fa);
  }
  row.appendChild(col);msgsEl.appendChild(row);scroll();
}
function addMsgMe(txt){
  var row=document.createElement('div');row.className='row me';var col=document.createElement('div');col.className='col';
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

function enviar(txt){
  if(busy)return;var t=(txt||'').trim();if(!t)return;
  inpEl.value='';inpEl.style.height='auto';busy=true;sbtnEl.disabled=true;
  addMsgMe(t);hist.push({role:'user',content:t});
  showTyping();
  fetch(EP,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({mensagem:t,historico:hist.slice(-30),sessaoId:sessaoId})})
    .then(function(r){return r.json();})
    .then(function(d){
      var delay=delayHumano(d.resposta||'');
      setTimeout(function(){
        hideTyping();
        addMsgBot(d.resposta||'Me chama no WhatsApp: (31) 98324-4713',
          d.audio||null,d.video||null,d.massagem||null,d.confirmacao||null);
        hist.push({role:'assistant',content:d.resposta||''});
        busy=false;sbtnEl.disabled=false;inpEl.focus();
      },delay);
    })
    .catch(function(){
      hideTyping();
      addMsgBot('Probleminha técnico. Me chama no WhatsApp: (31) 98324-4713',null,null,null,null);
      busy=false;sbtnEl.disabled=false;
    });
}
quickEl.addEventListener('click',function(e){var b=e.target.closest('.qb');if(b&&!busy)enviar(b.getAttribute('data-q'));});
inpEl.addEventListener('input',function(){sbtnEl.disabled=!this.value.trim();this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px';});
inpEl.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();enviar(this.value);}});
sbtnEl.addEventListener('click',function(){enviar(inpEl.value);});
setTimeout(function(){
  addMsgBot('Olá! Bem-vindo ao Estúdio Los Hombres.\\n\\nSou o Jonathan, massagista especializado em atendimento masculino de alto padrão em BH. Tenho espaços na Savassi e em Betim.',null,null,null,null);
  hist.push({role:'assistant',content:'Olá! Sou o Jonathan. Atendimento masculino de alto padrão, Savassi e Betim.'});
  setTimeout(function(){
    addMsgBot('Pode me perguntar sobre massagens, valores ou agendamento. Agendando com 30 dias de antecedência você garante 20% de desconto.',null,null,null,null);
    hist.push({role:'assistant',content:'Pode perguntar sobre massagens, valores ou agendamento. 30 dias antes = 20% desconto.'});
  },2200);
},600);
</script>
</body>
</html>`;

// ─── HANDLER PRINCIPAL ───────────────────────────────────────────────────────
Deno.serve(async(req:Request)=>{
  const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
  if(req.method==='OPTIONS')return new Response(null,{headers:cors});

  if(req.method==='GET'){
    const h=HTML.replace(/FOTO_AQUI/g,FOTO_URL).replace(/EP_AQUI/g,EP).replace(/FORM_AQUI/g,FORM_URL);
    return new Response(h,{headers:{...cors,'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',
      'Content-Security-Policy':"default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; media-src * blob: data:; img-src * data:; connect-src *;"}});
  }

  if(req.method!=='POST')return new Response('',{status:405});
  let body:Record<string,unknown>={};
  try{body=await req.json();}catch(_){}

  const mensagem=String(body.mensagem||'').slice(0,800);
  const historico=Array.isArray(body.historico)?body.historico:[];
  if(!mensagem)return new Response(JSON.stringify({resposta:'Me chama no WhatsApp: (31) 98324-4713'}),{headers:{...cors,'Content-Type':'application/json'}});

  // Detectar estado do fluxo a partir do histórico
  const estado=detectarEstadoFluxo([...historico,{role:'user',content:mensagem}]);
  let contextoAgenda='';
  let agendadoOk=false;
  let confirmacao:Record<string,string>|null=null;

  // Se temos data no histórico ou na mensagem, buscar horários
  const {dia:diaMsg,mes:mesMsg,dataISO:dataMsg}=extrairData(mensagem);
  const diaFinal=diaMsg||estado.dia;
  const mesFinal=mesMsg||estado.mes;
  const dataISOFinal=dataMsg||estado.dataISO;

  if(diaFinal&&mesFinal){
    try{
      const r=await buscarHorariosLivres(req,diaFinal,mesFinal);
      const desc=calcularDesconto(dataISOFinal,estado.valor);
      contextoAgenda=`DATA: ${diaFinal}/${mesFinal}\nHORARIOS LIVRES (USE SOMENTE ESTES): ${r.livres.length>0?r.livres.join(', '):'NENHUM - sugira outro dia'}\nOCUPADOS: ${Object.entries(r.ocupados).map(([h,n])=>`${h}(${n})`).join(', ')||'nenhum'}\nANTECEDENCIA: ${desc.dias} dias - ${desc.comDesconto?'DESCONTO 20% APLICAVEL':'sem desconto'}\nUNIDADE: ${estado.unidade||'aguardar confirmacao'}`;
    }catch(e:any){console.error('buscarHorarios:',e.message);}
  }

  // GRAVAR AGENDAMENTO: se temos nome + whatsapp + todos os dados
  const whatsappMsg=extrairWhatsApp(mensagem);
  const whatsappFinal=whatsappMsg||estado.whatsapp;

  // Detectar se a mensagem atual é o whatsapp/nome que faltava
  const botPediuNomeWpp=historico.some((m:Record<string,string>)=>
    m.role==='assistant'&&/nome completo|whatsapp|numero de contato|numero do whats/.test(norm(m.content||''))
  );

  if(botPediuNomeWpp&&whatsappFinal&&estado.massagem&&estado.unidade&&estado.dia&&estado.mes&&estado.horario){
    // Tentar extrair nome da mensagem atual
    const nomeMsg=mensagem.replace(/[\d\s\-\(\)\+]/g,'').trim();
    const nomeFinal=nomeMsg.length>3?nomeMsg:(estado.nome||'Cliente');
    
    const grav=await gravarAgendamento(req,{
      nome:nomeFinal,
      whatsapp:whatsappFinal,
      servico:estado.massagem.split(' ').map((w:string)=>w.charAt(0).toUpperCase()+w.slice(1)).join(' '),
      unidade:estado.unidade,
      dia:estado.dia,
      mes:estado.mes,
      horario:estado.horario,
      valor:estado.valor,
    });
    agendadoOk=grav.ok;
    if(agendadoOk){
      confirmacao={
        nome:nomeFinal,
        whatsapp:whatsappFinal,
        servico:estado.massagem.split(' ').map((w:string)=>w.charAt(0).toUpperCase()+w.slice(1)).join(' '),
        unidade:estado.unidade,
        data:`${String(parseInt(estado.dia)).padStart(2,'0')}/${String(estado.mes).padStart(2,'0')}`,
        horario:estado.horario,
        valor:String(estado.valor),
      };
    }
  }

  // Detectar massagem na conversa para enviar mídia
  const massagemKey=detectarMassagem(mensagem)||detectarMassagem(historico.slice(-4).map((m:Record<string,string>)=>m.content||'').join(' '));
  let audio:string|null=null,video:string|null=null,nomeMidia:string|null=null;
  // Só envia mídia se foi mencionada na mensagem ATUAL (não no histórico todo)
  const massagemNaMensagem=detectarMassagem(mensagem);
  if(massagemNaMensagem){
    const m=MIDIAS[massagemNaMensagem];
    if(m){audio=m.audio;video=m.video;nomeMidia=massagemNaMensagem.split(' ').map((w:string)=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');}
  }

  // Contexto extra para a IA sobre o estado atual
  let ctxExtra=contextoAgenda;
  if(agendadoOk&&confirmacao){
    ctxExtra=(ctxExtra?ctxExtra+'\n\n':'')+`AGENDAMENTO GRAVADO COM SUCESSO: ${confirmacao.nome}, ${confirmacao.whatsapp}, ${confirmacao.servico}, ${confirmacao.unidade}, ${confirmacao.data} às ${confirmacao.horario}, R$ ${confirmacao.valor}.\n\nDiga ao cliente: agendamento confirmado, dados gravados na planilha e no Calendar, e que o link do formulário de preparação foi enviado abaixo. Lembre de trazer RG ou CNH e vir de banho tomado.`;
  } else if(botPediuNomeWpp&&!whatsappFinal){
    ctxExtra=(ctxExtra?ctxExtra+'\n\n':'')+`AGUARDANDO: cliente deve informar nome completo e WhatsApp para finalizar o agendamento.`;
  }

  // Gerar resposta da IA
  const msgs=[
    ...historico.map((m:Record<string,string>)=>({role:m.role,content:m.content})),
    {role:'user',content:mensagem}
  ];
  const resposta=await responderIA(msgs,ctxExtra||undefined);

  return new Response(JSON.stringify({
    resposta,audio,video,massagem:nomeMidia,
    agendado:agendadoOk,
    confirmacao:confirmacao
  }),{headers:{...cors,'Content-Type':'application/json'}});
});
