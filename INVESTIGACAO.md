# Huntera Direct Client

Projeto local para investigar e reproduzir, sem renderização contínua do jogo, as operações necessárias à aba **Caçadas** do Huntera.

## Estado atual

O fluxo HTTP foi reproduzido com sucesso usando a conta de teste:

1. `POST /api/auth/login`
2. `GET /api/auth/me`
3. `GET /api/characters`
4. `POST /api/game-tickets`
5. conexão WebSocket com a URL retornada pelo ticket

O personagem observado durante a investigação foi `Gatonet`, nível 57, vocação `knight`. Esses dados são apenas o resultado da conta usada no diagnóstico e não estão gravados no código.

## Segurança

- Credenciais ficam somente no `.env` local.
- `.env` está no `.gitignore`.
- `.env.example` contém somente chaves vazias.
- O diagnóstico não imprime senha, cookie, ticket ou header de autenticação.
- Não foram executadas compras, pagamentos, exclusões ou operações financeiras.

## Endpoints HTTP confirmados

### Login

`POST https://www.huntera.com.br/api/auth/login`

Payload observado:

```json
{
  "email": "<credencial>",
  "password": "<credencial>"
}
```

O frontend oficial usa `credentials: "include"`. A resposta observada contém `account`; a sessão é mantida por cookie retornado pelo servidor.

### Sessão atual

`GET /api/auth/me`

Usado pelo frontend para confirmar a sessão autenticada.

### Personagens

`GET /api/characters`

Resposta observada com as chaves `characters` e `nameChangeCredits`. Cada personagem contém, entre outros campos, `id`, `accountId`, `name`, `level`, `outfitId`, `outfitColors`, `vocation` e `lastOnlineAt`.

### Ticket do jogo

`POST /api/game-tickets`

Payload observado:

```json
{
  "characterId": "<id do personagem>"
}
```

Resposta observada com `ticket`, `websocketUrl` e `character`. O ticket observado tinha 43 caracteres e é temporário. O valor real nunca deve ser documentado ou impresso.

## WebSocket confirmado

O bundle oficial contém um codec binário. A conexão não aceita JSON puro como frame de aplicação.

O frontend abre a URL retornada por `game-tickets`, configura `binaryType = "arraybuffer"` e envia uma mensagem codificada equivalente a:

```json
{
  "type": "authenticate",
  "clientVersion": "0.3.0+e0",
  "ticket": "<ticket temporário>"
}
```

Depois, envia `ping` periodicamente e decodifica frames binários recebidos. Uma tentativa de enviar JSON puro resultou em fechamento anormal `1006`; portanto, o codec ainda precisa ser portado antes de o cliente independente conseguir consumir o catálogo real.

## Caçadas: mensagens confirmadas no bundle

O frontend não mostrou endpoints REST próprios para a aba. O catálogo e os estados são mensagens WebSocket.

Mensagens recebidas/interpretadas pelo frontend:

- `hunt-catalog`: catálogo de caçadas, campo `hunts`.
- `hunt-pending`: operação pendente, com `huntId` e `tier` quando existente.
- `hunt-start-warning`: aviso de piso de ouro antes de iniciar.
- `hunt-leave-pending`: saída pendente e tempo restante.
- `hunt-quick-sell-state`: cooldown, timer de venda e preview.
- `hunt-analyzer-session`: início/duração da sessão de análise.
- `hunt-analyzer-update`: atualização da análise da sessão.
- `hunt-exit-rules`: regras de saída da caçada.
- `hunt-sell-rules`: regras de venda.
- `hunt-favorites`: favoritos.
- `hunt-team-invited`, `hunt-team-invite-cancelled`.
- `hunt-leader-entered`, `hunt-leader-invite-cancelled`.
- `hunt-portal-entered`.

Mensagens enviadas pelo frontend:

```json
{ "type": "start-hunt", "huntId": "<id>", "tier": 0 }
```

Para iniciar com equipe, o frontend adiciona `withTeam: true`. Para trocar:

```json
{ "type": "change-hunt", "huntId": "<id>", "tier": 0 }
```

