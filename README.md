# Messaging App: Backend

API REST + WebSockets (Socket.IO) para uma aplicação de mensagens em tempo real, com autenticação JWT, conversas privadas, perfis de utilizador, presença online/offline e contagem de mensagens não lidas.

Construído como parte do currículo [The Odin Project](https://www.theodinproject.com/), no projecto [Messaging App](https://www.theodinproject.com/lessons/nodejs-messaging-app) do caminho Node.js.

![Node.js](https://img.shields.io/badge/Node.js-22+-339933?logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?logo=socketdotio&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)

- **API em produção:** `railway` -> depois
- **Frontend:** `Depois vou atualizar` (Next.js, em desenvolvimento)

---

## Índice

1. [Funcionalidades](#funcionalidades)
2. [Stack](#stack)
3. [Arquitectura](#arquitectura)
4. [Modelo de dados](#modelo-de-dados)
5. [Começar](#começar)
6. [Variáveis de ambiente](#variáveis-de-ambiente)
7. [Scripts](#scripts)
8. [Referência da API REST](#referência-da-api-rest)
9. [Tempo real com Socket.IO](#tempo-real-com-socketio)
10. [Segurança](#segurança)
11. [Testar manualmente](#testar-manualmente)
12. [Deploy no Railway](#deploy-no-railway)
13. [Resolução de problemas](#resolução-de-problemas)
14. [Limitações conhecidas e próximos passos](#limitações-conhecidas-e-próximos-passos)
15. [Recursos úteis](#recursos-úteis)

---

## Funcionalidades

- **Autenticação**: registo e login com password em hash (bcrypt) e sessão via JWT.
- **Perfil**: nome de apresentação, bio e avatar (por URL), com actualização parcial.
- **Pesquisa de utilizadores** para iniciar conversas.
- **Conversas privadas** idempotentes: abrir a conversa com alguém que já tens devolve a existente, nunca cria duplicados.
- **Mensagens** com paginação por cursor (histórico estável mesmo com mensagens novas a chegar).
- **Tempo real** com Socket.IO: novas mensagens entregues instantaneamente a todos os dispositivos do destinatário (e do remetente).
- **Presença**: online/offline e "visto pela última vez", com margem para refreshes de página.
- **Leituras**: marcar conversa como lida, contagem de não lidas por conversa e eventos de leitura em tempo real.

> O modelo de dados já suporta **chats de grupo**, mas os endpoints de grupo ainda não estão implementados (ver [próximos passos](#limitações-conhecidas-e-próximos-passos)).

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 22+ (ESM) |
| Linguagem | TypeScript |
| Framework HTTP | Express 5 |
| Tempo real | [Socket.IO](https://socket.io/docs/v4/) |
| Base de dados | PostgreSQL |
| ORM | Prisma 7 (com `@prisma/adapter-pg`) |
| Validação | express-validator |
| Autenticação | JWT (`jsonwebtoken`) + `bcryptjs` |
| Deploy | Railway |

## Arquitectura

```
messaging-app-backend/
├─ prisma/
│  ├─ schema.prisma           # modelos da base de dados
│  └─ migrations/             # histórico de migrações (vai para o git)
├─ scripts/
│  └─ listen.mjs              # cliente Socket.IO de teste (linha de comandos)
├─ src/
│  ├─ config/
│  │  └─ env.ts               # lê e valida variáveis de ambiente
│  ├─ controllers/            # lógica de cada rota
│  │  ├─ auth.ts
│  │  ├─ conversations.ts
│  │  └─ users.ts
│  ├─ generated/prisma/       # cliente Prisma gerado (não vai para o git)
│  ├─ lib/
│  │  ├─ jwt.ts               # assinar/verificar tokens
│  │  ├─ prisma.ts            # instância do PrismaClient
│  │  └─ selects.ts           # campos de utilizador que podem sair na API
│  ├─ middleware/
│  │  ├─ requireAuth.ts       # protege rotas REST com JWT
│  │  └─ validate.ts          # devolve erros do express-validator
│  ├─ routes/
│  │  ├─ auth.ts
│  │  ├─ conversations.ts
│  │  └─ users.ts
│  ├─ socket/
│  │  ├─ index.ts             # servidor Socket.IO + autenticação
│  │  ├─ presence.ts          # online/offline
│  │  └─ rooms.ts             # nomes das rooms
│  ├─ validators/             # regras do express-validator
│  ├─ app.ts                  # configura o Express (sem listen)
│  └─ server.ts               # cria o servidor HTTP + Socket.IO e escuta a porta
├─ prisma.config.ts
├─ tsconfig.json
└─ package.json
```

**Camadas:** `routes` define os caminhos e a ordem dos middlewares, `validators` + `validate` rejeitam entradas inválidas, `controllers` contêm a lógica e falam com a base de dados através do Prisma.

`app.ts` está separado de `server.ts` porque o Socket.IO precisa do `http.Server` (não só da app Express), e porque assim a app pode ser testada sem abrir uma porta.

### Fluxo de uma mensagem

O REST continua a ser a fonte de verdade (valida, grava). O socket serve só para **avisar** quem está ligado.

```mermaid
sequenceDiagram
    participant Ana
    participant API as API (Express)
    participant DB as PostgreSQL
    participant IO as Socket.IO
    participant Bruno

    Ana->>API: POST /conversations/:id/messages
    API->>API: valida token, dados e participação
    API->>DB: grava mensagem + actualiza conversa
    API->>IO: emit "message:new" para as rooms dos participantes
    IO-->>Bruno: message:new (todos os dispositivos)
    IO-->>Ana: message:new (outros dispositivos)
    API-->>Ana: 201 { message }
```

Se o Bruno estiver offline, a mensagem fica na base de dados e ele vai buscá-la por `GET /conversations/:id/messages` quando voltar. **O socket nunca é o sítio onde as mensagens vivem.**

## Modelo de dados

```mermaid
erDiagram
    User ||--o{ Participant : "participa em"
    Conversation ||--o{ Participant : "tem"
    Conversation ||--o{ Message : "contém"
    User ||--o{ Message : "envia"

    User {
        string id PK
        string username UK
        string email UK
        string passwordHash
        string displayName
        string bio
        string avatarUrl
        datetime lastSeenAt
    }
    Conversation {
        string id PK
        boolean isGroup
        string name
        string directKey UK
        datetime updatedAt
    }
    Participant {
        string userId PK
        string conversationId PK
        datetime joinedAt
        datetime lastReadAt
    }
    Message {
        string id PK
        string content
        datetime createdAt
        string senderId FK
        string conversationId FK
    }
```

Uma mensagem pertence a uma **conversa**, não a um par "remetente → destinatário". Quem está na conversa é decidido pela tabela `Participant`. Assim, uma conversa privada é só uma conversa com 2 participantes, e um grupo é uma com N, sem alterar o modelo.

Decisões de modelação:

- **`directKey`**: o PostgreSQL não consegue garantir sozinho que dois utilizadores só têm *uma* conversa privada. Guardamos uma chave com os dois ids ordenados (`[idA, idB].sort().join(":")`) marcada como `@unique`. Em grupos fica `null`.
- **`Participant` com chave composta** `[userId, conversationId]`: o mesmo utilizador não pode estar duas vezes na mesma conversa.
- **`lastReadAt`** no participante: mensagens não lidas são as de outras pessoas com `createdAt` posterior a este valor.
- **Índice** `[conversationId, createdAt]` em `Message`, para a consulta mais frequente (últimas mensagens de uma conversa).

## Começar

### Pré-requisitos

- Node.js 22 ou superior
- PostgreSQL a correr localmente (ou um URL de uma base de dados remota)

### Instalação

```bash
git clone <url-do-repositorio>
cd messaging-app-backend

npm install

# Cria a base de dados local
createdb messaging

# Configura as variáveis de ambiente
cp .env.example .env
# edita o .env (ver a secção seguinte)

# Aplica as migrações e gera o cliente Prisma
npx prisma migrate dev
npx prisma generate

# Arranca em modo de desenvolvimento
npm run dev
```

A API fica em `http://localhost:4000`. Confirma com:

```bash
curl http://localhost:4000/health
# {"ok":true}
```

> O `npx prisma generate` é um passo separado: o `migrate dev` do Prisma 7 não o corre automaticamente. Sem ele, a pasta `src/generated/prisma` não existe e os imports falham.

## Variáveis de ambiente

| Variável | Descrição | Exemplo |
|---|---|---|
| `DATABASE_URL` | URL de ligação ao PostgreSQL | `postgresql://user:pass@localhost:5432/messaging` |
| `JWT_SECRET` | Segredo para assinar os tokens. Usa um valor longo e aleatório | gerar com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CLIENT_URL` | Origem do frontend (usada no CORS do Express **e** do Socket.IO) | `http://localhost:3000` |
| `PORT` | Porta do servidor (o Railway define-a sozinho) | `4000` |

A app falha logo no arranque, com uma mensagem clara, se faltar alguma das obrigatórias (`DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`).

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor com recarregamento automático (`tsx watch`) |
| `npm run build` | `prisma generate` + compilação TypeScript para `dist/` |
| `npm start` | Corre a versão compilada (`node dist/server.js`) |
| `npm run db:migrate` | Cria/aplica migrações em desenvolvimento |
| `npm run db:deploy` | Aplica migrações existentes (produção) |

---

## Referência da API REST

URL base: `http://localhost:4000`

Todas as rotas, excepto `/health`, `/auth/signup` e `/auth/login`, exigem o header:

```
Authorization: Bearer <token>
```

### Resumo

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/health` | Não | Verificação de estado |
| POST | `/auth/signup` | Não | Criar conta |
| POST | `/auth/login` | Não | Iniciar sessão |
| GET | `/auth/me` | Sim | Dados do utilizador autenticado |
| GET | `/users?search=` | Sim | Pesquisar utilizadores por username |
| PATCH | `/users/me` | Sim | Actualizar o próprio perfil |
| POST | `/conversations/direct` | Sim | Abrir (ou obter) conversa privada |
| GET | `/conversations` | Sim | Listar as minhas conversas |
| GET | `/conversations/:id/messages` | Sim | Mensagens de uma conversa (paginadas) |
| POST | `/conversations/:id/messages` | Sim | Enviar mensagem |
| POST | `/conversations/:id/read` | Sim | Marcar conversa como lida |

### Formato dos erros

Erros de validação (`400`):

```json
{
  "errors": [
    { "field": "email", "message": "Email inválido" }
  ]
}
```

Outros erros:

```json
{ "message": "Descrição do erro" }
```

| Código | Quando |
|---|---|
| `400` | Dados inválidos |
| `401` | Token em falta/inválido/expirado, ou credenciais erradas |
| `404` | Recurso não existe **ou** não tens acesso a ele |
| `409` | Conflito (username ou email já em uso) |
| `500` | Erro interno |

### Autenticação

#### `POST /auth/signup`

```json
{
  "username": "ana",
  "email": "ana@mail.com",
  "password": "12345678",
  "confirmPassword": "12345678"
}
```

Regras: `username` com 3 a 20 caracteres (letras, números e `_`, guardado em minúsculas); `email` válido; `password` com 8 a 72 caracteres; `confirmPassword` igual à password.

Resposta `201`:

```json
{
  "token": "eyJhbGciOi...",
  "user": {
    "id": "7f3c9a2e-...",
    "username": "ana",
    "email": "ana@mail.com",
    "displayName": null,
    "bio": null,
    "avatarUrl": null
  }
}
```

#### `POST /auth/login`

```json
{ "email": "ana@mail.com", "password": "12345678" }
```

Resposta `200`: igual à do signup. Devolve `401` com a mesma mensagem ("Email ou password incorretos") quer o email não exista, quer a password esteja errada, para não revelar que emails estão registados.

#### `GET /auth/me`

Resposta `200`: `{ "user": { ... } }`

### Utilizadores

#### `GET /users?search=bru`

Procura por username (sem distinguir maiúsculas), até 20 resultados, excluindo o próprio utilizador.

```json
{
  "users": [
    {
      "id": "...",
      "username": "bruno",
      "displayName": "Bruno Costa",
      "avatarUrl": "https://...",
      "lastSeenAt": "2026-10-10T14:32:10.000Z"
    }
  ]
}
```

#### `PATCH /users/me`

Actualização **parcial**: só mudam os campos enviados. Envia `null` para limpar um campo.

```json
{
  "displayName": "Ana Silva",
  "bio": "Dev em Luanda",
  "avatarUrl": "https://exemplo.com/ana.png"
}
```

| Campo | Regra |
|---|---|
| `displayName` | 1 a 50 caracteres |
| `bio` | até 160 caracteres (`""` limpa-a) |
| `avatarUrl` | URL `http(s)` válido, até 500 caracteres |

`username`, `email` e quaisquer outros campos são ignorados. Se nenhum campo válido for enviado, devolve `400`. Resposta `200`: `{ "user": { ... } }`.

### Conversas

#### `POST /conversations/direct`

```json
{ "userId": "<id-do-outro-utilizador>" }
```

Devolve `201` se criou a conversa, ou `200` se já existia. É seguro chamar várias vezes (inclusive em simultâneo pelos dois utilizadores). Não podes abrir uma conversa contigo próprio (`400`).

```json
{
  "conversation": {
    "id": "...",
    "isGroup": false,
    "name": null,
    "directKey": "idA:idB",
    "createdAt": "...",
    "updatedAt": "...",
    "participants": [
      {
        "userId": "...",
        "conversationId": "...",
        "joinedAt": "...",
        "lastReadAt": null,
        "user": { "id": "...", "username": "ana", "displayName": null, "avatarUrl": null, "lastSeenAt": null }
      }
    ]
  }
}
```

#### `GET /conversations`

As minhas conversas, da mais recente para a mais antiga, com a última mensagem e o número de não lidas.

```json
{
  "conversations": [
    {
      "id": "...",
      "isGroup": false,
      "participants": [ ... ],
      "lastMessage": { "id": "...", "content": "Olá", "createdAt": "...", "senderId": "..." },
      "unreadCount": 2
    }
  ]
}
```

O `lastReadAt` de cada participante vem em `participants`, e serve para mostrar "visto" ao remetente.

#### `GET /conversations/:id/messages`

| Query | Descrição |
|---|---|
| `limit` | Mensagens por página (1 a 100, por omissão 30) |
| `cursor` | `nextCursor` da resposta anterior (para a página seguinte) |

```json
{
  "messages": [
    {
      "id": "...",
      "content": "Olá Bruno",
      "createdAt": "2026-10-10T14:30:00.000Z",
      "senderId": "...",
      "conversationId": "...",
      "sender": { "id": "...", "username": "ana", "displayName": null, "avatarUrl": null, "lastSeenAt": null }
    }
  ],
  "nextCursor": "uuid-da-ultima-mensagem-da-pagina"
}
```

As mensagens vêm da **mais recente para a mais antiga**; o frontend inverte-as para mostrar. `nextCursor` é `null` quando não há mais páginas.

#### `POST /conversations/:id/messages`

```json
{ "content": "Olá Bruno" }
```

O conteúdo tem de ter entre 1 e 2000 caracteres (depois de remover espaços nas pontas). Resposta `201`: `{ "message": { ... } }`. Emite o evento `message:new` por socket.

#### `POST /conversations/:id/read`

Sem corpo. Marca a conversa como lida para o utilizador autenticado. Resposta `200`:

```json
{ "conversationId": "...", "lastReadAt": "2026-10-10T14:35:00.000Z" }
```

Emite o evento `conversation:read` por socket.

---

## Tempo real com Socket.IO

O servidor usa o [Socket.IO](https://socket.io/docs/v4/) para avisar os clientes de novas mensagens, mudanças de presença e leituras.

📚 **Documentação oficial:** [socket.io/docs/v4](https://socket.io/docs/v4/)  
Páginas relevantes para este projecto: [Rooms](https://socket.io/docs/v4/rooms/) · [Middlewares](https://socket.io/docs/v4/middlewares/) · [Emit cheatsheet](https://socket.io/docs/v4/emit-cheatsheet/) · [Client API](https://socket.io/docs/v4/client-api/)

### Ligação e autenticação

O cliente envia o JWT no *handshake*. Um middleware (`io.use`) verifica-o **antes** de aceitar a ligação:

```ts
import { io } from "socket.io-client";

const socket = io("http://localhost:4000", {
  autoConnect: false,
  auth: { token }, // o mesmo JWT usado na API REST
});

socket.connect();

socket.on("connect_error", (err) => {
  console.log(err.message); // "Unauthorized" se o token for inválido
});
```

O id do utilizador vem **sempre do token verificado** (`socket.data.userId`), nunca de dados enviados pelo cliente.

### Rooms: notificar um utilizador específico

Quando um socket liga, entra automaticamente numa **room privada** com o id do utilizador: `user:<userId>`.

Para notificar alguém, o servidor emite para essa room:

```ts
io.to(`user:${recipientId}`).emit("message:new", message);
```

Porque é que isto é melhor do que guardar o socket de cada utilizador: se a mesma pessoa tiver 3 separadores ou um telemóvel e um PC, **todos** os sockets dela estão na mesma room e todos recebem o evento. O `io.to([...rooms])` aceita várias rooms e entrega cada evento uma só vez a cada socket.

### Eventos servidor → cliente

| Evento | Payload | Quando |
|---|---|---|
| `message:new` | Objecto da mensagem (com `sender`) | Alguém envia uma mensagem numa conversa onde estás (inclui as que tu envias, para sincronizar os teus outros dispositivos) |
| `presence:init` | `{ onlineUserIds: string[] }` | Logo após ligares: quais dos teus contactos estão online agora |
| `presence:update` | `{ userId, online, lastSeenAt? }` | Um contacto fica online ou offline |
| `conversation:read` | `{ conversationId, userId, lastReadAt }` | Alguém marca uma conversa como lida |

Os clientes não emitem eventos para o servidor: **todas as acções passam pela API REST** e o servidor emite depois de gravar. Isto mantém a validação e o tratamento de erros num só sítio.

### Presença

- Um utilizador pode ter vários sockets; só fica **offline** quando o último se desliga.
- Há uma margem de **3 segundos** antes de declarar offline: num refresh de página o socket antigo desliga e o novo liga em milissegundos, e sem a margem os contactos veriam o estado a piscar.
- Ao ficar offline, o servidor grava `lastSeenAt` e avisa só quem **partilha uma conversa** com o utilizador.

### Boas práticas no cliente (React/Next.js)

1. Cria o socket **uma só vez** (módulo singleton) e só no cliente (`"use client"`), com `autoConnect: false`.
2. Liga-o depois do login e **limpa sempre os listeners** no `useEffect`: em desenvolvimento o React Strict Mode corre os effects duas vezes, e sem limpeza as mensagens aparecem duplicadas.
3. Carrega o histórico por REST e usa o socket só para o que chega **depois**. Depois de uma reconexão, recarrega as mensagens para não perder as que chegaram entretanto.
4. Evita duplicados comparando o `id` da mensagem com as que já tens.
5. Se receberes `message:new` de uma conversa que ainda não está na tua lista, volta a pedir `GET /conversations`.
6. Em produção, o servidor de sockets **não pode** estar numa plataforma serverless (ex.: funções da Vercel), porque precisa de ligações persistentes. O backend deve correr num serviço normal (Railway, Render, Fly.io, VPS).

---

## Segurança

| Medida | Detalhe |
|---|---|
| Passwords | Guardadas com hash (`bcryptjs`, custo 10); nunca devolvidas pela API. Máximo de 72 caracteres, porque o bcrypt só usa os primeiros 72 bytes |
| Tokens | JWT com o id do utilizador no claim `sub` e expiração de 7 dias. O payload não é secreto (só assinado), por isso não contém dados sensíveis |
| Verificação de participação | Só quem pertence a uma conversa pode ler/enviar mensagens ou marcá-la como lida. Quem não pertence recebe **404** (e não 403), para não confirmar que a conversa existe |
| Login | Mensagem de erro idêntica para email inexistente e password errada |
| Duplicados | Username/email repetidos são barrados pela base de dados (`@unique`), sem *race conditions* de "verificar e depois criar" |
| Mass assignment | `PATCH /users/me` só lê uma lista fixa de campos; o resto do corpo é ignorado |
| Avatares | Só URLs `http(s)`; bloqueia esquemas como `javascript:` ou `data:` |
| Validação | express-validator em todas as entradas (corpo, parâmetros e query), com limites de tamanho |
| CORS | Origem restrita a `CLIENT_URL`, tanto no Express como no Socket.IO (são configurados separadamente) |
| Sockets | Autenticados por JWT no handshake; as rooms privadas só são acessíveis pelo próprio servidor |
| Queries | Todas através do Prisma (parametrizadas), sem SQL concatenado |

## Testar manualmente

### Com `curl`

```bash
# Criar dois utilizadores
curl -X POST http://localhost:4000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"ana","email":"ana@mail.com","password":"12345678","confirmPassword":"12345678"}'

curl -X POST http://localhost:4000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"bruno","email":"bruno@mail.com","password":"12345678","confirmPassword":"12345678"}'

# Guarda os tokens
export TOKEN_ANA="..."
export TOKEN_BRUNO="..."

# A Ana procura o Bruno, abre a conversa e envia uma mensagem
curl "http://localhost:4000/users?search=bru" -H "Authorization: Bearer $TOKEN_ANA"

curl -X POST http://localhost:4000/conversations/direct \
  -H "Authorization: Bearer $TOKEN_ANA" -H "Content-Type: application/json" \
  -d '{"userId":"<ID_DO_BRUNO>"}'

curl -X POST http://localhost:4000/conversations/<ID_CONVERSA>/messages \
  -H "Authorization: Bearer $TOKEN_ANA" -H "Content-Type: application/json" \
  -d '{"content":"Olá Bruno"}'
```

### Tempo real (sem frontend)

O script `scripts/listen.mjs` liga-se ao socket e imprime todos os eventos:

```bash
node scripts/listen.mjs $TOKEN_BRUNO
```

Com este terminal aberto, envia uma mensagem como a Ana (com o `curl` acima) e vê-a chegar no instante. Para testar a presença, liga um segundo terminal com o token da Ana e fecha-o com `Ctrl+C`: cerca de 3 segundos depois, o terminal do Bruno recebe `presence:update` com `online: false`.

### Casos de segurança a verificar

- Um terceiro utilizador a tentar ler, enviar ou marcar como lida uma conversa alheia deve receber **404**.
- `node scripts/listen.mjs abc` (token inválido) deve imprimir `Unauthorized`.
- Um utilizador sem relação com a conversa **não** deve receber eventos dela.

---

## Deploy no Railway

[Railway](https://docs.railway.com/) corre o serviço Node e a base de dados PostgreSQL no mesmo projecto.

1. **Cria um projecto** no Railway e adiciona um serviço **PostgreSQL**.
2. **Adiciona o repositório** do backend como um novo serviço (deploy a partir do GitHub).
3. **Variáveis de ambiente** do serviço da API:
   - `DATABASE_URL`: referencia a variável do serviço PostgreSQL do Railway
   - `JWT_SECRET`: um valor longo e aleatório (`openssl rand -hex 48`)
   - `CLIENT_URL`: o URL do frontend em produção (sem barra no fim)
   - `PORT` **não** precisas de definir: o Railway fornece-a
4. **Comandos** (em *Settings* do serviço):
   - Build: `npm run build`
   - **Pre-deploy**: `npx prisma migrate deploy`
   - Start: `npm start`
5. Gera um domínio público e confirma com `https://<dominio>/health`.

### Pontos que costumam falhar

- **A pasta `prisma/migrations` tem de estar no git.** O `migrate deploy` aplica o que lá estiver; sem ela, não há nada para aplicar.
- **As migrações correm no *pre-deploy*, não no `start`**, para correrem uma só vez por deploy.
- **`prisma` deve estar em `dependencies`** (não em `devDependencies`) e fixado na versão 7 (`prisma@7`). Assim o comando de pre-deploy usa a versão do projecto em vez de o `npx` descarregar a última versão do Prisma, que tem um fluxo diferente.
- **O cliente Prisma gerado não vai para o git** (`src/generated`). Por isso o `npm run build` corre `prisma generate` antes do `tsc`.
- **O cliente gerado tem de ficar dentro de `src/`**, senão o `tsc` não o compila para `dist/`.
- **Imports relativos com extensão `.js`** (`import { x } from "./y.js"`), mesmo em ficheiros `.ts`. Com ESM e `NodeNext`, o `tsx` perdoa a falta da extensão em desenvolvimento, mas o `node dist/server.js` não.
- **HTTPS/WSS:** com o frontend em HTTPS, o Socket.IO também tem de ser servido por HTTPS (o Railway trata disso no domínio público).

## Resolução de problemas

| Sintoma | Causa provável | Solução |
|---|---|---|
| `Cannot find module '.../generated/prisma/client.js'` | Cliente Prisma não gerado | `npx prisma generate` |
| `ERR_MODULE_NOT_FOUND` ao correr `dist/` | Import relativo sem `.js` | Acrescenta a extensão `.js` ao import |
| `Variável de ambiente em falta: X` | `.env` incompleto (ou variável em falta no Railway) | Define a variável |
| `prisma init` dá "No flag registered" | A última versão do Prisma tem um `init` diferente | Usa a versão 7: `npm i -D prisma@7 @prisma/client@7 @prisma/adapter-pg@7` |
| Erro de CORS no browser | `CLIENT_URL` não coincide com a origem do frontend | Corrige a variável (sem barra final) |
| Socket com `connect_error: Unauthorized` | Token em falta, inválido ou expirado | Envia o JWT em `auth.token` no handshake |
| Mensagens duplicadas no frontend | Listeners do socket não removidos no `useEffect` | Faz `socket.off(...)` no cleanup |
| `409` no signup | Username ou email já registados | Usa outros valores |

## Limitações conhecidas e próximos passos

**Limitações actuais**

- Sem *rate limiting* nas rotas de autenticação.
- O JWT dura 7 dias e não há *refresh tokens* nem revogação (fazer logout só apaga o token no cliente).
- O estado de presença vive em memória do processo: funciona com uma só instância. Para várias instâncias seria preciso o [adaptador Redis](https://socket.io/docs/v4/redis-adapter/) do Socket.IO.
- A contagem de não lidas faz uma query por conversa; adequado para este tamanho, mas optimizável com uma única query SQL agrupada.
- Sem testes automatizados.

**Próximos passos**

- [ ] Frontend em Next.js + Tailwind
- [ ] Endpoints de **chats de grupo** (o modelo já os suporta)
- [ ] Indicador "a escrever…"
- [ ] Envio de imagens/ficheiros (projecto seguinte)
- [ ] Rate limiting e testes automatizados
- [ ] Opção de esconder o "visto pela última vez"

## Recursos úteis

- [Socket.IO: documentação oficial (v4)](https://socket.io/docs/v4/)
- [Socket.IO: Rooms](https://socket.io/docs/v4/rooms/)
- [Socket.IO: Middlewares](https://socket.io/docs/v4/middlewares/)
- [Prisma ORM](https://www.prisma.io/docs)
- [Express](https://expressjs.com/)
- [express-validator](https://express-validator.github.io/docs/)
- [JWT: introdução](https://jwt.io/introduction)
- [Railway: documentação](https://docs.railway.com/)
- [The Odin Project: Messaging App](https://www.theodinproject.com/lessons/nodejs-messaging-app)

## Autor

`Jormaedes` · [GitHub](https://github.com/jormaedes) · [LinkedIn](https://www.linkedin.com/in/jormaedes)

## Licença

A definir.