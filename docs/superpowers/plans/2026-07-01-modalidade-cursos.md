# Modalidade de Cursos e Presença Automática EAD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar campo `modalidade` (presencial / ead / online) aos cursos, e confirmar presença automaticamente quando aluno assistir 80% do vídeo em cursos EAD.

**Architecture:** O campo `modalidade` no Firestore determina o mecanismo de presença. Cursos EAD têm presença gravada diretamente em `video.html` ao atingir o threshold de 80%, via `arrayUnion` no documento de inscrição. Cursos presencial/online mantêm o fluxo existente de código/QR.

**Tech Stack:** HTML, JavaScript ES Modules, Firebase Firestore (SDK 12.14.0), YouTube IFrame API.

## Global Constraints

- Firebase SDK versão `12.14.0` em todos os imports (`https://www.gstatic.com/firebasejs/12.14.0/...`)
- Cursos sem campo `modalidade` devem ser tratados como `'presencial'` (nenhuma migração necessária)
- Campo `videoUrl` em cursos EAD é obrigatório; nos outros tipos é opcional
- Após editar qualquer arquivo em `candidato/`, `instrutor/` ou `admin/`, copiar para `public/` com o mesmo caminho relativo
- Não usar `git add .` — adicionar arquivos específicos

---

## File Map

| Arquivo | O que muda |
|---|---|
| `admin/cursos.html` | Select `modalidade` no form + validação EAD + badge na tabela |
| `candidato/catalogo.html` | Badge de modalidade nos cards |
| `candidato/meus-cursos.html` | Ocultar botão código/QR para EAD aprovado |
| `candidato/video.html` | Auto-confirmar presença em EAD ao atingir 80% |
| `candidato/manual.html` | Adicionar opção C (EAD) na seção de presença |

---

### Task 1: Admin — campo modalidade no formulário de cursos

**Files:**
- Modify: `admin/cursos.html`

**Interfaces:**
- Produces: campo `modalidade` salvo em `cursos/{id}` no Firestore com valores `'presencial' | 'ead' | 'online'`

- [ ] **Step 1: Adicionar campo `modalidade` no HTML do formulário**

Localizar o bloco do campo `URL do Vídeo` (linha ~403) e inserir ANTES dele:

```html
<div class="form-group">
    <label>Modalidade *</label>
    <select id="cursoModalidade" required>
        <option value="presencial">Presencial</option>
        <option value="ead">EAD (Vídeo)</option>
        <option value="online">Online ao vivo</option>
    </select>
</div>

<div class="form-group" id="videoUrlGroup">
    <label id="videoUrlLabel">URL do Vídeo (YouTube)</label>
    <input type="url" id="cursoVideoUrl" placeholder="https://www.youtube.com/watch?v=...">
</div>
```

Remover o bloco antigo do campo `URL do Vídeo` (que não tinha o `id="videoUrlGroup"`).

- [ ] **Step 2: Adicionar JS que torna videoUrl obrigatório para EAD**

Após a linha `searchInput.addEventListener('input', filtrarCursos);` (ou qualquer ponto após o DOM estar pronto), adicionar:

```javascript
document.getElementById('cursoModalidade').addEventListener('change', (e) => {
    const isEad = e.target.value === 'ead';
    const input = document.getElementById('cursoVideoUrl');
    const label = document.getElementById('videoUrlLabel');
    input.required = isEad;
    label.textContent = isEad ? 'URL do Vídeo (YouTube) *' : 'URL do Vídeo (YouTube)';
});
```

- [ ] **Step 3: Incluir `modalidade` no payload de `salvarCurso()`**

Localizar a função `salvarCurso()`. Após a linha que lê `videoUrl`:
```javascript
const videoUrl = document.getElementById('cursoVideoUrl').value.trim() || null;
```
Adicionar logo abaixo:
```javascript
const modalidade = document.getElementById('cursoModalidade').value;
```

Validação extra para EAD (adicionar dentro do bloco de validação existente, após a checagem de campos obrigatórios):
```javascript
if (modalidade === 'ead' && !videoUrl) {
    showError('Cursos EAD precisam de uma URL de vídeo do YouTube.');
    return;
}
```

