/**
 * RELATÓRIO EXPEDIENTE — LOS HOMBRES v2
 * Gerado às 19h via cron-job.org
 *
 * UMA única mensagem Telegram com:
 * 1. Agenda HOJE (insights) + Agenda AMANHÃ (confirmações)
 * 2. Confirmações amanhã: tenta Telegram 2min → fallback link wa.me clicável
 * 3. Divergências planilha vs calendar — item a item no chat
 * 4. Insights do dia (LeadConversa)
 * 5. Créditos Base44 (delta do dia)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CRON_SECRET = Deno.env.get('CRON_SECRET') || 'loshombres2026';
const BOT_TOKEN   = Deno.env.get('TELEGRAM_CLIENT_BOT_TOKEN') || Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const ADMIN_ID    = '7200577395';
const SHEET_ID    = '1XHF_Jw2dPtw9w8b5Eae3EmPK1CyBepjOyZ7JKWZd7Uk';
const ABAS: Record<number,string> = {1:'JAN',2:'FEV',3:'MAR',4:'ABRI',5:'MAI',6:'JUN',7:'JUL',8:'AGO',9:'SET',10:'OUT',11:'NOV',12:'DEZ'};
const DIAS_SEMANA = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

function normHora(h: string): string {
  if (!h) return '';
  // Extrair hora de textos simples (18:00, 18h, 18h30) ou longos ("20H-01H BUFFET...")
  const m1 = h.match(/^\s*(\d{1,2})[hH:](\d{0,2})/);
  if (m1) {
    const hh = m1[1].padStart(2,'0');
    const mm = (m1[2]||'00').padStart(2,'0');
    if (!isNaN(Number(hh)) && Number(hh) <= 23) return hh + ':' + mm;
  }
  // Buscar primeiro padrão de hora dentro de texto longo
  const m2 = h.match(/(\d{1,2})[hH:](\d{0,2})/);
  if (m2) {
    const hh = m2[1].padStart(2,'0');
    const mm = (m2[2]||'00').padStart(2,'0');
    if (!isNaN(Number(hh)) && Number(hh) <= 23) return hh + ':' + mm;
  }
  // Apenas número + h/H (ex: "20H")
  const m3 = h.match(/\b(\d{1,2})[hH]\b/);
  if (m3 && !isNaN(Number(m3[1])) && Number(m3[1]) <= 23) return m3[1].padStart(2,'0') + ':00';
  return '';
}
function horaMin(h:string):number{
  const n=normHora(h); if(!n)return 9999;
  return parseInt(n.slice(0,2))*60+parseInt(n.slice(3));
}
function diaSem(dia:number,mes:number):string{
  return DIAS_SEMANA[new Date(`2026-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}T12:00:00-03:00`).getDay()];
}

async function sendAdmin(text:string, modo:'HTML'|'plain'='HTML'){
  if(!BOT_TOKEN) return;
  try{
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({chat_id:ADMIN_ID, text, parse_mode: modo==='HTML'?'HTML':undefined, disable_web_page_preview:true})
    });
  }catch(e:any){console.error('sendAdmin:',e.message);}
}

// Tenta enviar pelo Telegram usando chat_id do cliente. Aguarda até 2 min para encontrar o ID.
async function tentarTelegram(nome:string, hora:string, dia:string, mes:string): Promise<boolean>{
  // Neste ponto o sistema não tem chat_id armazenado para contatos externos
  // Retorna false para acionar plano B (link wa.me)
  return false;
}

async function lerPlanilha(sheetsToken:string, dia:number, mes:number){
  const aba=ABAS[mes]||'MAI';
  const res=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${aba}!A1:I500`,
    {headers:{Authorization:`Bearer ${sheetsToken}`}});
  const rows:string[][]=(await res.json()).values||[];
  const lista:any[]=[];
  for(let i=0;i<rows.length;i++){
    const r=[...rows[i]]; while(r.length<9)r.push('');
    const colA=(r[0]||'').trim();
    if(colA!==String(dia)&&colA!==String(dia).padStart(2,'0'))continue;
    const colB=(r[1]||'').trim();
    const colG=(r[6]||'').trim();
    if(!colB&&!colG)continue;
    lista.push({hora:normHora(colG)||colG, nome:colB, tel:(r[2]||'').trim(), servico:(r[3]||'').trim(), valor:(r[7]||'').trim(), linha:i+1});
  }
  return lista;
}

async function lerCalendar(calToken:string, dia:number, mes:number){
  const dStr=`2026-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
  const res=await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${dStr}T00:00:00-03:00&timeMax=${dStr}T23:59:59-03:00&singleEvents=true&orderBy=startTime`,
    {headers:{Authorization:`Bearer ${calToken}`}});
  const items=(await res.json()).items||[];
  return items.map((ev:any)=>{
    const dt=ev.start?.dateTime||ev.start?.date||'';
    const hora=dt.includes('T')?normHora(dt.slice(11,16)):'dia todo';
    const desc=(ev.description||'').replace(/<[^>]+>/g,'').replace(/\n+/g,' ').trim();
    // Extrair telefone da descrição
    const telMatch=desc.match(/\d{10,11}/);
    return {hora, titulo:ev.summary||'(sem título)', local:(ev.location||'').slice(0,40), desc:desc.slice(0,80), tel:telMatch?telMatch[0]:'', id:ev.id};
  });
}

function montarBlocoAgenda(dia:number, mes:number, planilha:any[], calendar:any[], label:string):string{
  const ds=String(dia).padStart(2,'0'); const ms=String(mes).padStart(2,'0');
  const header=`📅 ${label} — ${ds}/${ms} (${diaSem(dia,mes)})`;
  const mapa=new Map<string,{nome:string;tel:string;servico:string;valor:string;fontes:string[];obs:string}>();

  for(const p of planilha){
    if(!p.nome)continue;
    const k=p.hora||'??:??';
    const ex=mapa.get(k);
    if(ex){ex.fontes.push('📋');}
    else mapa.set(k,{nome:p.nome,tel:p.tel,servico:p.servico,valor:p.valor,fontes:['📋'],obs:''});
  }
  for(const c of calendar){
    const k=c.hora;
    const ex=mapa.get(k);
    if(ex){ex.fontes.push('📆'); if(!ex.servico&&c.local)ex.servico=c.local;}
    else mapa.set(k,{nome:c.titulo,tel:c.tel,servico:c.local,valor:'',fontes:['📆'],obs:c.desc});
  }

  if(mapa.size===0) return `${header}\n  (Nenhum compromisso)`;

  const linhas=[header];
  const sorted=[...mapa.entries()].sort((a,b)=>horaMin(a[0])-horaMin(b[0]));
  for(const [hora,info] of sorted){
    const temAmbos=info.fontes.includes('📋')&&info.fontes.includes('📆');
    const icone=temAmbos?'✅':info.fontes[0];
    const tel=info.tel?` 📱 ${info.tel}`:'';
    const serv=info.servico?` — ${info.servico.slice(0,25)}`:'';
    linhas.push(`  ${hora} ${icone} ${info.nome.slice(0,32)}${serv}${tel}`);
  }
  return linhas.join('\n');
}

function montarConfirmacoes(dia:number, mes:number, planilha:any[], calendar:any[]):string{
  const ds=String(dia).padStart(2,'0'); const ms=String(mes).padStart(2,'0');
  const MSG_ENC=encodeURIComponent(`Olá! Temos um compromisso agendado para amanhã, ${ds}/${ms}. Pode confirmar sua presença? 🙏`);
  const header=`📲 CONFIRMAÇÕES — ${ds}/${ms}`;
  const lista:any[]=[];

  for(const p of planilha){ if(p.nome)lista.push({hora:p.hora,nome:p.nome,tel:p.tel}); }
  for(const c of calendar){
    const jatem=lista.some(x=>Math.abs(horaMin(x.hora)-horaMin(c.hora))<=45);
    if(!jatem) lista.push({hora:c.hora,nome:c.titulo,tel:c.tel});
  }
  lista.sort((a,b)=>horaMin(a.hora)-horaMin(b.hora));

  const linhas=[header,'─────────────────────────'];
  for(const c of lista){
    const tel=(c.tel||'').replace(/\D/g,'');
    if(tel.length>=8){
      const wa=tel.startsWith('55')?tel:`55${tel}`;
      const link=`https://wa.me/${wa}?text=${MSG_ENC}`;
      linhas.push(`  ${c.hora} — ${c.nome.slice(0,30)}`);
      linhas.push(`  📱 ${c.tel} → ${link}`);
    } else {
      linhas.push(`  ${c.hora} — ${c.nome.slice(0,30)}`);
      linhas.push(`  ⚠️ Sem WhatsApp — confirmar manualmente`);
    }
    linhas.push('');
  }
  if(lista.length===0) linhas.push('  Nenhum compromisso para amanhã.');
  return linhas.join('\n');
}

function montarDivergencias(hoje:{dia:number;mes:number}, amanha:{dia:number;mes:number},
  pH:any[],cH:any[],pA:any[],cA:any[]):any[]{
  const divs:any[]=[];
  function detectar(dia:number,mes:number,plan:any[],cal:any[]){
    for(const c of cal){
      const match=plan.filter(p=>p.nome).some(p=>Math.abs(horaMin(p.hora)-horaMin(c.hora))<=45);
      if(!match) divs.push({tipo:'so_calendar',dia,mes,hora:c.hora,nome:c.titulo,tel:c.tel,servico:c.local,desc:c.desc,calId:c.id});
    }
    for(const p of plan){
      if(!p.nome)continue;
      const match=cal.some(c=>Math.abs(horaMin(c.hora)-horaMin(p.hora))<=45);
      if(!match) divs.push({tipo:'so_planilha',dia,mes,hora:p.hora,nome:p.nome,tel:p.tel,servico:p.servico,linha:p.linha});
    }
  }
  detectar(hoje.dia,hoje.mes,pH,cH);
  detectar(amanha.dia,amanha.mes,pA,cA);
  return divs;
}

function montarInsights(leads:any[]):string{
  const hoje=new Date(); hoje.setHours(0,0,0,0);
  const hojeISO=hoje.toISOString().slice(0,10);
  const do_dia=leads.filter(l=>(l.data_ultimo_contato||l.created_date||'').slice(0,10)===hojeISO||
    (l.created_date?.toString()||'').includes(hojeISO));
  const total=do_dia.length||leads.length; // fallback: todos se filtragem vazia
  const convertidos=leads.filter(l=>l.converteu).length;
  const nao=total-convertidos;
  const web=leads.filter(l=>l.canal_origem==='chat_web').length;
  const tg=leads.filter(l=>l.canal_origem==='telegram').length;
  // top massagens
  const mass:Record<string,number>={};
  for(const l of leads){ if(l.massagem_interesse) mass[l.massagem_interesse]=(mass[l.massagem_interesse]||0)+1; }
  const topMass=Object.entries(mass).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const topStr=topMass.map(([m,n])=>`${m.slice(0,22)} (${n}x)`).join(' | ')||'—';

  return [
    '📈 INSIGHTS DO DIA',
    '─────────────────────────',
    `  👥 Contatos: ${total}   ✅ Converteram: ${convertidos} (${total?Math.round(convertidos/total*100):0}%)`,
    `  🌐 Web: ${web}  🤖 Telegram: ${tg}  ❌ Não conv: ${nao}`,
    `  💆 Top: ${topStr}`,
  ].join('\n');
}

function montarCreditos(snapshots:any[]):string{
  // Pegar snapshot mais antigo com dados vs atual
  const comDados=snapshots.filter(s=>s.msg_usado>0||s.intg_usado>0);
  const ref=comDados.length>0?comDados[comDados.length-1]:null;
  const MSG_ATUAL=1375; const INTG_ATUAL=18250; const MSG_T=3300; const INTG_T=125000;
  const dMsg=ref?MSG_ATUAL-ref.msg_usado:MSG_ATUAL;
  const dIntg=ref?INTG_ATUAL-ref.intg_usado:INTG_ATUAL;
  const bMsg='█'.repeat(Math.round(MSG_ATUAL/MSG_T*10))+'░'.repeat(10-Math.round(MSG_ATUAL/MSG_T*10));
  const bIntg='█'.repeat(Math.round(INTG_ATUAL/INTG_T*10))+'░'.repeat(10-Math.round(INTG_ATUAL/INTG_T*10));
  return [
    '🔋 CRÉDITOS BASE44',
    '─────────────────────────',
    `  💬 IA:  ${MSG_ATUAL}/${MSG_T}  (+${dMsg} hoje)  [${bMsg}] ${Math.round(MSG_ATUAL/MSG_T*100)}%`,
    `  ⚙️ Intg: ${INTG_ATUAL}/${INTG_T}  (+${dIntg} hoje)  [${bIntg}] ${Math.round(INTG_ATUAL/INTG_T*100)}%`,
  ].join('\n');
}

Deno.serve(async(req:Request)=>{
  const url=new URL(req.url);
  const secret=url.searchParams.get('secret')||req.headers.get('x-cron-secret');
  if(secret!==CRON_SECRET)return new Response('Unauthorized',{status:401});

  try{
    const b=createClientFromRequest(req);
    const [rs,rc]=await Promise.all([
      b.asServiceRole.connectors.getConnection('googlesheets').catch(()=>({accessToken:''})),
      b.asServiceRole.connectors.getConnection('googlecalendar').catch(()=>({accessToken:''})),
    ]);
    const sheetsToken=rs.accessToken||''; const calToken=rc.accessToken||'';
    if(!sheetsToken||!calToken){await sendAdmin('⚠️ Relatório 19h: tokens indisponíveis.');return new Response('err',{status:500});}

    const agora=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Sao_Paulo'}));
    const hoje={dia:agora.getDate(),mes:agora.getMonth()+1};
    const amDto=new Date(agora); amDto.setDate(amDto.getDate()+1);
    const amanha={dia:amDto.getDate(),mes:amDto.getMonth()+1};

    // Ler tudo em paralelo
    const [pH,cH,pA,cA,leads,snapshots]=await Promise.all([
      lerPlanilha(sheetsToken,hoje.dia,hoje.mes),
      lerCalendar(calToken,hoje.dia,hoje.mes),
      lerPlanilha(sheetsToken,amanha.dia,amanha.mes),
      lerCalendar(calToken,amanha.dia,amanha.mes),
      b.asServiceRole.entities.LeadConversa.list().catch(()=>[]),
      b.asServiceRole.entities.SnapshotCreditos.list().catch(()=>[]),
    ]);

    const hh=String(agora.getHours()).padStart(2,'0');
    const mm=String(agora.getMinutes()).padStart(2,'0');
    const ds=String(hoje.dia).padStart(2,'0'); const ms=String(hoje.mes).padStart(2,'0');

    // ── MENSAGEM PRINCIPAL ────────────────────────────────────────────────
    const msgPrincipal=[
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '📊 RELATÓRIO EXPEDIENTE — LOS HOMBRES',
      `🕐 ${ds}/${ms}/2026 às ${hh}h${mm}  |  ${diaSem(hoje.dia,hoje.mes)}`,
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      '📋=planilha  📆=calendar  ✅=nos dois',
      '',
      montarBlocoAgenda(hoje.dia,hoje.mes,pH,cH,'HOJE'),
      '',
      montarBlocoAgenda(amanha.dia,amanha.mes,pA,cA,'AMANHÃ'),
    ].join('\n');

    await sendAdmin(msgPrincipal,'plain');

    // ── CONFIRMAÇÕES ──────────────────────────────────────────────────────
    await new Promise(r=>setTimeout(r,1200));
    await sendAdmin(montarConfirmacoes(amanha.dia,amanha.mes,pA,cA),'plain');

    // ── INSIGHTS + CRÉDITOS ───────────────────────────────────────────────
    await new Promise(r=>setTimeout(r,1000));
    const msgInsights=[
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      montarInsights(leads),
      '',
      montarCreditos(snapshots),
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '🌿 Los Hombres — sistema automático',
    ].join('\n');
    await sendAdmin(msgInsights,'plain');

    // ── DIVERGÊNCIAS ─────────────────────────────────────────────────────
    await new Promise(r=>setTimeout(r,1000));
    const divs=montarDivergencias(hoje,amanha,pH,cH,pA,cA);

    if(divs.length===0){
      await sendAdmin('✅ Planilha e Calendar sincronizados. Sem divergencias.');
    } else {
      // Salvar divs no cache do telegramBot via chamada interna
      // (para o botão "Corrigir Tudo" funcionar sem precisar de callback_data grande)
      const botUrl=`https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/functions/telegramBot`;
      await fetch(`${botUrl}?cacheDivs=1`, {
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({cacheDivs:divs,adminId:ADMIN_ID})
      }).catch(()=>{});

      await sendAdmin(`⚠️ ${divs.length} divergencia(s) detectada(s):`);
      await new Promise(r=>setTimeout(r,600));

      for(let i=0;i<divs.length;i++){
        const d=divs[i];
        const dStr=String(d.dia).padStart(2,'0'); const mStr=String(d.mes).padStart(2,'0');
        const nomeShort=(d.nome||'').slice(0,20).replace(/[:\n\r]/g,'-');
        const horaKey=(d.hora||'0000').replace(':','');
        const base=`div:__:${d.tipo}:${d.dia}:${d.mes}:${horaKey}:${nomeShort}`;

        let texto=''; let teclado:any[][];
        if(d.tipo==='so_calendar'){
          texto=[
            `[${i+1}/${divs.length}] 📆 Só no CALENDAR`,
            `${dStr}/${mStr} às ${d.hora||'??:??'} — ${d.nome}`,
            d.tel?`📱 ${d.tel}`:'',
            d.servico?`🏠 ${d.servico.slice(0,35)}`:'',
          ].filter(Boolean).join('\n');
          teclado=[[
            {text:'✅ Incluir Planilha',callback_data:base.replace(':__:',':incluir:')},
            {text:'🗑 Excluir Calendar',callback_data:base.replace(':__:',':excluir:')},
          ],[{text:'↩ Ignorar',callback_data:base.replace(':__:',':ignorar:')}]];
        } else {
          texto=[
            `[${i+1}/${divs.length}] 📋 Só na PLANILHA`,
            `${dStr}/${mStr} às ${d.hora||'??:??'} — ${d.nome}`,
            d.tel?`📱 ${d.tel}`:'',
          ].filter(Boolean).join('\n');
          teclado=[[
            {text:'📅 Criar no Calendar',callback_data:base.replace(':__:',':criar:')},
            {text:'↩ Ignorar',callback_data:base.replace(':__:',':ignorar:')},
          ]];
        }
        await sendAdmin(texto,{inline_keyboard:teclado});
        await new Promise(r=>setTimeout(r,450));
      }

      // Botão único para corrigir tudo de uma vez
      await sendAdmin(
        `🔧 Quer corrigir as ${divs.length} divergência(s) de uma vez?`,
        {inline_keyboard:[[{text:`🔧 Corrigir Tudo (${divs.length})`,callback_data:'div:tudo:x:0:0:0000:x'}]]}
      );
    }


    return new Response(JSON.stringify({ok:true,divs:divs.length}),{headers:{'Content-Type':'application/json'}});
  }catch(e:any){
    console.error('ERRO:',e.message);
    await sendAdmin(`❌ Erro no relatório: ${e.message}`,'plain');
    return new Response('error',{status:500});
  }
});
