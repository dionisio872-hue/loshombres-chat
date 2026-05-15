/**
 * analisarPix v1 — Los Hombres
 * Recebe URL de imagem do comprovante PIX, analisa via OpenAI Vision
 * e salva o link + info na planilha (coluna E = Observações)
 * Não mexe em nenhuma outra função existente.
 */

const OPENAI_KEY  = Deno.env.get('OPENAI_API_KEY') || '';
const SHEET_ID    = '1XHF_Jw2dPtw9w8b5Eae3EmPK1CyBepjOyZ7JKWZd7Uk';
const ABAS: Record<number,string> = {1:'JAN',2:'FEV',3:'MAR',4:'ABRI',5:'MAI',6:'JUN',7:'JUL',8:'AGO',9:'SET',10:'OUT',11:'NOV',12:'DEZ'};

function normHora(h:string):string{
  if(!h)return'';
  const m=h.match(/(\d{1,2})[hH:]?(\d{0,2})/);
  if(m){const hh=m[1].padStart(2,'0'),mm=(m[2]||'00').padStart(2,'0');if(Number(hh)<=23)return`${hh}:${mm}`;}
  return'';
}

async function analisarImagemPix(imageUrl:string):Promise<{valido:boolean;valor:string|null;beneficiario:string|null;data:string|null;motivo:string}>{
  if(!OPENAI_KEY) return{valido:true,valor:null,beneficiario:null,data:null,motivo:'OpenAI não configurado — aprovado manualmente'};
  try{
    const r=await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{Authorization:`Bearer ${OPENAI_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'gpt-4o',
        max_tokens:300,
        messages:[{
          role:'user',
          content:[
            {type:'text',text:`Analise esta imagem e me diga se é um comprovante PIX válido.
Responda SOMENTE em JSON com este formato exato:
{
  "valido": true/false,
  "valor": "R$ XX,00 ou null",
  "beneficiario": "nome do beneficiário ou null",
  "data": "data da transação ou null",
  "motivo": "explicação curta"
}
Se for comprovante PIX válido: valido=true.
Se não for comprovante (selfie, cardápio, print aleatório, etc): valido=false.`},
            {type:'image_url',image_url:{url:imageUrl,detail:'low'}}
          ]
        }]
      })
    });
    const d=await r.json();
    const content=d.choices?.[0]?.message?.content||'{}';
    const clean=content.replace(/```json|```/g,'').trim();
    return JSON.parse(clean);
  }catch(e:any){
    return{valido:false,valor:null,beneficiario:null,data:null,motivo:`Erro análise: ${e.message}`};
  }
}

async function salvarNaPlanilha(sheetsToken:string,dia:number,mes:number,hora:string,imageUrl:string,analise:{valor:string|null;beneficiario:string|null;data:string|null}):Promise<{ok:boolean;linha?:number;erro?:string}>{
  const aba=ABAS[mes]||'MAI';
  const horaAlvo=normHora(hora);
  const lRes=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${aba}!A1:I500`,{headers:{Authorization:`Bearer ${sheetsToken}`}});
  if(!lRes.ok)return{ok:false,erro:'Erro ao ler planilha'};
  const rows:string[][]=(await lRes.json()).values||[];
  let linhaAlvo=-1;
  for(let i=0;i<rows.length;i++){
    const r=[...rows[i]];while(r.length<9)r.push('');
    const colA=(r[0]||'').trim();
    if(colA!==String(dia)&&colA!==String(dia).padStart(2,'0'))continue;
    const hNorm=normHora(r[6]||'');
    if(horaAlvo&&hNorm&&hNorm===horaAlvo){linhaAlvo=i+1;break;}
    // fallback: linha do dia com nome preenchido
    if(!horaAlvo&&r[1].trim()){linhaAlvo=i+1;break;}
  }
  if(linhaAlvo<0)return{ok:false,erro:`Linha não encontrada para dia ${dia} às ${hora||'(qualquer)'}`};

  // Montar texto para coluna E (Observações)
  const obsAtual=rows[linhaAlvo-1]?.[4]||'';
  const pixInfo=`SINAL R$30 PIX PAGO${analise.valor?` — ${analise.valor}`:''}${analise.data?` (${analise.data})`:''}${analise.beneficiario?` — Benef: ${analise.beneficiario}`:''} | Comprovante: ${imageUrl}`;
  const novaObs=obsAtual?`${obsAtual} | ${pixInfo}`:pixInfo;

  // UPDATE coluna E da linha encontrada
  const range=`${aba}!E${linhaAlvo}`;
  const putRes=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`,{
    method:'PUT',
    headers:{Authorization:`Bearer ${sheetsToken}`,'Content-Type':'application/json'},
    body:JSON.stringify({range,values:[[novaObs]]})
  });
  if(!putRes.ok)return{ok:false,erro:`Erro ao gravar: ${(await putRes.text()).slice(0,100)}`};
  return{ok:true,linha:linhaAlvo};
}

Deno.serve(async(req:Request)=>{
  const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'};
  if(req.method==='OPTIONS')return new Response('',{headers:cors});
  if(req.method==='GET')return new Response(JSON.stringify({ok:true,status:'analisarPix v1 ativo'}),{headers:{...cors,'Content-Type':'application/json'}});

  try{
    const body=await req.json();
    const{imageUrl,sheetsToken,dia,mes,hora}=body;
    if(!imageUrl)return new Response(JSON.stringify({erro:'imageUrl obrigatório'}),{status:400,headers:{...cors,'Content-Type':'application/json'}});

    // 1. Analisar imagem via OpenAI Vision
    const analise=await analisarImagemPix(imageUrl);

    // 2. Se válido e tiver token da planilha, salvar
    let planilha:{ok:boolean;linha?:number;erro?:string}={ok:false,erro:'sheetsToken não fornecido'};
    if(analise.valido&&sheetsToken&&dia&&mes){
      planilha=await salvarNaPlanilha(sheetsToken,parseInt(String(dia)),parseInt(String(mes)),hora||'',imageUrl,{valor:analise.valor,beneficiario:analise.beneficiario,data:analise.data});
    }

    return new Response(JSON.stringify({
      ok:analise.valido,
      valido:analise.valido,
      valor:analise.valor,
      beneficiario:analise.beneficiario,
      data_transacao:analise.data,
      motivo:analise.motivo,
      planilha,
      imageUrl,
    }),{headers:{...cors,'Content-Type':'application/json'}});

  }catch(e:any){
    return new Response(JSON.stringify({erro:e.message}),{status:500,headers:{...cors,'Content-Type':'application/json'}});
  }
});