No objeto `payload`, adicionar:
```javascript
modalidade,
```

- [ ] **Step 4: Carregar `modalidade` ao editar curso**

Na função que popula o modal de edição, após a linha:
```javascript
document.getElementById('cursoVideoUrl').value = curso.videoUrl || '';
```
Adicionar:
```javascript
const modalidade = curso.modalidade || 'presencial';
document.getElementById('cursoModalidade').value = modalidade;
// Atualizar label e required conforme modalidade carregada
const isEad = modalidade === 'ead';
document.getElementById('cursoVideoUrl').required = isEad;
document.getElementById('videoUrlLabel').textContent = isEad
    ? 'URL do Vídeo (YouTube) *'
    : 'URL do Vídeo (YouTube)';
```

- [ ] **Step 5: Adicionar badge de modalidade na tabela de cursos**

Localizar o template da tabela (linha ~523). Na linha do título do curso:
```javascript
<td><strong>${c.titulo}</strong></td>
```
Substituir por:
```javascript
<td>
    <strong>${c.titulo}</strong>
    <span style="display:inline-block;font-size:10px;font-weight:700;padding:1px 6px;border-radius:999px;margin-left:6px;
        ${(c.modalidade||'presencial')==='ead'
            ? 'background:rgba(239,68,68,0.12);color:#ef4444'
            : (c.modalidade)==='online'
            ? 'background:rgba(59,130,246,0.12);color:#3b82f6'
            : 'background:rgba(100,116,139,0.12);color:#94a3b8'}">
        ${{presencial:'Presencial',ead:'EAD',online:'Online'}[c.modalidade||'presencial']}
    </span>
</td>
```

- [ ] **Step 6: Copiar para public/ e verificar no browser**

```bash
Copy-Item "admin/cursos.html" "public/admin/cursos.html" -Force
```

Abrir admin → Cursos → Novo Curso. Verificar:
- Select "Modalidade" aparece com 3 opções
- Ao selecionar EAD, campo vídeo exige preenchimento
- Ao salvar, curso aparece na tabela com badge "EAD" / "Presencial" / "Online"
- Ao editar um curso EAD, modalidade carrega corretamente

- [ ] **Step 7: Commit**

```bash
git add admin/cursos.html public/admin/cursos.html
git commit -m "feat: campo modalidade no formulário de cursos (presencial/ead/online)"
```

---

### Task 2: Catálogo — badge de modalidade nos cards

**Files:**
- Modify: `candidato/catalogo.html`

**Interfaces:**
- Consumes: `curso.modalidade` do Firestore (pode ser undefined → tratar como 'presencial')
- Produces: badge visual nos cards do catálogo

- [ ] **Step 1: Substituir badge-video pelo badge de modalidade**

Localizar a linha (linha ~242):
```javascript
${curso.videoUrl ? `<span class="badge-video">...</span>` : ''}
```

