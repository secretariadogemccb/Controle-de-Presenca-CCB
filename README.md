# Controle de Presença CCB — GitHub Pages

Versão atualizada: painel de sincronização com Java 21 e MySQL **removido por solicitação**.

## Publicação

1. Extraia **todo o conteúdo deste ZIP** na raiz do seu repositório GitHub (arquivo `index.html` deve ficar na raiz).
2. GitHub → repositório → **Settings → Pages** → **Deploy from a branch** → `main` / `(root)`.
3. Aguarde a publicação. Use **Ctrl + F5** se o navegador mostrar a versão antiga, e confira se o Service Worker atualizado assumiu o controle.
4. Os arquivos `config.js` e a antiga área de sincronização não são mais utilizados. Se o `config.js` antigo ainda existir no seu repositório, pode apagá-lo.

## Recursos mantidos

- Formulário de evento e participante (nome, congregação, cargo/ministério, situação P/F/FJ/FC).
- Botão de situação selecionado completamente preenchido com a cor da borda.
- ✅ Presença e Facultativo; ❌ Falta e Falta Justificada.
- Prévia em tempo real, totais, edição/exclusão e mensagem central de confirmação.
- Exportação em PDF e Word (.docx), seguindo o modelo enviado; mensagem WhatsApp.
- **Salvar cópia** e **Restaurar cópia** (arquivo JSON, sem extensão exibida no botão).
- Dados armazenados automaticamente em `localStorage` e `IndexedDB`, inclusive rascunhos.
- `sw.js` instala os recursos para uso offline após o carregamento inicial.
- Botão **Novo Evento** solicita confirmação antes de apagar os dados salvos.
- Interface responsiva para celular e desktop.

**Atenção:** os registros ficam no navegador e podem ser perdidos se o usuário apagar os dados do site, usar navegação privada ou trocar de dispositivo. Salve cópias regularmente. A remoção da interface significa que **esta versão do frontend não envia nem carrega dados do MySQL**. O GitHub Pages não executa Java ou MySQL.

## Estrutura

```text
index.html             Tela principal
style.css              Visual e responsividade
app.js                 Participantes, prévia e armazenamento local
exports.js             Exportação offline em PDF e Word
sw.js                  Cache para uso offline
assets/                Logotipos, símbolos e ícones
vendor/jszip.min.js    Biblioteca local para arquivos DOCX
.nojekyll              Publicação no GitHub Pages
```

## Atualização sem perder os registros

Mantenha o **mesmo endereço/site GitHub Pages e navegador**. As chaves de armazenamento local usadas pela versão anterior não foram alteradas. Substitua os arquivos do site, sem acionar o botão “Novo Evento”. Se possível, clique **Salvar cópia** antes da atualização.
