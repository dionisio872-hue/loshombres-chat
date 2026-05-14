/**
 * CHAT PAGE — Los Hombres v5
 * Foto grande + botão corrigido + 100% backend
 */

const FOTO = 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/152fa6317_foto_jonathan.png';
const BOT_TELEGRAM = 'https://t.me/Atendimentoloshombresbot';
const CHAT_API = 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/functions/chatApi';

Deno.serve(async (_req) => {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>Los Hombres — Atendimento</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --gold:#c9a84c;--gold2:#8a6320;
      --bg:#0a0a0a;--surface:#141414;--surface2:#1c1c1c;
      --border:#282828;--text:#f0f0f0;--muted:#555;
      --bot:#141428;--tg:#229ED9;
    }
    html,body{height:100%;background:var(--bg);color:var(--text);
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;overflow:hidden}

    .wrap{display:flex;flex-direction:column;height:100vh;max-width:640px;margin:0 auto;position:relative}

    /* ── HEADER ── */
    .hdr{
      background:linear-gradient(180deg,#1a1a1a 0%,#111 100%);
      border-bottom:1px solid var(--border);
      padding:14px 18px;
      display:flex;align-items:center;gap:14px;
      flex-shrink:0;
    }
    .av-wrap{position:relative;flex-shrink:0}
    .av{
      width:56px;height:56px;border-radius:50%;
      object-fit:cover;object-position:center top;
      border:2.5px solid var(--gold);
      box-shadow:0 0 0 4px rgba(201,168,76,.15);
    }
    .dot-on{
      position:absolute;bottom:2px;right:2px;
      width:13px;height:13px;
      background:#4CAF50;border-radius:50%;
      border:2.5px solid var(--surface);
    }
    .hdr-info{flex:1;min-width:0}
    .hdr-info h2{font-size:16px;font-weight:700;letter-spacing:-.2px}
    .hdr-info small{font-size:12px;color:#4CAF50;font-weight:500}
    .hdr-info p{font-size:11px;color:var(--muted);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .logo{
      font-size:9px;letter-spacing:3.5px;
      color:var(--gold);text-transform:uppercase;font-weight:700;
      flex-shrink:0;
    }

    .notice{
      text-align:center;font-size:11px;color:var(--muted);
      padding:5px 16px;background:#0d0d0d;
      border-bottom:1px solid var(--border);flex-shrink:0;
    }

    /* ── MSGS ── */
    .msgs{
      flex:1;overflow-y:auto;
      padding:18px 14px 8px;
      display:flex;flex-direction:column;gap:12px;
      scroll-behavior:smooth;
    }
    .msgs::-webkit-scrollbar{width:3px}
    .msgs::-webkit-scrollbar-thumb{background:#282828;border-radius:2px}

    .row{display:flex;align-items:flex-end;gap:8px}
    .row.bot{justify-content:flex-start}
    .row.me{justify-content:flex-end}

    .row-av{
      width:32px;height:32px;border-radius:50%;
      object-fit:cover;object-position:center top;
      flex-shrink:0;border:1.5px solid var(--gold);
    }

    .col{display:flex;flex-direction:column;max-width:74%}
    .row.me .col{align-items:flex-end}

    .bub{
      padding:11px 15px;border-radius:18px;
      font-size:14px;line-height:1.6;
      white-space:pre-wrap;word-break:break-word;
    }
    .bub.bot{
      background:var(--bot);
      border-bottom-left-radius:4px;
      border:1px solid #22224a;
    }
    .bub.me{
      background:linear-gradient(135deg,var(--gold),var(--gold2));
      border-bottom-right-radius:4px;
      color:#000;font-weight:600;
    }
    .ts{font-size:10px;color:var(--muted);margin-top:4px;padding:0 4px}

    /* ── TYPING ── */
    .typing-bub{
      display:inline-flex;align-items:center;gap:5px;
      padding:13px 17px;
      background:var(--bot);border-radius:18px;
      border-bottom-left-radius:4px;border:1px solid #22224a;
    }
    .td{
      width:7px;height:7px;background:#444;
      border-radius:50%;animation:bounce 1.3s infinite;
    }
    .td:nth-child(2){animation-delay:.22s}
    .td:nth-child(3){animation-delay:.44s}
    @keyframes bounce{
      0%,55%,100%{transform:translateY(0);background:#444}
      27%{transform:translateY(-7px);background:var(--gold)}
    }

    /* ── INPUT ── */
    .inp-area{
      background:var(--surface);border-top:1px solid var(--border);
      padding:12px 14px;
      display:flex;align-items:flex-end;gap:10px;
      flex-shrink:0;
    }
    textarea{
      flex:1;background:var(--surface2);
      border:1.5px solid var(--border);border-radius:24px;
      padding:11px 16px;font-size:14px;color:var(--text);
      outline:none;resize:none;max-height:110px;min-height:44px;
      font-family:inherit;line-height:1.45;
      transition:border-color .2s;
    }
    textarea:focus{border-color:var(--gold)}
    textarea::placeholder{color:var(--muted)}

    /* BOTÃO — sem async/await no onclick, usa event listener puro */
    #sbtn{
      width:44px;height:44px;border-radius:50%;
      background:linear-gradient(135deg,var(--gold),var(--gold2));
      border:none;cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      flex-shrink:0;
      transition:opacity .2s,transform .12s;
      -webkit-tap-highlight-color:transparent;
    }
    #sbtn:hover{opacity:.88}
    #sbtn:active{transform:scale(.9)}
    #sbtn:disabled{opacity:.35;cursor:not-allowed}
    #sbtn svg{pointer-events:none}

    /* ── FAB TELEGRAM ── */
    .fab{
      position:fixed;bottom:88px;right:16px;
      background:var(--tg);color:#fff;
      border-radius:50px;padding:12px 17px;
      font-size:13px;font-weight:600;
      display:flex;align-items:center;gap:8px;
      box-shadow:0 4px 20px rgba(34,158,217,.4);
      text-decoration:none;
      transition:transform .2s,box-shadow .2s;
      z-index:100;
    }
    .fab:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(34,158,217,.5)}
    @media(max-width:420px){
      .fab-txt{display:none}
      .fab{border-radius:50%;padding:13px;bottom:80px}
    }
  </style>
</head>
<body>
<div class="wrap">

  <!-- HEADER -->
  <div class="hdr">
    <div class="av-wrap">
      <img class="av" src="${FOTO}" alt="Jonathan">
      <div class="dot-on"></div>
    </div>
    <div class="hdr-info">
      <h2>Jonathan</h2>
      <small>● online agora</small>
      <p>Massagista · Savassi &amp; Betim · BH</p>
    </div>
    <div class="logo">Los<br>Hombres</div>
  </div>

  <div class="notice">🔒 Atendimento sigiloso · Suas informações não são compartilhadas</div>

  <!-- MENSAGENS -->
  <div class="msgs" id="msgs"></div>

  <!-- INPUT -->
  <div class="inp-area">
    <textarea id="inp" placeholder="Digite sua mensagem..." rows="1" maxlength="600"></textarea>
    <button id="sbtn" title="Enviar">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="#000">
        <path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
      </svg>
    </button>
  </div>
</div>

<!-- FAB TELEGRAM -->
<a class="fab" href="${BOT_TELEGRAM}" target="_blank" rel="noopener">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.01 9.47c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.48 14.4l-2.95-.924c-.64-.204-.654-.64.136-.95l11.527-4.444c.537-.194 1.006.131.37.166z"/>
  </svg>
  <span class="fab-txt">Continuar no Telegram</span>
</a>

<script>
(function(){
  var FOTO_URL = '${FOTO}';
  var API_URL  = '${CHAT_API}';

  var msgsEl = document.getElementById('msgs');
  var inpEl  = document.getElementById('inp');
  var sbtnEl = document.getElementById('sbtn');
  var busy   = false;

  function hora(){
    var d = new Date();
    var h = d.getHours().toString().padStart(2,'0');
    var m = d.getMinutes().toString().padStart(2,'0');
    return h + ':' + m;
  }

  function scrollDown(){
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function criarAvatar(){
    var img = document.createElement('img');
    img.className = 'row-av';
    img.src = FOTO_URL;
    img.alt = 'J';
    return img;
  }

  function addMsg(txt, tipo){
    var row = document.createElement('div');
    row.className = 'row ' + tipo;

    if(tipo === 'bot') row.appendChild(criarAvatar());

    var col = document.createElement('div');
    col.className = 'col';

    var bub = document.createElement('div');
    bub.className = 'bub ' + tipo;
    bub.textContent = txt;

    var ts = document.createElement('div');
    ts.className = 'ts';
    ts.textContent = hora();

    col.appendChild(bub);
    col.appendChild(ts);
    row.appendChild(col);
    msgsEl.appendChild(row);
    scrollDown();
  }

  function showTyping(){
    var row = document.createElement('div');
    row.className = 'row bot';
    row.id = 'typing-row';
    row.appendChild(criarAvatar());
    var tb = document.createElement('div');
    tb.className = 'typing-bub';
    for(var i = 0; i < 3; i++){
      var d = document.createElement('div');
      d.className = 'td';
      tb.appendChild(d);
    }
    row.appendChild(tb);
    msgsEl.appendChild(row);
    scrollDown();
  }

  function hideTyping(){
    var el = document.getElementById('typing-row');
    if(el) el.parentNode.removeChild(el);
  }

  function enviar(){
    if(busy) return;
    var txt = inpEl.value.trim();
    if(!txt) return;

    inpEl.value = '';
    inpEl.style.height = 'auto';
    busy = true;
    sbtnEl.disabled = true;

    addMsg(txt, 'me');
    showTyping();

    var xhr = new XMLHttpRequest();
    xhr.open('POST', API_URL, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function(){
      if(xhr.readyState !== 4) return;
      hideTyping();
      try {
        var data = JSON.parse(xhr.responseText);
        if(data && data.resposta) addMsg(data.resposta, 'bot');
        else addMsg('Pode me chamar no WhatsApp: (31) 98324-4713 😊', 'bot');
      } catch(e){
        addMsg('Tive um probleminha aqui. Chama no WhatsApp: (31) 98324-4713 😊', 'bot');
      }
      busy = false;
      sbtnEl.disabled = false;
      inpEl.focus();
    };
    xhr.onerror = function(){
      hideTyping();
      addMsg('Tive um probleminha aqui. Chama no WhatsApp: (31) 98324-4713 😊', 'bot');
      busy = false;
      sbtnEl.disabled = false;
    };
    xhr.send(JSON.stringify({ mensagem: txt }));
  }

  /* Auto-resize textarea */
  inpEl.addEventListener('input', function(){
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 110) + 'px';
  });

  /* Enter envia, Shift+Enter quebra linha */
  inpEl.addEventListener('keydown', function(e){
    if(e.key === 'Enter' && !e.shiftKey){
      e.preventDefault();
      enviar();
    }
  });

  /* Clique no botão */
  sbtnEl.addEventListener('click', function(e){
    e.preventDefault();
    enviar();
  });

  /* Mensagem inicial */
  addMsg('Olá! Bem-vindo ao Estúdio Los Hombres 😊\n\nSou o Jonathan. Pode me perguntar sobre as massagens, valores ou agendamento. Como posso te ajudar hoje?', 'bot');

})();
</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache',
    },
  });
});
