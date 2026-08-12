# T35 Academy — Infraestrutura Firebase

## Projeto

| Campo        | Valor                          |
|--------------|-------------------------------|
| Project ID   | `team35-academy`              |
| Auth Domain  | `team35-academy.firebaseapp.com` |
| Hosting URL  | `https://team35-academy.web.app` |
| SDK Version  | Firebase JS 12.14.0 (CDN)    |

Console: https://console.firebase.google.com/project/team35-academy

---

## Ambiente de Desenvolvimento

O projeto usa **dois ambientes distintos**:

| Ambiente  | Pasta       | Como rodar            |
|-----------|-------------|----------------------|
| Local     | raiz `/`    | XAMPP → `localhost`  |
| Produção  | `public/`   | Firebase Hosting     |

> **Regra importante:** sempre editar os arquivos na raiz. Só copiar para `public/` quando for fazer deploy.

---

## Serviços Utilizados

### Authentication
- Provedor: **Email/Senha**
- Persistência: `browserLocalPersistence` (sessão mantida após fechar o navegador)
- Roles controladas via campo `role` no Firestore (`admin`, `instrutor`, `candidato`)

### Firestore

Coleções principais:

#### `users`
```
uid          string   — UID do Firebase Auth
fullName     string
email        string
role         string   — 'admin' | 'instrutor' | 'candidato'
empresa      string   — (candidatos)
```

#### `cursos`
```
titulo       string
descricao    string
instrutor    string   — nome completo do instrutor
instrutorEmail string
modalidade   string   — 'presencial' | 'ead' | 'online'
videoUrl     string   — obrigatório para EAD
vagas        number
status       string   — 'ativo' | 'em-breve' | 'finalizado'
codigoPresenca string — gerado na tela de Presença (presencial/online)
createdAt    timestamp
```

#### `inscricoes`
```
candidatoId  string   — UID do candidato
cursoId      string   — ID do curso
status       string   — 'pendente' | 'apto' | 'concluido' | 'falta' | 'rejeitada'
presencas    array    — datas ISO (ex: ['2025-07-15']) confirmadas
percentualVideo number — máximo % assistido (só cresce, nunca regride)
suspeito     boolean  — true se concluiu rápido demais (< 50% do tempo real)
createdAt    timestamp
updatedAt    timestamp
```

### Fluxo de status das inscrições
```
pendente → apto → concluido
                → falta
         → rejeitada
```
- **apto**: instrutor aprovou a participação
- **concluido**: presença confirmada + instrutor finalizou
- **falta**: instrutor finalizou sem presença registrada
- **Presença EAD**: automática ao atingir 80% do vídeo (`presencas: arrayUnion(hoje)`)
- **Presença presencial/online**: candidato confirma via código ou QR Code

### Storage
- Configurado mas não utilizado ativamente (reservado para uploads futuros)

---

## PWA / Instalação no Android

**Não existe app Android nativo neste projeto** — sem `.apk`/`.aab`, sem pasta `android/`, sem
`AndroidManifest.xml`/`build.gradle`, sem TWA/Bubblewrap/Capacitor/Cordova, em nenhum ponto do
histórico do git (confirmado por busca completa em 2026-08-12). "Instalar Aplicativo" é só o fluxo
padrão de PWA do Chrome: `instalar.html` é a única página do site com `<link rel="manifest">`, e o
botão escuta o evento `beforeinstallprompt`. No Android, o próprio Chrome gera um WebAPK a partir
disso — não há `targetSdkVersion`/certificado que o código deste projeto controle.

Desde 2026-08-12 há um `sw.js` (raiz do projeto, registrado em `instalar.html`) como reforço de
instalabilidade PWA — critério que o Chrome usa para gerar a instalação completa em vez de um atalho
degradado. Ele cacheia **só** as imagens estáticas do app shell (`assets/img/t35logo.png`,
`t35-android.png`, `t35-ios.png`, `favi-t35.png`); todo o resto (HTML, JS, chamadas ao Firebase) vai
sempre direto pra rede, de propósito — cache de conteúdo dinâmico arriscaria mostrar curso/status
desatualizado.

**Contexto:** adicionado depois de um usuário relatar, ao instalar em um Samsung com Android mais
novo, um aviso do tipo "o app não tem os requisitos mínimos de segurança que o sistema exige". Essa
mensagem é característica de proteção do próprio Android/Chrome/Samsung, fora do alcance do código do
site — o service worker é uma medida defensiva plausível, não uma correção garantida.

---

## Deploy

```bash
# 1. Copiar arquivos alterados para public/
# (copiar manualmente ou via script)

# 2. Deploy apenas do hosting
firebase deploy --only hosting

# 3. Deploy completo (hosting + regras Firestore)
firebase deploy
```

> Lembrar de atualizar `public/firebase-config.js` junto com a raiz se houver mudança de config.

---

## Regras Firestore

Configurar em: Console → Firestore → Rules

Recomendação mínima de produção:
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Usuários só leem/escrevem o próprio documento
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.uid;
    }

    // Cursos: leitura pública autenticada, escrita só admin
    match /cursos/{cursoId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Inscrições: candidato vê as próprias, instrutor/admin vê todas
    match /inscricoes/{inscricaoId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## Arquivos de configuração Firebase no projeto

| Arquivo                 | Função                                      |
|-------------------------|---------------------------------------------|
| `firebase.json`         | Configuração do hosting (pasta `public/`)   |
| `firebase-config.js`    | Inicialização do SDK (raiz)                 |
| `public/firebase.json`  | Cópia do hosting para o deploy              |
| `public/firebase-config.js` | Cópia do SDK para o deploy             |
| `.firebaserc`           | Alias do projeto (`team35-academy`)         |