Para sair:

```json
{ "type": "leave-hunt" }
```

Outras mensagens confirmadas:

- `cancel-hunt`
- `cancel-leave-hunt`
- `set-hunt-exit-rules` com `rules`
- `set-hunt-sell-rules` com `rules`
- `set-hunt-favorites` com `huntIds`
- `hunt-quick-sell`
- `hunt-sell-skip`
- `hunt-analyzer-reset`
- `reset-hunt-bests` com `huntId`
- `hunt-leader-respond` com `accept`
- `hunt-team-respond` com `accept`
- `party-finder-queue` com `hunts`, `sizes`, `costs` e `perfectOnly`
- `party-finder-leave`

## O que ainda não foi confirmado

- Estrutura completa dos itens do `hunt-catalog` para a conta autenticada.
- Codec binário completo de mensagens WebSocket.
- Conteúdo real de cada caçada, recompensas, cooldowns e requisitos.
- Se `start-hunt` deve ser executado diretamente nesta conta sem confirmação adicional.
- Sequência exata de mensagens após iniciar uma caçada.
- Operação de coleta/finalização de recompensa, caso exista para a conta.
- Necessidade de refresh de ticket durante uma sessão longa.

## Arquivos criados

- `package.json`: scripts mínimos do projeto.
- `src/huntera-client.mjs`: cliente HTTP com gerenciamento de cookies em memória.
- `src/diagnose.mjs`: diagnóstico de login, sessão, personagem e ticket.
- `.env.example`: configuração sem segredos.
- `.gitignore`: ignora `.env`, dependências e artefatos.

## Como executar

1. Instale Node.js 20 ou superior.
2. Copie `.env.example` para `.env`.
3. Preencha `HUNTERA_USERNAME` e `HUNTERA_PASSWORD` localmente.
4. Execute:

```bash
npm run diagnose
```

Saída esperada, sem segredo:

```json
{
  "authenticated": true,
  "account": { "id": "...", "emailVerified": true },
  "character": { "id": "...", "name": "...", "level": 0, "vocation": "..." },
  "gameTicket": { "received": true, "websocketUrl": "wss://..." }
}
```

## Próximas instruções

1. Portar o codec binário encontrado no bundle oficial (`chunk-I5JJSQEP.js`), incluindo framing, codificação de mensagens e decodificação de respostas.
2. Implementar `GameSocket` separado do cliente HTTP, com autenticação por ticket, ping, reconexão e fechamento seguro.
3. Conectar o socket e capturar somente mensagens sanitizadas `hunt-catalog`, `player-stats`, `hunt-pending`, `hunt-analyzer-session` e `hunt-quick-sell-state`.
4. Criar tipos TypeScript para o catálogo e o estado de Caçadas a partir das mensagens realmente recebidas.
5. Validar leitura do catálogo sem enviar ações mutáveis.
6. Testar uma operação de baixo risco, preferencialmente apenas abrir/consultar a aba ou atualizar configuração não destrutiva, antes de considerar `start-hunt`.
7. Criar o backend local que mantém a sessão e nunca envia cookies/tickets ao frontend.
8. Criar o frontend React/TypeScript com login, personagem e tela de Caçadas baseada exclusivamente em dados reais.

## Limitação técnica atual

O cliente HTTP já funciona. A independência completa do navegador depende do codec binário WebSocket. Não é correto implementar a tela com mocks enquanto esse protocolo não estiver portado e validado.

## Validação real de RATS

Em 2026-10-02, o diagnóstico independente foi executado contra a conta configurada no `.env`:

- `GET /api/characters` retornou o personagem ativo.
- `POST /api/game-tickets` retornou um ticket temporário e uma URL WebSocket `wss://w1.huntera.com.br/ws/<porta>/`.
- O socket aceitou o frame binário `authenticate` com a versão `0.3.0+e0`.
- Foi recebida uma mensagem `hunt-catalog` com 74 entradas.
- As 10 primeiras entradas foram observadas na ordem do servidor. A primeira foi `{ id: "rat-hunt", name: "Rat Cellars" }`.
- A operação enviada foi exatamente `start-hunt`, com `{ huntId: "rat-hunt", tier: 0 }`.
- Após o envio, o servidor retornou `hunt-pending` e atualizações reais `player-stats`, `player-vitals` e `experience-gain`.

