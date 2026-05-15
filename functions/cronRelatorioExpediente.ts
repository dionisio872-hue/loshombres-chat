/**
 * RELATÓRIO EXPEDIENTE — LOS HOMBRES v6
 * Visual reformulado: emojis, seções separadas, ícones por status
 * Link WA: wa.me (abre seletor nativo no Android)
 * Incluir planilha: insere nova linha quando não acha vazia no horário
 * Envio para grupo Gestão JG (-1003866193031)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CRON_SECRET = Deno.env.get('CRON_SECRET') || 'loshombres2026';
const BOT_TOKEN   = Deno.env.get('TELEGRAM_CLIENT_BOT_TOKEN') || '';
const GRUPO_ID    = '-1003866193031'; // Gestão JG
const SHEET_ID    = '1XHF_Jw2dPtw9w8b5Eae3EmPK1CyBepjOyZ7JKWZd7Uk';
const ABAS:Record<number,string> = {1:'JAN',2:'FEV',3:'MAR',4:'ABRI',5:'MAI',6:'JUN',7:'JUL',8:'AGO',9:'SET',10:'OUT',11:'NOV',12:'DEZ'};
const DIAS_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];

function normHora(h:string):string {
  if(!h)return '';
  const m1=h.match(/^\s*(\d{1,2})[hH:](\d{0,2})/);
  if(m1){const hh=m1[1].padStart(2,'0'),mm=(m1[2]||'00').padStart(2,'0');if(Number(hh)<=23)return`${hh}:${mm}`;}
  const m2=h.match(/(\d{1,2})[hH:](\d{0,2})/);
  if(m2){const hh=m2[1].padStart(2,'0'),mm=(m2[2]||'00').padStart(2,'0');if(Number(hh)<=23)return`${hh}:${mm}`;}
  const m3=h.match(/\b(\d{1,2})[hH]\b/);
  if(m3&&Number(m3[1])<=23)return m3[1].padStart(2,'0')+':00';
  return'';
}
function hMin(h:string):number{const n=normHora(h);if(!n)return 9999;return parseInt(n.slice(0,2))*60+parseInt(n.slice(3));}
function diaSem(d:number,m:number):string{return DIAS_PT[new Date(`2026-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}T12:00:00-03:00`).getDay()];}
function pad(n:number):string{return String(n).padStart(2,'0');}

async function send(text:string,markup?:object){
  if(!BOT_TOKEN)return;
  const p:any={chat_id:GRUPO_ID,text,disable_web_page_preview:true};
  if(markup)p.reply_markup=markup;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)}).catch(()=>{});
}

async function lerPlanilha(tok:string,dia:number,mes:number){
  const aba=ABAS[mes]||'MAI';
  const res=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${aba}!A1:I500`,{headers:{Authorization:`Bearer ${tok}`}});
  const rows:string[][]=(await res.json()).values||[];
  const lista:any[]=[];
  for(let i=0;i<rows.length;i++){
    const r=[...rows[i]];while(r.length<9)r.push('');
    const colA=(r[0]||'').trim();
    if(colA!==String(dia)&&colA!==pad(dia))continue;
    const colB=(r[1]||'').trim(),colC=(r[2]||'').trim(),colD=(r[3]||'').trim();
    const colE=(r[4]||'').trim(),colG=(r[6]||'').trim(),colH=(r[7]||'').trim();
    if(!colB&&!colC&&!colD&&!colE&&!colG&&!colH)continue;
    const horaV=normHora(colG);
    lista.push({hora:horaV||(colG?colG.slice(0,10)+'…':'--:--'),horaValida:!!horaV,
      horaMin:horaV?hMin(horaV):9999,nome:colB||'(sem nome)',tel:colC,servico:colD,obs:colE,valor:colH,
      linha:i+1,colGRaw:colG,resumo:[colB,colC,colD,colE].filter(Boolean).join(' | ')});
  }
  return lista;
}

async function lerCalendar(tok:string,dia:number,mes:number){
  const d=`2026-${pad(mes)}-${pad(dia)}`;
  const res=await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${d}T00:00:00-03:00&timeMax=${d}T23:59:59-03:00&singleEvents=true&orderBy=startTime`,{headers:{Authorization:`Bearer ${tok}`}});
  const items=(await res.json()).items||[];
  return items.map((ev:any)=>{
    const dt=ev.start?.dateTime||ev.start?.date||'';
    const hora=dt.includes('T')?normHora(dt.slice(11,16)):'dia todo';
    const desc=(ev.description||'').replace(/<[^>]+>/g,'').replace(/\n+/g,' ').trim();
    const telM=desc.match(/\d{10,11}/);
    return{hora,titulo:ev.summary||'(sem título)',local:(ev.location||'').slice(0,35),desc:desc.slice(0,70),tel:telM?telM[0]:'',id:ev.id};
  });
}

// ── AGENDA VISUAL ──────────────────────────────────────────────────────────────
function blocoAgenda(dia:number,mes:number,plan:any[],cal:any[],label:string):string{
  const ds=pad(dia),ms=pad(mes);
  const mapa=new Map<string,{nome:string;tel:string;serv:string;fontes:Set<string>;obs:string;raw:string;hm:number}>();
  for(const p of plan){
    const k=p.hora;const ex=mapa.get(k);
    if(ex)ex.fontes.add('PL');
    else mapa.set(k,{nome:p.nome,tel:p.tel,serv:p.servico||'',fontes:new Set(['PL']),obs:p.obs||'',raw:(!p.horaValida&&p.colGRaw)?p.colGRaw:'',hm:p.horaMin});
  }
  for(const c of cal){
    const k=c.hora;const ex=mapa.get(k);
    if(ex){ex.fontes.add('CAL');if(!ex.serv&&c.local)ex.serv=c.local;}
    else mapa.set(k,{nome:c.titulo,tel:c.tel,serv:c.local,fontes:new Set(['CAL']),obs:c.desc,raw:'',hm:hMin(c.hora)});
  }
  const emoji=label.startsWith('HOJE')?'📅':'📆';
  const titulo=`${emoji} *${label}* — ${ds}/${ms} (${diaSem(dia,mes)})`;
  if(mapa.size===0)return`${titulo}\n  └ Sem compromissos`;
  const linhas=[titulo,'─'.repeat(28)];
  [...mapa.entries()]
    .sort((a,b)=>(a[1].hm||hMin(a[0]))-(b[1].hm||hMin(b[0])))
    .forEach(([hora,info])=>{
      const ambos=info.fontes.has('PL')&&info.fontes.has('CAL');
      const ic=ambos?'✅':info.fontes.has('PL')?'📋':'🗓';
      const serv=info.serv?`  💆 ${info.serv.slice(0,22)}`:'';
      const tel=info.tel?`  📱 ${info.tel}`:'';
      const warn=info.raw?`\n      ⚠️ ${info.raw.slice(0,50)}`:'';
      linhas.push(`${ic} ${hora}  ${info.nome.slice(0,28)}${serv}${tel}${warn}`);
    });
  return linhas.join('\n');
}

// ── CONFIRMAÇÕES ───────────────────────────────────────────────────────────────
function blocoConfirmacoes(dia:number,mes:number,plan:any[],cal:any[]):string{
  const ds=pad(dia),ms=pad(mes);
  const MSG=encodeURIComponent(`Olá! Você tem um compromisso amanhã ${ds}/${ms}. Pode confirmar sua presença? 🙏`);
  const lista:any[]=[];
  for(const p of plan)if(p.nome&&p.nome!=='(sem nome)')lista.push({hora:p.hora,nome:p.nome,tel:p.tel,hm:p.horaMin});
  for(const c of cal){const dup=lista.some(x=>Math.abs((x.hm||9999)-hMin(c.hora))<=45);if(!dup)lista.push({hora:c.hora,nome:c.titulo,tel:c.tel,hm:hMin(c.hora)});}
  lista.sort((a,b)=>(a.hm||9999)-(b.hm||9999));
  const linhas=[`📲 *CONFIRMAÇÕES AMANHÃ ${ds}/${ms}*`,'─'.repeat(28)];
  for(const c of lista){
    const tel=(c.tel||'').replace(/\D/g,'');
    linhas.push(`🕐 ${c.hora}  ${c.nome.slice(0,28)}`);
    if(tel.length>=8){
      const wa=tel.startsWith('55')?tel:`55${tel}`;
      // wa.me abre seletor nativo (WA normal ou Business)
      linhas.push(`   👉 https://wa.me/${wa}?text=${MSG}`);
    }else{
      linhas.push(`   ⚠️ Sem número — confirmar manualmente`);
    }
  }
  if(!lista.length)linhas.push('  Nenhum compromisso para amanhã.');
  return linhas.join('\n');
}

// ── INSIGHTS ──────────────────────────────────────────────────────────────────
function blocoInsights(leads:any[]):string{
  const total=leads.length,conv=leads.filter(l=>l.converteu).length;
  const web=leads.filter(l=>l.canal_origem==='chat_web').length;
  const tg=leads.filter(l=>l.canal_origem==='telegram').length;
  const mass:Record<string,number>={};
  for(const l of leads)if(l.massagem_interesse)mass[l.massagem_interesse]=(mass[l.massagem_interesse]||0)+1;
  const top=Object.entries(mass).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([m,n])=>`${m.slice(0,16)} (${n}x)`).join('\n   ');
  const pct=total?Math.round(conv/total*100):0;
  return[
    `📊 *INSIGHTS DO DIA*`,'─'.repeat(28),
    `👥 Contatos: ${total}   ✅ Convertidos: ${conv} (${pct}%)`,
    `🌐 Web: ${web}   📱 Telegram: ${tg}   ❌ Não conv: ${total-conv}`,
    top?`\n🏆 Top massagens:\n   ${top}`:'',
  ].filter(Boolean).join('\n');
}

// ── CRÉDITOS ──────────────────────────────────────────────────────────────────
function blocoCreditos(snaps:any[]):string{
  const ref=snaps.filter((s:any)=>s.msg_usado>0).sort((a:any,b:any)=>a.created_date>b.created_date?1:-1)[0];
  const MT=3300,IT=125000,mA=ref?.msg_usado||0,iA=ref?.intg_usado||0;
  const bp=(n:number,t:number)=>{const p=Math.round(n/t*10);return'█'.repeat(p)+'░'.repeat(10-p);};
  return[
    `💳 *CRÉDITOS BASE44*`,'─'.repeat(28),
    `🤖 IA:   ${mA}/${MT} (${Math.round(mA/MT*100)}%)\n   ${bp(mA,MT)}`,
    `⚙️ Intg: ${iA}/${IT} (${Math.round(iA/IT*100)}%)\n   ${bp(iA,IT)}`,
  ].join('\n');
}

// ── DIVERGÊNCIAS ─────────────────────────────────────────────────────────────
function detectarDivs(hoje:{dia:number;mes:number},amanha:{dia:number;mes:number},pH:any[],cH:any[],pA:any[],cA:any[]):any[]{
  const divs:any[]=[];
  function check(dia:number,mes:number,plan:any[],cal:any[]){
    for(const c of cal){
      const ok=plan.filter(p=>p.nome&&p.nome!=='(sem nome)').some(p=>p.horaValida&&Math.abs(p.horaMin-hMin(c.hora))<=45);
      if(!ok)divs.push({tipo:'so_calendar',dia,mes,hora:c.hora,nome:c.titulo,tel:c.tel,servico:c.local,desc:c.desc});
    }
    for(const p of plan){
      if(!p.nome||p.nome==='(sem nome)'){if(p.resumo)divs.push({tipo:'so_planilha',dia,mes,hora:p.hora,nome:`L${p.linha}: ${p.resumo.slice(0,35)}`,tel:p.tel,servico:p.servico,obs:p.obs,linha:p.linha,colGRaw:p.colGRaw,semHora:!p.horaValida,semNome:true});continue;}
      const ok=p.horaValida?cal.some(c=>Math.abs(hMin(c.hora)-p.horaMin)<=45):false;
      if(!ok)divs.push({tipo:'so_planilha',dia,mes,hora:p.hora,nome:p.nome,tel:p.tel,servico:p.servico,obs:p.obs,linha:p.linha,colGRaw:p.colGRaw,semHora:!p.horaValida});
    }
  }
  check(hoje.dia,hoje.mes,pH,cH);
  check(amanha.dia,amanha.mes,pA,cA);
  return divs;
}

Deno.serve(async(req:Request)=>{
  const url=new URL(req.url);
  const secret=url.searchParams.get('secret')||req.headers.get('x-cron-secret');
  if(secret!==CRON_SECRET)return new Response('Unauthorized',{status:401});

  try{
    const b=createClientFromRequest(req);
    const[rs,rc]=await Promise.all([
      b.asServiceRole.connectors.getConnection('googlesheets').catch(()=>({accessToken:''})),
      b.asServiceRole.connectors.getConnection('googlecalendar').catch(()=>({accessToken:''})),
    ]);
    const sT=rs.accessToken||'',cT=rc.accessToken||'';
    if(!sT||!cT){await send('❌ Tokens indisponíveis.');return new Response('err',{status:500});}

    const now=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Sao_Paulo'}));
    const hoje={dia:now.getDate(),mes:now.getMonth()+1};
    const amDto=new Date(now);amDto.setDate(amDto.getDate()+1);
    const amanha={dia:amDto.getDate(),mes:amDto.getMonth()+1};

    const[pH,cH,pA,cA,leads,snaps]=await Promise.all([
      lerPlanilha(sT,hoje.dia,hoje.mes),lerCalendar(cT,hoje.dia,hoje.mes),
      lerPlanilha(sT,amanha.dia,amanha.mes),lerCalendar(cT,amanha.dia,amanha.mes),
      b.asServiceRole.entities.LeadConversa.list().catch(()=>[]),
      b.asServiceRole.entities.SnapshotCreditos.list().catch(()=>[]),
    ]);

    const hh=pad(now.getHours()),mm=pad(now.getMinutes());
    const ds=pad(hoje.dia),ms=pad(hoje.mes);

    // ── CABEÇALHO ─────────────────────────────────────────────────────────
    await send([
      `🏠 *RELATÓRIO — LOS HOMBRES*`,
      `🕐 ${ds}/${ms}/2026 às ${hh}h${mm}  |  ${diaSem(hoje.dia,hoje.mes)}`,
      `✅=ambos  📋=só planilha  🗓=só calendar`,
    ].join('\n'));
    await new Promise(r=>setTimeout(r,600));

    // ── AGENDA HOJE ───────────────────────────────────────────────────────
    await send(blocoAgenda(hoje.dia,hoje.mes,pH,cH,'HOJE'));
    await new Promise(r=>setTimeout(r,600));

    // ── AGENDA AMANHÃ ─────────────────────────────────────────────────────
    await send(blocoAgenda(amanha.dia,amanha.mes,pA,cA,'AMANHÃ'));
    await new Promise(r=>setTimeout(r,600));

    // ── CONFIRMAÇÕES ──────────────────────────────────────────────────────
    await send(blocoConfirmacoes(amanha.dia,amanha.mes,pA,cA));
    await new Promise(r=>setTimeout(r,600));

    // ── INSIGHTS + CRÉDITOS ───────────────────────────────────────────────
    await send(blocoInsights(leads)+'\n\n'+blocoCreditos(snaps));
    await new Promise(r=>setTimeout(r,800));

    // ── DIVERGÊNCIAS ──────────────────────────────────────────────────────
    const divs=detectarDivs(hoje,amanha,pH,cH,pA,cA);
    if(divs.length===0){
      await send('✅ *Agenda sincronizada.* Sem divergências entre Calendar e Planilha.');
    }else{
      // Salvar cache no telegramBot para o botão Corrigir Tudo
      await fetch('https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/functions/telegramBot?cacheDivs=1',
        {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cacheDivs:divs,adminId:GRUPO_ID})}).catch(()=>{});

      await send(`⚠️ *DIVERGÊNCIAS:* ${divs.length} item(s)`);
      await new Promise(r=>setTimeout(r,400));

      for(let i=0;i<divs.length;i++){
        const d=divs[i];
        const dStr=pad(d.dia),mStr=pad(d.mes);
        const nomeShort=(d.nome||'').slice(0,20).replace(/[:\n\r]/g,'-');
        const horaKey=(d.hora||'0000').replace(':','').replace(/\D/g,'0').slice(0,4);
        const base=`div:__:${d.tipo}:${d.dia}:${d.mes}:${horaKey}:${nomeShort}`;
        let texto='',teclado:any[][];

        if(d.tipo==='so_calendar'){
          texto=[
            `🗓 [${i+1}/${divs.length}] *Só no Calendar*`,
            `📅 ${dStr}/${mStr}  🕐 ${d.hora}`,
            `👤 ${d.nome}`,
            d.servico?`💆 ${d.servico}`:'',
            d.tel?`📱 ${d.tel}`:'',
          ].filter(Boolean).join('\n');
          teclado=[[{text:'✅ Incluir Planilha',callback_data:base.replace(':__:',':incluir:')},{text:'🗑 Excluir Calendar',callback_data:base.replace(':__:',':excluir:')}],[{text:'↩ Ignorar',callback_data:base.replace(':__:',':ignorar:')}]];
        }else{
          const aviso=d.semHora?'\n⚠️ Sem hora definida':d.semNome?'\n⚠️ Linha sem nome':'';
          texto=[
            `📋 [${i+1}/${divs.length}] *Só na Planilha* L${d.linha||'?'}`,
            `📅 ${dStr}/${mStr}  🕐 ${d.hora}`,
            `👤 ${d.nome}`,
            d.servico?`💆 ${d.servico}`:'',
            d.tel?`📱 ${d.tel}`:'',
          ].filter(Boolean).join('\n')+aviso;
          teclado=[[{text:'📅 Criar no Calendar',callback_data:base.replace(':__:',':criar:')},{text:'↩ Ignorar',callback_data:base.replace(':__:',':ignorar:')}]];
        }
        await send(texto,{inline_keyboard:teclado});
        await new Promise(r=>setTimeout(r,400));
      }
      await send(`🔧 Resolver tudo de uma vez?`,{inline_keyboard:[[{text:`🔧 Corrigir Tudo (${divs.length})`,callback_data:'div:tudo:x:0:0:0000:x'}]]});
    }

    return new Response(JSON.stringify({ok:true,divs:divs.length}),{headers:{'Content-Type':'application/json'}});
  }catch(e:any){
    console.error('ERRO:',e.message);
    await send(`❌ Erro no relatório: ${e.message}`);
    return new Response('error',{status:500});
  }
});
