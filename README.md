# 📋 Controle de Presença CCB — Site para GitHub Pages

**Versão atualizada (17/10/2026) — Layout e exportações no padrão do PDF de referência.**

Este diretório contém o **site completo, estático e responsivo** do sistema. O visual da página inicial foi criado tomando como referência a tela enviada (formulário à esquerda e prévia à direita). As imagens CCB, clave de sol, clave de fá e lixeira foram incluídas em `assets/`.

## Funcionalidades

- Dados do evento: tipo/nome, local, data e anotações gerais.
- Participantes: nome, comum congregação, cargo/ministério e situação (P, F, FJ, FC).
- Botões das situações com preenchimento completo na cor da borda quando marcados.
- ✅ Presença e Facultativo; ❌ Falta e Falta Justificada — na prévia, WhatsApp, PDF e Word.
- PDF e Word com logo CCB, claves musicais, quadros de contagem, lista, resumo, anotações e bênção, seguindo o modelo fornecido.
- Adicionar, editar e excluir participantes; prévia e contadores automáticos.
- Aviso central confirmando inclusão e edição de participantes.
- PDF em A4 e Word `.docx` gerados **sem depender da internet** depois de o site e os seus arquivos serem carregados. O Word é editável, enquanto os ícones do PDF são elementos gráficos impressos.
- Mensagem formatada para WhatsApp (para enviá-la é necessário acesso à internet).
- Exportar e restaurar uma cópia de segurança no formato `.json` (botões com os textos **Salvar cópia** e **Restaurar cópia**).
- Dados do evento, participantes e formulário parcialmente preenchido preservados quando a página atualiza, fecha ou perde conexão: `localStorage` + uma cópia no `IndexedDB`.
- Service Worker que mantém os arquivos do site disponíveis offline, após a primeira visita com internet.
- **Novo Evento** pergunta antes de apagar os dados atuais deste aparelho.
- Sincronização opcional com API Java 21 + MySQL, hospedada em outro servidor.

## Como publicar no GitHub Pages

1. Crie um repositório no GitHub (ou use um existente).
2. **Extraia o ZIP do frontend e envie seu conteúdo diretamente para a raiz do repositório**: `index.html`, `style.css`, `app.js`, `exports.js`, `sw.js`, `config.js`, `assets/`, `vendor/` e `.nojekyll`.
3. No repositório, entre em **Settings → Pages → Build and deployment → Deploy from a branch → main / (root) → Save**.
4. Espere a publicação e acesse o endereço `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`.
5. Após a primeira visita com conexão, a página poderá ser aberta offline no mesmo aparelho/navegador (cache previamente instalado).

> ⚠️ **Importante:** GitHub Pages hospeda HTML, CSS e JavaScript, mas **não executa Java 21 nem MySQL**. O frontend funciona sozinho, salvando dados no navegador. Para usar MySQL, publique o backend em VPS/servidor Java e configure a seção "Sincronização opcional" dentro do sistema.

## Como usar localmente no Windows

Abra a pasta no VS Code e use Live Server, ou no terminal na pasta `pages`:

```bash
python -m http.server 5500
```

Em seguida, acesse `http://localhost:5500`. Para teste offline completo, use `localhost` ou GitHub Pages em HTTPS; `file://` não permite instalar Service Workers.

## Como conectar ao backend

1. Suba o projeto `backend` em um servidor HTTPS com Java 21 e MySQL.
2. Configure `FRONTEND_ORIGINS` com a **origem** do site, ex.: `https://SEU-USUARIO.github.io` (sem caminho do repositório).
3. Abra `Sincronização opcional com Java 21 + MySQL` no fim da página.
4. Informe URL base da API, usuário e senha definidos no backend. Clique em **Enviar dados ao MySQL**.
5. Depois disso, enquanto a página estiver aberta e autenticada, as alterações podem ser sincronizadas automaticamente. Sem internet, elas continuam locais e serão reenviadas quando a conexão voltar, desde que a autenticação ainda esteja ativa.
6. O botão **Carregar do MySQL** busca este evento pelo ID atual e substitui os dados locais somente após confirmação.

A URL base deve conter o protocolo `https://`, por exemplo `https://api.exemplo.com.br`, **sem** o trecho `/api/eventos`. Em desenvolvimento, `http://localhost:8081` também funciona.

`config.js` permite informar uma URL de API padrão, sem senhas. O usuário e a URL podem ser lembrados no navegador; a senha **não é salva**. Após recarregar, digite-a novamente para sincronizar. Não escreva senhas diretamente em arquivos públicos do GitHub.

## Preservação de dados e cuidados

- Os dados permanecem no mesmo navegador até o usuário selecionar **Novo Evento**, alterar participantes manualmente, restaurar outra cópia ou apagar o armazenamento do navegador.
- Limpar dados do site, usar navegação privada, trocar de navegador ou de aparelho pode remover/impedir acesso aos registros locais. Faça regularmente **Salvar cópia** ou sincronize no MySQL.
- A sincronização é **por evento e por aparelho**, não é uma plataforma multiusuário com resolução automática de conflitos.
- A mensagem do WhatsApp contém os nomes adicionados. Compartilhe somente com os destinatários apropriados.
- O backend deve ser protegido por HTTPS e credenciais fortes; não habilite CORS para todas as origens em produção.

## Estrutura

```text
index.html             Interface principal
style.css              Layout e adaptação mobile
app.js                 Cadastro, edição, armazenamento e sincronização
exports.js             Geradores offline de PDF e Word
config.js              Configuração opcional da URL da API
sw.js                  Cache offline do site
assets/                Imagens fornecidas para identidade visual
vendor/jszip.min.js    Gerador local de pacotes DOCX (JSZip)
.nojekyll              Publicação direta pelo GitHub Pages
```

**Tecnologias:** HTML5, CSS3, JavaScript (frontend), Java 21 + Spring Boot + MySQL (backend opcional).

### Atualização de uma instalação existente

Envie os arquivos do novo ZIP por cima dos antigos na raiz do repositório, mantendo a estrutura `assets/` e `vendor/`. Não é necessário alterar o backend ou o banco MySQL. O nome do cache de aplicativo foi atualizado; se o navegador ainda mostrar a versão antiga, feche e abra a página novamente ou force a atualização com Ctrl+F5. Os registros locais usam as mesmas chaves de armazenamento das versões anteriores, por isso não são apagados ao atualizar os arquivos, desde que o armazenamento do domínio original seja mantido.