O protocolo não envia um campo confirmado chamado `kills` nas mensagens observadas. O diagnóstico mantém um contador local de mortes inferidas: registra `creature-appear`, associa o `id` e incrementa quando o mesmo `id` recebe `creature-disappear`, excluindo criaturas identificadas como jogador. Esse contador é uma métrica derivada e ainda não substitui um contador oficial do backend. `experience-gain.value` é acumulado separadamente.

O socket independente exige o header `Origin: https://www.huntera.com.br`; sem esse header o servidor fechou a conexão antes do handshake. O header não contém credenciais.

## Estrutura real das mensagens de criatura (confirmada em 2026-10-02)

### `creature-appear`

```json
{
  "type": "creature-appear",
  "creature": {
    "id": 1844881,
    "kind": "player",
    "name": "Gatonet",
    "position": { "x": 1071, "y": 1068, "z": 7 },
    "direction": "south",
    "healthPercent": 100,
    "outfitId": 128,
    "outfitColors": { "body": 0, "feet": 41, "head": 0, "legs": 114 },
    "mountId": 387,
    "speed": 440,
    "level": 58,
    "vocation": "knight"
  }
}
```

- O `id` da criatura está **dentro de `creature`**, não na raiz da mensagem.
- `kind: "player"` identifica o jogador. Monstros têm `kind` diferente ou ausente.
- A distinção jogador/monstro é feita por `creature.kind !== "player"`.

### `creature-disappear`

```json
{ "type": "creature-disappear", "id": 1844881 }
```

- O `id` numérico está na **raiz** da mensagem (sem objeto aninhado).
- Não há campo `name` nem `reason` — o nome do monstro só é recuperável pelo `creature-appear` prévio.

### Implicação para o rastreamento de mortes

O `creature-appear` deve ser indexado por `message.creature.id` (não `message.id`, que seria `undefined`). O `creature-disappear` usa `message.id` diretamente. A correlação entre os dois é pelo valor numérico do id. As mortes são contabilizadas tanto no total geral (`monsterDeaths`) quanto individualizadas por nome de criatura (`killsByName`), permitindo monitorar caçadas com múltiplos tipos de monstros.

## Módulo de Sessão (`src/hunt-session.mjs`)

A lógica de processamento de mensagens, cálculo de métricas e renderização no terminal foi encapsulada na classe `HuntSession`, totalmente desacoplada de I/O de rede e coberta por testes automatizados (`test/hunt-session.test.mjs`).

## Comandos Disponíveis

```bash
npm test         # Executa a suíte de testes unitários (11 testes)
npm start        # Inicia a aplicação interativa de terminal (CLI)
npm run web      # Inicia o servidor HTTP web multi-box em http://localhost:3000
```

### Frontend Web Multi-Box (`http://localhost:3000`)

Interface web escura/RPG completa com suporte a até 4 contas simultâneas:
1. **Multi-Boxing (4 Telas):** Cada tela possui formulário de login independente, operando com WebSocket isolado no backend. Permite visualização em Grade 2x2 ou em Abas.
2. **Identidade do Personagem:** Foto/avatar estilizado por vocação (Knight, Paladin, Sorcerer, Druid), Nível, Classe, HP e Mana.
3. **Todas as 74 Caçadas & Lógica de Tiers:** Carrega todas as caçadas do catálogo oficial e seus tiers dinâmicos (`Cautious`, `Bold`, `Reckless`) com contagem de monstros por sala.
4. **Métricas em Tempo Real:** Lucro líquido (Loot - Gastos), XP, Monstros derrotados (total e por criatura), tempo decorrido formatado (variável de segundos restantes foi removida).
5. **Sair da Caçada:** Botão interativo de saída em tempo real com retorno ao catálogo para nova seleção.

## Próximo passo: selecionar hunt e modo

