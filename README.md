# DDL OS — Módulo Financeiro Interno

## Pré-requisitos
- Node.js 18+
- Firebase CLI: npm install -g firebase-tools

## Configuração

1. Copiar `.env.example` para `.env` e preencher:
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_STORAGE_BUCKET=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=

2. Instalar dependências:
   npm install

3. Rodar localmente:
   npm run dev

## Firebase

Login:
   firebase login

Deploy das Firestore rules e indexes:
   firebase init firestore
   (responder: arquivo de rules = firestore/firestore.rules,
    arquivo de indexes = firestore/firestore.indexes.json)
   firebase deploy --only firestore

## Seeds (categorias iniciais)

As categorias são inseridas manualmente pelo Firebase Console
ou via script quando disponível.
Arquivo de referência: seeds/f1/sanitized/categories.sanitized.seed.ts

## Usuários de teste

Criar manualmente no Firebase Console:
Firebase Console → Authentication → Add user
- ADMIN: qualquer email, definir role=ADMIN no Firestore
  (coleção users/{uid}, campo role: "ADMIN")
- OPERACIONAL: qualquer email, role: "OPERACIONAL"

## Rotas

| Rota                    | Acesso       |
|-------------------------|--------------|
| /login                  | Público      |
| /dashboard              | Todos        |
| /fluxo-caixa            | Todos        |
| /custos-fixos           | Todos        |
| /dre                    | Todos        |
| /asaas                  | Todos        |
| /metas                  | Apenas ADMIN |
| /passivos-tributarios   | Apenas ADMIN |
