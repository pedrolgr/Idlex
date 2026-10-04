# Fixtures

| Pasta | Conteúdo | Versionada |
|---|---|---|
| `sessions/*.jsonl` | Sequências de eventos (mensagens do jogo + chamadas) reproduzidas em `HuntSession` | ✅ (sanitizadas) |
| `golden/*.json` | `toJSON()` esperado após o replay — **contrato de comportamento** das Fases 1 e 4 | ✅ |
| `raw/` | Frames/mensagens brutos sem sanitizar | ❌ (gitignored) |

## Formato de `sessions/*.jsonl`
Uma linha JSON por evento (linhas `//` são comentários):
```
{"at":400,"msg":{"type":"creature-appear","creature":{...}}}   # handleMessage
{"at":200,"call":"setHunt","args":["rat-hunt","Rat Cellars",["Rat"]]}  # chama método
{"at":0,"set":{"tier":1}}                                       # Object.assign na sessão
```
`at` = ms desde o início; o relógio (`Date`) é congelado e avançado conforme `at`.

## Fluxo
- Rodar: `npm test`
- Mudança **intencional** de comportamento aprovada: `UPDATE_GOLDEN=1 npm test` e revisar o diff do golden no PR.
- Nova fixture: criar `sessions/<nome>.jsonl`, rodar `npm test` (cria o golden e falha uma vez), revisar o golden e rodar de novo.

## Captura real (somente leitura)
```
node tools/capture-fixtures.mjs --name hunt-rats --seconds 300 --anonymize --probe blessings-open,request-death-history
```
Conecta com a conta do `.env` (derruba sessão aberta da mesma conta), **não inicia hunts**. Para capturar uma hunt,
inicie-a antes pelo Idlex/jogo e rode a captura depois (a hunt segue no servidor), ou execute a captura em duas etapas.
Revise `sessions/<nome>.jsonl` (nomes, dados pessoais) antes de commitar.