O objetivo seguinte é permitir escolher uma caçada e um modo antes de enviar a ação. Os nomes de modo informados são, do mais fácil ao mais difícil:

1. `cautious`
2. `bold`
3. `reckless`

### O que já foi confirmado

- O catálogo real chega em `hunt-catalog.hunts`.
- Cada entrada observada possui pelo menos `id`, `name` e `monsters`.
- A ação de entrada observada no protocolo é `start-hunt`.
- O payload observado contém `huntId` e `tier`:

```json
{
  "type": "start-hunt",
  "huntId": "rat-hunt",
  "tier": 0
}
```

- `tier: 0` foi usado com sucesso para iniciar `Rat Cellars`.

### O que ainda não está confirmado

A busca nos bundles públicos não encontrou os literais `cautious`, `bold` ou `reckless`. Portanto, ainda não é confirmado que:

- `cautious` seja `tier: 0`;
- `bold` seja `tier: 1`;
- `reckless` seja `tier: 2`;
- todos os hunts tenham os três tiers;
- o modo seja enviado como `tier`, `mode`, outro campo, ou derivado de uma seleção anterior.

Não se deve trocar simplesmente `tier` para `1` ou `2` sem observar o frontend oficial ou a resposta do servidor.

### Como confirmar corretamente

1. Abrir o Huntera oficial e entrar na aba de Caçadas.
2. Selecionar uma hunt conhecida.
3. Selecionar cada modo, sem confirmar a entrada ainda.
4. Capturar a requisição WebSocket `start-hunt` no painel de rede ou pelo mecanismo de inspeção já usado.
5. Comparar os payloads dos três modos.
6. Registrar o campo exato, os valores e a resposta correspondente.
7. Repetir com uma hunt simples, como `Rat Cellars`, porque ela já foi validada para `tier: 0`.

Se o frontend enviar `tier: 0`, `tier: 1` e `tier: 2`, a implementação poderá expor a seleção como um mapa explícito:

```js
const HUNT_MODES = [
  { id: "cautious", label: "Cautious", tier: 0 },
  { id: "bold", label: "Bold", tier: 1 },
  { id: "reckless", label: "Reckless", tier: 2 },
];
```

Esse mapa só deve ser colocado no código depois da confirmação do tráfego real.

### Implementação planejada no diagnóstico

O diagnóstico deverá deixar de localizar `RATS` automaticamente e passar a aceitar configuração sem segredo:

```bash
HUNTERA_HUNT_ID=rat-hunt HUNTERA_HUNT_MODE=cautious npm run diagnose:hunts
```

O programa deve:

- listar as 10 primeiras hunts com `id`, `name`, monstros e campos de modo existentes;
- validar que o `huntId` escolhido existe no catálogo;
- validar que o modo foi mapeado para um valor confirmado;
- enviar somente `start-hunt` com os valores observados;
- exibir a mensagem enviada sem ticket/cookie/senha;
- acompanhar `hunt-pending`, `player-stats`, `player-vitals`, `experience-gain` e mortes inferidas;
- informar erro e não enviar nada quando a hunt ou o modo forem inválidos.

### Implementação planejada no frontend

Depois de confirmar o campo do modo, o backend local deverá manter a sessão Huntera e expor apenas dados locais, por exemplo:

- `POST /api/local/login`
- `GET /api/local/hunts`
- `POST /api/local/hunts/start` com `{ huntId, mode }`
- `GET /api/local/status`

O navegador local nunca deverá receber o cookie HTTP, o ticket temporário ou a URL privada do WebSocket. A tela poderá mostrar a lista real, um seletor de modo por hunt e o estado da operação.

### Critérios de validação

Considerar essa etapa concluída somente quando:

- pelo menos uma hunt for iniciada com `cautious`;
- pelo menos uma seleção de `bold` ou `reckless` for observada e validada, sem assumir o valor;
- a sequência enviada for documentada com o payload real;
- o estado posterior continuar chegando pelo WebSocket;
- a contagem de mortes e a experiência permanecerem atualizadas sem renderizar o jogo.

## Handoff para o próximo agente

