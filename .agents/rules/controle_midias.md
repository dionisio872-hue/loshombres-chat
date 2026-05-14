# Regra de Controle de Mídias — Estúdio Los Hombres

## REGRA ABSOLUTA: Nunca reusar mídia já esgotada nos 3 canais

Uma mídia (vídeo, áudio, imagem) pode ser compartilhada em até **3 canais**:
- Instagram (`instagram`)
- Twitter/X (`twitter`)
- Canal Telegram (`telegram_canal`)

Após ser usada nos **3 canais**, ela nunca mais pode ser postada em nenhum lugar.

---

## Fluxo quando Jonathan pedir para postar uma mídia

### 1. Antes de sugerir ou postar qualquer mídia

Consultar a entidade `MidiaPostada` e verificar:

- Se `todos_canais_usados = true` → **bloquear e avisar:**
  > "Essa mídia já foi usada nos 3 canais (Instagram, Twitter e Telegram). Precisa de uma mídia nova ou diferente."

- Se `canais_postados` já inclui o canal solicitado → **bloquear e avisar:**
  > "Essa mídia já foi postada no [canal]. Posso sugerir uma que ainda não foi usada lá?"

- Se a mídia **não está registrada** ou **ainda tem canais disponíveis** → **liberar para postagem**.

### 2. Após confirmar a postagem

Registrar imediatamente na entidade `MidiaPostada`:
- Adicionar o canal ao array `canais_postados`
- Preencher a data do canal correspondente (`data_instagram`, `data_twitter` ou `data_telegram`)
- Se `canais_postados` atingir 3 itens → marcar `todos_canais_usados = true`

### 3. Identificação de mídia

Usar como `midia_id`:
- Para arquivos: nome do arquivo (ex: `nuru_summa.mp4`, `relaxante_sensual.mp3`)
- Para links do Drive: o ID do arquivo no final da URL (ex: `12drdn_6WstMhAuDfkxgdz7mryfNnapBB`)
- Para URLs próprias: o trecho final único da URL

---

## Exemplos de uso

### Cenário 1 — Primeira postagem de uma mídia
Jonathan: "Posta o vídeo da Nuru Summa no Instagram"
→ Verificar: não está em `MidiaPostada` ainda
→ Postar, depois registrar: `midia_id: "12drdn_6WstMhAuDfkxgdz7mryfNnapBB"`, `canais_postados: ["instagram"]`, `data_instagram: "2026-05-14"`

### Cenário 2 — Mesmo vídeo em outro canal
Jonathan: "Compartilha esse vídeo no Twitter também"
→ Verificar: `canais_postados: ["instagram"]` — Twitter ainda disponível
→ Liberar, postar, atualizar: `canais_postados: ["instagram", "twitter"]`, `data_twitter: "2026-05-14"`

### Cenário 3 — Mídia esgotada
Jonathan: "Usa esse vídeo de novo no Instagram"
→ Verificar: `todos_canais_usados: true`
→ Bloquear: "Essa mídia já foi usada nos 3 canais. Quer que eu sugira uma que ainda não foi usada?"

### Cenário 4 — Sugestão proativa
Quando Jonathan pedir conteúdo sem especificar a mídia:
→ Filtrar `MidiaPostada` onde `todos_canais_usados = false` e o canal desejado não está em `canais_postados`
→ Sugerir apenas mídias disponíveis para aquele canal

---

## Canais válidos

| Canal | Identificador no sistema |
|-------|--------------------------|
| Instagram | `instagram` |
| Twitter/X | `twitter` |
| Canal Telegram | `telegram_canal` |

**Não confundir** canal Telegram (público, de conteúdo) com o bot de atendimento (`@Atendimentoloshombresbot`) — o bot usa mídias para atendimento ao cliente e **não é afetado por esta regra**.

---

## Relatório semanal de mídias disponíveis

Quando Jonathan pedir um resumo ou ao início de cada semana, listar:
- Mídias com canais ainda disponíveis (ordenadas por menos usadas primeiro)
- Mídias esgotadas (para referência, não sugerir)

Formato sugerido:
```
📊 MÍDIAS DISPONÍVEIS
✅ [nome] — falta: Instagram, Twitter
✅ [nome] — falta: Twitter
❌ [nome] — ESGOTADA (3/3 canais usados)
```
