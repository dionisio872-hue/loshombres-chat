/**
 * RELATÓRIO EXPEDIENTE — LOS HOMBRES v5
 * - lerPlanilha: captura TUDO que tem conteúdo, não filtra por hora ou nome
 * - normHora: extrai hora de textos longos ("20H-01H BUFFET...")
 * - montarBlocoAgenda: exibe hora bruta quando col G tem texto longo
 * - divergências: reporta TUDO da planilha, mesmo sem hora válida, mesmo sem lógica
 * - divergência "so_planilha" sem hora → (SEM HORA NO CALENDAR — verificar)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CRON_SECRET = Deno.env.get('CRON_SECRET') || 'loshombres2026';
const BOT_TOKEN   = Deno.env.get('TELEGRAM_CLIENT_BOT_TOKEN') || '';
const ADMIN_ID    = Deno.env.get('GRUPO_JG_ID') || '-1003866193031';
const SHEET_ID    = '1XHF_Jw2dPtw9w8b5Eae3EmPK1CyBepjOyZ7JKWZd7Uk';
const ABAS:Record<number,string> = {1:'JAN',2:'FEV',3:'MAR',4:'ABRI',5:'MAI',6:'JUN',7:'JUL',8:'AGO',9:'SET',10:'OUT',11:'NOV',12:'DEZ'};
const DIAS_SEMANA = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

// ─── normHora: 3 estratégias — simples, texto longo, só "NNh" ─────────────────
function normHora(h: string): string {
  if (!h) return '';
  const m1 = h.match(/^\s*(\d{1,2})[hH:](\d{0,2})/);
  if (m1) {
    const hh = m1[1].padStart(2,'0'), mm = (m1[2]||'00').padStart(2,'0');
    if (Number(hh) <= 23) return `${hh}:${mm}`;
  }
  const m2 = h.match(/(\d{1,2})[hH:](\d{0,2})/);
  if (m2) {
    const hh = m2[1].padStart(2,'0'), mm = (m2[2]||'00').padStart(2,'0');
    if (Number(hh) <= 23) return `${hh}:${mm}`;
  }
  const m3 = h.match(/\b(\d{1,2})[hH]\b/);
  if (m3 && Number(m3[1]) <= 23) return m3[1].padStart(2,'0') + ':00';
  return '';
}
function horaMin(h:string):number {
  const n=normHora(h); if(!n) return 9999;
  return parseInt(n.slice(0,2))*60 + parseInt(n.slice(3));
}
function diaSem(dia:number,mes:number):string {
  return DIAS_SEMANA[new Date(`2026-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}T12:00:00-03:00`).getDay()];
}

async function sendAdmin(text:string, markup?:object) {
  if (!BOT_TOKEN) return;
  try {
    const payload:any = {chat_id:ADMIN_ID, text, disable_web_page_preview:true};
    if (markup) payload.reply_markup = markup;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
    });
  } catch(e:any) { console.error('sendAdmin:', e.message); }
}

// ─── lerPlanilha: captura TUDO com qualquer conteúdo ─────────────────────────
async function lerPlanilha(sheetsToken:string, dia:number, mes:number) {
  const aba = ABAS[mes]||'MAI';
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${aba}!A1:I500`,
    {headers:{Authorization:`Bearer ${sheetsToken}`}}
  );
  const rows:string[][] = (await res.json()).values || [];
  const lista:any[] = [];

  for (let i=0; i<rows.length; i++) {
    const r = [...rows[i]]; while (r.length<9) r.push('');
    const colA = (r[0]||'').trim();
    if (colA !== String(dia) && colA !== String(dia).padStart(2,'0')) continue;

    const colB = (r[1]||'').trim(); // nome
    const colC = (r[2]||'').trim(); // telefone
    const colD = (r[3]||'').trim(); // serviço
    const colE = (r[4]||'').trim(); // observações
    const colG = (r[6]||'').trim(); // hora (pode ser texto longo)
    const colH = (r[7]||'').trim(); // valor/status

    // Capturar QUALQUER linha com conteúdo — sem filtros
    const temConteudo = colB || colC || colD || colE || colG || colH;
    if (!temConteudo) continue;

    const horaExtraida = normHora(colG);
    // Se col G tem texto longo, exibir resumo curto como label de hora
    const horaLabel = horaExtraida || (colG ? colG.slice(0,12)+'...' : '??:??');

    lista.push({
      hora:         horaLabel,
      horaValida:   !!horaExtraida,
      horaMin:      horaExtraida ? horaMin(horaExtraida) : 9999,
      nome:         colB || '(sem nome)',
      tel:          colC,
      servico:      colD,
      obs:          colE,
      valor:        colH,
      linha:        i+1,
      colGRaw:      colG,
      resumo:       [colB,colC,colD,colE,colH].filter(Boolean).join(' | '),
    });
  }
  return lista;
}

// ─── lerCalendar ──────────────────────────────────────────────────────────────
async function lerCalendar(calToken:string, dia:number, mes:number) {
  const dStr = `2026-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${dStr}T00:00:00-03:00&timeMax=${dStr}T23:59:59-03:00&singleEvents=true&orderBy=startTime`,
    {headers:{Authorization:`Bearer ${calToken}`}}
  );
  const items = (await res.json()).items || [];
  return items.map((ev:any) => {
    const dt = ev.start?.dateTime || ev.start?.date || '';
    const hora = dt.includes('T') ? normHora(dt.slice(11,16)) : 'dia todo';
    const desc = (ev.description||'').replace(/<[^>]+>/g,'').replace(/\n+/g,' ').trim();
    const telMatch = desc.match(/\d{10,11}/);
    return {
      hora, titulo:ev.summary||'(sem título)',
      local:(ev.location||'').slice(0,40),
      desc:desc.slice(0,80),
      tel:telMatch?telMatch[0]:'',
      id:ev.id
    };
  });
}

// ─── montarBlocoAgenda ────────────────────────────────────────────────────────
function montarBlocoAgenda(dia:number, mes:number, planilha:any[], calendar:any[], label:string):string {
  const ds = String(dia).padStart(2,'0'), ms = String(mes).padStart(2,'0');
  const header = `${label} — ${ds}/${ms} (${diaSem(dia,mes)})`;

  // chave: hora parseada (ou texto truncado para linhas sem hora real)
  const mapa = new Map<string,{nome:string;tel:string;servico:string;fontes:Set<string>;obs:string;horaRaw:string;horaMin:number}>();

  for (const p of planilha) {
    const k = p.hora || '??:??';
    const ex = mapa.get(k);
    if (ex) { ex.fontes.add('PL'); }
    else mapa.set(k, {
      nome: p.nome,
      tel: p.tel,
      servico: p.servico || '',
      fontes: new Set(['PL']),
      obs: p.obs || '',
      horaRaw: (!p.horaValida && p.colGRaw) ? p.colGRaw : '',
      horaMin: p.horaMin,
    });
  }
  for (const c of calendar) {
    const k = c.hora;
    const ex = mapa.get(k);
    if (ex) { ex.fontes.add('CAL'); if (!ex.servico && c.local) ex.servico = c.local; }
    else mapa.set(k, {nome:c.titulo, tel:c.tel, servico:c.local, fontes:new Set(['CAL']), obs:c.desc, horaRaw:'', horaMin:horaMin(c.hora)});
  }

  if (mapa.size === 0) return `${header}\n  (Nenhum compromisso)`;

  const linhas = [header];
  [...mapa.entries()]
    .sort((a,b) => (a[1].horaMin||horaMin(a[0])) - (b[1].horaMin||horaMin(b[0])))
    .forEach(([hora,info]) => {
      const ambos = info.fontes.has('PL') && info.fontes.has('CAL');
      const ic = ambos ? '[OK]' : info.fontes.has('PL') ? '[PL]' : '[CAL]';
      const tel = info.tel ? ` | ${info.tel}` : '';
      const serv = info.servico ? ` - ${info.servico.slice(0,25)}` : '';
      const obs = info.obs ? ` (${info.obs.slice(0,25)})` : '';
      // Se col G tinha texto longo, exibir como detalhe
      const detalhe = info.horaRaw ? `\n    > ${info.horaRaw.slice(0,60)}` : '';
      linhas.push(`  ${hora} ${ic} ${info.nome.slice(0,35)}${serv}${obs}${tel}${detalhe}`);
    });
  return linhas.join('\n');
}

// ─── montarConfirmacoes ────────────────────────────────────────────────────────
function montarConfirmacoes(dia:number, mes:number, planilha:any[], calendar:any[]):string {
  const ds = String(dia).padStart(2,'0'), ms = String(mes).padStart(2,'0');
  const MSG = encodeURIComponent(`Olá! Compromisso agendado para amanhã ${ds}/${ms}. Pode confirmar presença? 🙏`);
  const lista:any[] = [];
  for (const p of planilha) { if (p.nome && p.nome!=='(sem nome)') lista.push({hora:p.hora,nome:p.nome,tel:p.tel,horaMin:p.horaMin}); }
  for (const c of calendar) {
    const dup = lista.some(x => Math.abs((x.horaMin||9999)-horaMin(c.hora))<=45);
    if (!dup) lista.push({hora:c.hora,nome:c.titulo,tel:c.tel,horaMin:horaMin(c.hora)});
  }
  lista.sort((a,b)=>(a.horaMin||9999)-(b.horaMin||9999));

  const linhas = [`CONFIRMACOES AMANHA ${ds}/${ms}`, '-'.repeat(26)];
  for (const c of lista) {
    const tel = (c.tel||'').replace(/\D/g,'');
    linhas.push(`${c.hora} - ${c.nome.slice(0,30)}`);
    if (tel.length >= 8) {
      const wa = tel.startsWith('55') ? tel : `55${tel}`;
      linhas.push(`WA: https://api.whatsapp.com/send?phone=${wa}&text=${MSG}`);
    } else {
      linhas.push('Sem numero — confirmar manualmente');
    }
    linhas.push('');
  }
  if (!lista.length) linhas.push('Nenhum compromisso para amanha.');
  return linhas.join('\n');
}

// ─── montarDivergencias ────────────────────────────────────────────────────────
// Captura TUDO da planilha que não tem par no Calendar (sem filtro de horaValida)
function montarDivergencias(
  hoje:{dia:number;mes:number}, amanha:{dia:number;mes:number},
  pH:any[], cH:any[], pA:any[], cA:any[]
):any[] {
  const divs:any[] = [];

  function detectar(dia:number, mes:number, plan:any[], cal:any[]) {
    // Só no Calendar
    for (const c of cal) {
      const match = plan.filter(p=>p.nome&&p.nome!=='(sem nome)')
        .some(p => p.horaValida && Math.abs(p.horaMin - horaMin(c.hora)) <= 45);
      if (!match)
        divs.push({tipo:'so_calendar', dia, mes, hora:c.hora, nome:c.titulo, tel:c.tel, servico:c.local, desc:c.desc});
    }
    // Só na Planilha — TUDO, sem filtro
    for (const p of plan) {
      if (!p.nome || p.nome === '(sem nome)') {
        // Linha sem nome mas com outro conteúdo — reportar como observação
        if (p.resumo) divs.push({tipo:'so_planilha', dia, mes, hora:p.hora, nome:`(L${p.linha}: ${p.resumo.slice(0,40)})`, tel:p.tel, servico:p.servico, obs:p.obs, linha:p.linha, colGRaw:p.colGRaw, semHora:!p.horaValida, semNome:true});
        continue;
      }
      // Com nome: checar se tem par no Calendar
      const calMatch = p.horaValida
        ? cal.some(c => Math.abs(horaMin(c.hora) - p.horaMin) <= 45)
        : false; // sem hora → nunca tem par no Calendar
      if (!calMatch)
        divs.push({tipo:'so_planilha', dia, mes, hora:p.hora, nome:p.nome, tel:p.tel, servico:p.servico, obs:p.obs, linha:p.linha, colGRaw:p.colGRaw, semHora:!p.horaValida});
    }
  }

  detectar(hoje.dia, hoje.mes, pH, cH);
  detectar(amanha.dia, amanha.mes, pA, cA);
  return divs;
}

// ─── montarInsights ───────────────────────────────────────────────────────────
function montarInsights(leads:any[]):string {
  const hoje = new Date().toISOString().slice(0,10);
  const total = leads.length;
  const conv = leads.filter(l=>l.converteu).length;
  const web = leads.filter(l=>l.canal_origem==='chat_web').length;
  const tg = leads.filter(l=>l.canal_origem==='telegram').length;
  const mass:Record<string,number> = {};
  for (const l of leads) if (l.massagem_interesse) mass[l.massagem_interesse]=(mass[l.massagem_interesse]||0)+1;
  const top = Object.entries(mass).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([m,n])=>`${m.slice(0,18)}(${n}x)`).join(' | ')||'-';
  return ['INSIGHTS','─'.repeat(26),
    `Contatos: ${total}  Converteram: ${conv} (${total?Math.round(conv/total*100):0}%)`,
    `Web: ${web}  Telegram: ${tg}  Nao conv: ${total-conv}`,
    `Top: ${top}`,
  ].join('\n');
}

// ─── montarCreditos ───────────────────────────────────────────────────────────
function montarCreditos(snaps:any[]):string {
  const ref = snaps.filter((s:any)=>s.msg_usado>0).sort((a:any,b:any)=>a.created_date>b.created_date?1:-1)[0];
  const MT=3300, IT=125000;
  const mA=ref?.msg_usado||0, iA=ref?.intg_usado||0;
  return ['CREDITOS BASE44','─'.repeat(26),
    `IA:   ${mA}/${MT} (${Math.round(mA/MT*100)}%)`,
    `Intg: ${iA}/${IT} (${Math.round(iA/IT*100)}%)`,
  ].join('\n');
}

// ─── WEBHOOK ──────────────────────────────────────────────────────────────────
Deno.serve(async(req:Request)=>{
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret') || req.headers.get('x-cron-secret');
  if (secret !== CRON_SECRET) return new Response('Unauthorized',{status:401});

  try {
    const b = createClientFromRequest(req);
    const [rs,rc] = await Promise.all([
      b.asServiceRole.connectors.getConnection('googlesheets').catch(()=>({accessToken:''})),
      b.asServiceRole.connectors.getConnection('googlecalendar').catch(()=>({accessToken:''})),
    ]);
    const sheetsToken = rs.accessToken||'', calToken = rc.accessToken||'';
    if (!sheetsToken||!calToken) {
      await sendAdmin('Relatorio cancelado: tokens indisponiveis.');
      return new Response('err',{status:500});
    }

    const agora = new Date(new Date().toLocaleString('en-US',{timeZone:'America/Sao_Paulo'}));
    const hoje  = {dia:agora.getDate(), mes:agora.getMonth()+1};
    const amDto = new Date(agora); amDto.setDate(amDto.getDate()+1);
    const amanha = {dia:amDto.getDate(), mes:amDto.getMonth()+1};

    const [pH,cH,pA,cA,leads,snaps] = await Promise.all([
      lerPlanilha(sheetsToken, hoje.dia, hoje.mes),
      lerCalendar(calToken,    hoje.dia, hoje.mes),
      lerPlanilha(sheetsToken, amanha.dia, amanha.mes),
      lerCalendar(calToken,    amanha.dia, amanha.mes),
      b.asServiceRole.entities.LeadConversa.list().catch(()=>[]),
      b.asServiceRole.entities.SnapshotCreditos.list().catch(()=>[]),
    ]);

    const hh = String(agora.getHours()).padStart(2,'0');
    const mm2 = String(agora.getMinutes()).padStart(2,'0');
    const ds = String(hoje.dia).padStart(2,'0'), ms = String(hoje.mes).padStart(2,'0');

    // ── MSG 1: Agenda + Insights + Créditos ───────────────────────────────
    await sendAdmin([
      '='.repeat(30),
      'RELATORIO — LOS HOMBRES',
      `${ds}/${ms}/2026 ${hh}h${mm2} | ${diaSem(hoje.dia,hoje.mes)}`,
      '[PL]=planilha [CAL]=calendar [OK]=nos dois',
      '='.repeat(30),'',
      montarBlocoAgenda(hoje.dia,hoje.mes,pH,cH,'HOJE'),'',
      montarBlocoAgenda(amanha.dia,amanha.mes,pA,cA,'AMANHA'),'',
      '='.repeat(30),
      montarInsights(leads),'',
      montarCreditos(snaps),
      '='.repeat(30),
    ].join('\n'));

    // ── MSG 2: Confirmações ────────────────────────────────────────────────
    await new Promise(r=>setTimeout(r,1200));
    await sendAdmin(montarConfirmacoes(amanha.dia,amanha.mes,pA,cA));

    // ── MSG 3+: Divergências ──────────────────────────────────────────────
    await new Promise(r=>setTimeout(r,1000));
    const divs = montarDivergencias(hoje,amanha,pH,cH,pA,cA);

    if (divs.length === 0) {
      await sendAdmin('OK: Agenda sincronizada. Sem divergencias.');
    } else {
      const botUrl = 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/functions/telegramBot';
      await fetch(`${botUrl}?cacheDivs=1`,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({cacheDivs:divs, adminId:7200577395})
      }).catch(()=>{});

      await sendAdmin(`DIVERGENCIAS: ${divs.length} encontrada(s)`);
      await new Promise(r=>setTimeout(r,500));

      for (let i=0; i<divs.length; i++) {
        const d = divs[i];
        const dStr = String(d.dia).padStart(2,'0'), mStr = String(d.mes).padStart(2,'0');
        const nomeShort = (d.nome||'').slice(0,20).replace(/[:\n\r]/g,'-');
        const horaKey = (d.hora||'0000').replace(':','').replace('.','-').replace('?','0').slice(0,4);
        const base = `div:__:${d.tipo}:${d.dia}:${d.mes}:${horaKey}:${nomeShort}`;

        let texto = '', teclado:any[][];

        if (d.tipo === 'so_calendar') {
          texto = [
            `[${i+1}/${divs.length}] So no CALENDAR`,
            `${dStr}/${mStr} as ${d.hora} — ${d.nome}`,
            d.tel ? `Tel: ${d.tel}` : '',
          ].filter(Boolean).join('\n');
          teclado = [
            [{text:'✅ Incluir Planilha', callback_data:base.replace(':__:',':incluir:')},{text:'🗑 Excluir Calendar',callback_data:base.replace(':__:',':excluir:')}],
            [{text:'↩ Ignorar',callback_data:base.replace(':__:',':ignorar:')}],
          ];
        } else {
          const linhaInfo = d.linha ? `L${d.linha}` : '';
          const colGExtra = d.colGRaw && d.colGRaw !== d.hora ? `\nCol G: ${d.colGRaw.slice(0,60)}` : '';
          const semHoraAviso = d.semHora ? '\n(SEM HORA — verificar manualmente)' : '';
          const semNomeAviso = d.semNome ? '\n(linha sem nome)' : '';
          texto = [
            `[${i+1}/${divs.length}] So na PLANILHA ${linhaInfo}`,
            `${dStr}/${mStr} as ${d.hora} — ${d.nome}`,
            d.tel ? `Tel: ${d.tel}` : '',
          ].filter(Boolean).join('\n') + colGExtra + semHoraAviso + semNomeAviso;
          teclado = [
            [{text:'📅 Criar no Calendar',callback_data:base.replace(':__:',':criar:')},{text:'↩ Ignorar',callback_data:base.replace(':__:',':ignorar:')}],
          ];
        }

        await sendAdmin(texto, {inline_keyboard:teclado});
        await new Promise(r=>setTimeout(r,450));
      }

      await sendAdmin(
        `Corrigir ${divs.length} divergencia(s) de uma vez?`,
        {inline_keyboard:[[{text:`🔧 Corrigir Tudo (${divs.length})`,callback_data:'div:tudo:x:0:0:0000:x'}]]}
      );
    }

    return new Response(JSON.stringify({ok:true,divs:divs.length}),{headers:{'Content-Type':'application/json'}});
  } catch(e:any) {
    console.error('ERRO:',e.message);
    await sendAdmin(`Erro relatorio: ${e.message}`);
    return new Response('error',{status:500});
  }
});