A próxima implementação solicitada é transformar o diagnóstico automático em uma aplicação interativa de terminal.

### Objetivo de execução

O comando principal deve ser:

```bash
npm start
```

O fluxo esperado é:

1. carregar `HUNTERA_USERNAME` e `HUNTERA_PASSWORD` do `.env`;
2. autenticar via `POST /api/auth/login`;
3. obter personagens via `GET /api/characters`;
4. obter ticket via `POST /api/game-tickets`;
5. conectar ao WebSocket com header `Origin: https://www.huntera.com.br`;
6. aguardar `hunt-catalog`;
7. listar as 10 primeiras hunts, com nome e id;
8. pedir no terminal o nome da hunt ou parte dele;
9. se houver uma única correspondência, selecioná-la;
10. se houver várias, listar correspondências numeradas e pedir o índice;
11. enviar `start-hunt` com o `huntId` real;
12. exibir andamento atualizado a cada 5 segundos;
13. ao receber `Ctrl+C` ou `SIGTERM`, enviar `logout`, aguardar brevemente e fechar o WebSocket.

### Estado exibido a cada atualização

O essencial é a quantidade de monstros mortos na hunt. Também devem ser exibidos, quando disponíveis:

- timestamp da última mensagem;
- nome e id da hunt;
- estado de `hunt-pending`;
- `monsterDeaths`;
- `experienceGained` acumulada a partir de `experience-gain.value`;
- nível;
- vida e vida máxima;
- `huntSessionRemainingMs`.

O contador atual é derivado: guardar os eventos `creature-appear` por id e incrementar quando o mesmo id receber `creature-disappear`, ignorando entidades cujo evento indique jogador. O backend não confirmou um campo direto chamado `kills`.

### Alterações necessárias

1. Em `src/game-codec.mjs`, adicionar o código de saída confirmado para `logout`:

```js
logout: 42
```

2. Em `src/game-socket.mjs`, adicionar:

```js
logout() {
  if (this.socket?.readyState === this.WebSocketImpl.OPEN) {
    this.send({ type: "logout" });
  }
}
```

3. Substituir `src/diagnose-hunts.mjs` pelo fluxo interativo. Usar `node:readline/promises` com `stdin` e `stdout`, sem imprimir senha, cookies ou ticket.

4. Registrar handlers:

```js
process.once("SIGINT", () => void cleanupAndExit(0));
process.once("SIGTERM", () => void cleanupAndExit(0));
```

5. O cleanup precisa ser idempotente para não enviar logout duas vezes:

```js
async function cleanupAndExit(code) {
  if (cleanupStarted) return;
  cleanupStarted = true;
  try {
    socket?.logout();
    await sleep(150);
  } catch {}
  socket?.close();
  rl.close();
  process.exit(code);
}
```

6. Em `package.json`, adicionar:

```json
"start": "node src/diagnose-hunts.mjs"
```

### Seleção do modo

Os nomes solicitados pelo usuário são:

- `cautious`;
- `bold`;
- `reckless`.

Ainda não foi confirmado no tráfego se eles correspondem a `tier: 0`, `tier: 1` e `tier: 2`. O bundle contém `start-hunt` com `huntId` e `tier`, e `tier: 0` foi validado para `Rat Cellars`, mas não é correto assumir os outros valores.

Enquanto isso, aceitar opcionalmente:

```bash
HUNTERA_HUNT_TIER=0 npm start
```

O código deve usar `tier: 0` como padrão e mostrar os modos/campos do catálogo somente quando realmente existirem. O mapeamento dos nomes para tiers deve ser adicionado apenas depois de capturar o payload real do frontend oficial.

### Validação obrigatória após implementação

Executar:

```bash
npm test
npm start
```

No terminal, selecionar `Rat Cellars`, observar o início da hunt e confirmar pelo menos uma atualização de status. Pressionar `Ctrl+C` e confirmar nos logs apenas que o cleanup foi executado; nunca imprimir o conteúdo do ticket ou cookie.

Testar também nome parcial com múltiplas correspondências e entrada `q` para sair sem iniciar uma hunt.