Substituir por:
```javascript
${(() => {
    const mod = curso.modalidade || 'presencial';
    const cfg = {
        presencial: { icon: '📍', label: 'Presencial', bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
        ead:        { icon: '🎬', label: 'EAD',        bg: 'rgba(239,68,68,0.12)',   color: '#ef4444' },
        online:     { icon: '💻', label: 'Online',     bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6' }
    }[mod];
    return `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;background:${cfg.bg};color:${cfg.color}">${cfg.icon} ${cfg.label}</span>`;
})()}
${encerrado ? '<span class="badge-encerrado">Encerrado</span>' : ''}
```

- [ ] **Step 2: Copiar para public/ e verificar**

```bash
Copy-Item "candidato/catalogo.html" "public/candidato/catalogo.html" -Force
```

Abrir Catálogo e conferir badges nos cards. Cursos sem campo `modalidade` devem mostrar "📍 Presencial".

- [ ] **Step 3: Commit**

```bash
git add candidato/catalogo.html public/candidato/catalogo.html
git commit -m "feat: badge de modalidade nos cards do catálogo"
```

---

### Task 3: Meus Cursos — ocultar botão código/QR para cursos EAD

**Files:**
- Modify: `candidato/meus-cursos.html`

**Interfaces:**
- Consumes: `curso.modalidade` via `inscricao.curso.modalidade`
- Produces: cursos EAD aprovados não mostram botão de código/QR; mostram "✅ Presença Registrada" se já confirmada

- [ ] **Step 1: Modificar lógica do botão de presença**

Localizar o bloco (linhas ~259–268):
```javascript
let presencaHTML = '';
if (inscricao.status === 'aprovada') {
    presencaHTML = jaConfirmouHoje
        ? `<button class="btn-inscrever btn-inscrito" disabled ...>✓ Presença Confirmada Hoje</button>`
        : `<button class="btn-inscrever" ...onclick="abrirModalPresenca(...)">Confirmar Presença</button>`;
}
```

Substituir por:
```javascript
let presencaHTML = '';
if (inscricao.status === 'aprovada') {
    const isEad = (curso.modalidade || 'presencial') === 'ead';
    if (jaConfirmouHoje) {
        presencaHTML = `<button class="btn-inscrever btn-inscrito" disabled style="margin-top:0.75rem;">
            ✓ Presença Confirmada Hoje
        </button>`;
    } else if (!isEad) {
        presencaHTML = `<button class="btn-inscrever" style="margin-top:0.75rem;"
            onclick="abrirModalPresenca('${inscricao.id}', '${curso.titulo.replace(/'/g, "\\'")}')">
            Confirmar Presença
        </button>`;
    }
    // EAD sem presença: não mostra botão código — aluno confirma assistindo o vídeo
}
```

- [ ] **Step 2: Copiar para public/ e verificar**

```bash
Copy-Item "candidato/meus-cursos.html" "public/candidato/meus-cursos.html" -Force
```

Verificar no browser:
- Curso EAD aprovado sem presença hoje: não aparece botão "Confirmar Presença" nem modal
- Curso EAD aprovado com presença hoje: aparece "✓ Presença Confirmada Hoje"
- Curso Presencial aprovado: botão "Confirmar Presença" aparece normalmente

- [ ] **Step 3: Commit**

```bash
git add candidato/meus-cursos.html public/candidato/meus-cursos.html
git commit -m "feat: ocultar botão código/QR para cursos EAD em Meus Cursos"
```

---

### Task 4: video.html — auto-confirmar presença ao atingir 80% em EAD

**Files:**
- Modify: `candidato/video.html`

**Interfaces:**
- Consumes: `inscricaoId` (URL param — já existe), `curso.modalidade` (lido do Firestore)
- Produces: grava `hoje` em `inscricoes/{inscricaoId}.presencas` via `arrayUnion` quando EAD + 80%

- [ ] **Step 1: Adicionar `arrayUnion` ao import do Firestore**

Localizar (linha ~189):
```javascript
import {
    doc, getDoc, updateDoc, serverTimestamp
```
Substituir por:
```javascript
import {
    doc, getDoc, updateDoc, serverTimestamp, arrayUnion
```

- [ ] **Step 2: Adicionar variável `modalidadeCurso` e flag `presencaEadRegistrada`**

Após a linha `let jaConcluido = false;` (linha ~205), adicionar:
```javascript
let modalidadeCurso = 'presencial'; // lido do curso ao renderizar
let presencaEadRegistrada = false;  // evita gravar mais de uma vez na sessão
```

- [ ] **Step 3: Carregar `modalidade` na função `renderPagina`**

Localizar a função `renderPagina(curso)`. No início do corpo da função, após a linha que usa `curso`, adicionar:
```javascript
modalidadeCurso = curso.modalidade || 'presencial';
```

- [ ] **Step 4: Adicionar função `showToastVideo`**

Antes de `salvarProgresso`, adicionar:
```javascript
function showToastVideo(msg, cor = '#22c55e') {
    let t = document.getElementById('videoToast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'videoToast';
        t.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);padding:0.75rem 1.5rem;border-radius:10px;font-size:14px;font-weight:600;color:#fff;opacity:0;transition:opacity 0.3s;z-index:9999;pointer-events:none;';
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.background = cor;
    t.style.opacity = '1';
    setTimeout(() => { t.style.opacity = '0'; }, 3500);
}
```

- [ ] **Step 5: Disparar auto-confirmação de presença em `salvarProgresso`**

Localizar o bloco (linha ~279):
```javascript
if (concluido && !jaConcluido) {
    jaConcluido = true;
    mostrarBadgeConcluido();
}
```

Substituir por:
```javascript
if (concluido && !jaConcluido) {
    jaConcluido = true;
    mostrarBadgeConcluido();

    if (modalidadeCurso === 'ead' && inscricaoId && !presencaEadRegistrada) {
        presencaEadRegistrada = true;
        const hoje = new Date().toISOString().split('T')[0];
        try {
            await updateDoc(doc(db, 'inscricoes', inscricaoId), {
                presencas: arrayUnion(hoje)
            });
            showToastVideo('✓ Presença registrada automaticamente!');
        } catch (e) {
            console.warn('[video] erro ao registrar presença EAD:', e);
        }
    }
}
```

- [ ] **Step 6: Copiar para public/ e verificar**

```bash
Copy-Item "candidato/video.html" "public/candidato/video.html" -Force
```

Testar com um curso EAD (com inscrição aprovada):
- Abrir `video.html?cursoId=X&inscricaoId=Y`
- Avançar o vídeo para além de 80%
- Verificar toast verde "✓ Presença registrada automaticamente!" aparece
- Verificar no Firestore: `inscricoes/{Y}.presencas` contém a data de hoje
- Voltar a Meus Cursos: deve mostrar "✓ Presença Confirmada Hoje"

- [ ] **Step 7: Commit**

```bash
git add candidato/video.html public/candidato/video.html
git commit -m "feat: auto-confirmação de presença EAD ao atingir 80% do vídeo"
```

---

### Task 5: Manual — atualizar seção de confirmação de presença

**Files:**
- Modify: `candidato/manual.html`

**Interfaces:**
- Produces: seção 5 do manual documenta os 3 métodos (código, QR, EAD automático)

- [ ] **Step 1: Atualizar entrada no índice**

Localizar:
```html
<li><a href="#sec5">Confirmar presença — código ou QR Code</a></li>
```
Substituir por:
```html
<li><a href="#sec5">Confirmar presença — código, QR Code ou vídeo (EAD)</a></li>
```

- [ ] **Step 2: Atualizar título da seção 5**

Localizar:
```html
<h2>Confirmar presença no curso</h2>
```
Substituir por:
```html
<h2>Confirmar presença no curso</h2>
```
(título mantém, o conteúdo muda)

- [ ] **Step 3: Adicionar método C no passo 2 da seção 5**

Localizar o bloco dos métodos A e B (`.method-opt` com badges). Após o bloco do método B, adicionar:
```html
<div class="method-opt">
    <span class="method-badge" style="background:rgba(239,68,68,0.12);color:#ef4444;margin-top:2px;flex-shrink:0;font-size:10px;font-weight:800;padding:0.2rem 0.5rem;border-radius:6px;white-space:nowrap;">C</span>
    <div class="method-body">
        <div class="method-title">Curso EAD — automático</div>
        <div class="method-desc">Em cursos EAD, não é necessário nenhuma ação. Ao assistir <strong>80% do vídeo</strong>, a presença é registrada automaticamente. Um aviso verde confirma na tela.</div>
    </div>
</div>
```

- [ ] **Step 4: Copiar para public/ e verificar**

```bash
Copy-Item "candidato/manual.html" "public/candidato/manual.html" -Force
```

Abrir o manual e conferir seção 5 com os 3 métodos A, B e C.

- [ ] **Step 5: Commit**

```bash
git add candidato/manual.html public/candidato/manual.html
git commit -m "docs: atualizar manual com método EAD de confirmação de presença"
```
