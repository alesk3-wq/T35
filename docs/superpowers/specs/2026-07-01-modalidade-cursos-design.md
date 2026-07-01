# Design: Modalidade de Cursos e Confirmação de Presença Automática

**Data:** 2026-07-01  
**Status:** Aprovado

---

## Problema

O sistema atual tem um único fluxo de confirmação de presença (código alfanumérico + QR Code) para todos os tipos de curso. Isso não faz sentido para cursos EAD, onde o aluno assiste um vídeo no YouTube — a presença deveria ser confirmada automaticamente ao concluir o vídeo, sem precisar de código do instrutor.

---

## Solução

Adicionar um campo `modalidade` aos cursos, que determina o mecanismo de confirmação de presença:

| Modalidade | Mecanismo de presença | Vídeo |
|---|---|---|
| `presencial` | Código / QR Code (fluxo atual) | Opcional (material suplementar) |
| `ead` | Auto-confirmação ao assistir 80% do vídeo | Obrigatório |
| `online` | Código / QR Code (fluxo atual) | Opcional (material suplementar) |

---

## Modelo de Dados

### Campo novo no documento `cursos` (Firestore)

```
modalidade: 'presencial' | 'ead' | 'online'
```

- **Default implícito:** documentos existentes sem `modalidade` são tratados como `'presencial'` — sem necessidade de migração.
- `videoUrl` continua existindo em todos os tipos. Em `ead` é obrigatório (validação no formulário). Nos demais, é opcional.

---

## Mudanças por Arquivo

### 1. `admin/cursos.html`

- Novo campo `modalidade` no formulário de criar/editar curso, posicionado acima do campo `videoUrl`.
- Implementado como `<select>` com três opções: Presencial (padrão), EAD (Vídeo), Online ao vivo.
- Quando `EAD` estiver selecionado: campo `videoUrl` fica `required` e exibe aviso visual "Obrigatório para cursos EAD".
- Na listagem de cursos: badge pequena ao lado do título indicando a modalidade.
- Campo `modalidade` salvo no Firestore ao criar/editar.

### 2. `candidato/catalogo.html`

- Badge de modalidade em cada card de curso: `📍 Presencial`, `🎬 EAD`, `💻 Online`.
- Apenas visual, sem impacto em lógica de inscrição.

### 3. `candidato/meus-cursos.html`

- Para cursos com `modalidade === 'ead'` e `status === 'aprovada'`:
  - Substituir botão "Confirmar Presença" (código/QR) por botão **"Assistir Aula"**.
  - Botão linka para `video.html?cursoId=<id>&inscricaoId=<id>`.
- Se presença já confirmada hoje (`jaConfirmouHoje`): exibe "✅ Presença registrada" independente da modalidade.
- Para `presencial` e `online`: fluxo de código/QR Code intacto.

### 4. `candidato/video.html`

- Ler `inscricaoId` da URL via `URLSearchParams` (novo parâmetro).
- Ao atingir threshold de 80% de vídeo assistido:
  - Se `modalidade === 'ead'` E `inscricaoId` presente na URL:
    - Chamar `updateDoc(doc(db, 'inscricoes', inscricaoId), { presencas: arrayUnion(hoje) })`.
    - Exibir toast verde: "Presença registrada automaticamente!".
    - Flag local `presencaRegistrada = true` para não disparar mais de uma vez na sessão.
- Lógica de `suspeito` (80% assistido mas < 50% do tempo real na tela) permanece — presença é gravada mas `suspeito: true` fica sinalizado no progresso para revisão pelo instrutor.

### 5. `candidato/manual.html`

- Seção 5 ("Confirmar presença") ganha método C:
  - **C — Curso EAD:** "O vídeo confirma sua presença automaticamente ao atingir 80% assistido. Nenhuma ação necessária."
- Índice atualizado: "Confirmar presença — código, QR Code ou vídeo".

---

## Fluxo EAD (novo)

```
Admin cria curso EAD + videoUrl
        ↓
Candidato se inscreve → Instrutor aprova
        ↓
Card em Meus Cursos exibe botão "Assistir Aula"
        ↓
Candidato assiste video.html?cursoId=X&inscricaoId=Y
        ↓
Ao atingir 80% → presença gravada automaticamente
        ↓
Toast "Presença registrada!" → card atualizado
```

## Fluxo Presencial/Online (inalterado)

```
Admin cria curso presencial ou online
        ↓
Candidato se inscreve → Instrutor aprova
        ↓
Card em Meus Cursos exibe botão "Confirmar Presença"
        ↓
Candidato digita código ou lê QR Code
        ↓
Presença gravada → card atualizado
```

---

## O que NÃO muda

- Telas do instrutor (`presenca.html`, `inscricoes.html`) — sem alteração.
- Telas do admin (exceto `cursos.html`) — sem alteração.
- Lógica de conclusão de curso, certificados, relatórios — sem alteração.
- O campo `videoUrl` continua sendo usado para exibir o vídeo em `video.html` para todos os tipos.
- A lógica de suspeita de fraude em `video.html` permanece.
