(() => {
  'use strict';
  const STORAGE_KEY = 'ccb_presenca_evento_v2';
  const DB_NAME = 'ccb-presenca-local';
  const DB_STORE = 'registros';
  const $ = (id) => document.getElementById(id);
  const statusTitle = { P: 'Presente', F: 'Falta', FJ: 'Falta justificada', FC: 'Facultativo' };
  const statusMark = { P: '✅', F: '❌', FJ: '❌', FC: '✅' };
  let state = readLocal() || blankState();
  let lastSavedJson = '';
  let db = null;
  let editingId = null;
  let toastTimer;
  let syncTimer;
  let syncInProgress = false;
  let initializedChanges = 0;
  let authReady = false;

  function makeId() {
    if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  }
  function blankState() {
    return { version: 2, id: makeId(), evento: '', local: '', data: '', anotacoes: '', participantes: [], rascunho: { nome:'', comum:'', cargo:'', status:'P', editingId:null }, atualizadoEm: new Date().toISOString() };
  }
  function cleanState(value) {
    if (!value || typeof value !== 'object' || !Array.isArray(value.participantes)) return null;
    return {
      version: 2,
      id: typeof value.id === 'string' && value.id ? value.id : makeId(),
      evento: String(value.evento || '').slice(0, 100),
      local: String(value.local || '').slice(0, 120),
      data: /^\d{4}-\d{2}-\d{2}$/.test(value.data || '') ? value.data : '',
      anotacoes: String(value.anotacoes || '').slice(0, 3000),
      participantes: value.participantes.filter(p => p && typeof p === 'object').slice(0, 5000).map((p) => ({
        id: String(p.id || makeId()), nome: String(p.nome || '').slice(0, 120),
        comum: String(p.comum || '').slice(0, 120), cargo: String(p.cargo || '').slice(0, 120),
        status: statusTitle[p.status] ? p.status : 'P'
      })).filter(p => p.nome.trim()),
      rascunho: {
        nome: String(value.rascunho?.nome || '').slice(0,120),
        comum: String(value.rascunho?.comum || '').slice(0,120),
        cargo: String(value.rascunho?.cargo || '').slice(0,120),
        status: statusTitle[value.rascunho?.status] ? value.rascunho.status : 'P',
        editingId: value.rascunho?.editingId ? String(value.rascunho.editingId) : null
      },
      atualizadoEm: typeof value.atualizadoEm === 'string' ? value.atualizadoEm : new Date().toISOString()
    };
  }
  function readLocal() {
    try { return cleanState(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
    catch { return null; }
  }
  function openDb() {
    if (!('indexedDB' in window)) return Promise.resolve(null);
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          const database = req.result;
          if (!database.objectStoreNames.contains(DB_STORE)) database.createObjectStore(DB_STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch { resolve(null); }
    });
  }
  function getFromDb() {
    return new Promise(resolve => {
      if (!db) return resolve(null);
      try {
        const tx = db.transaction(DB_STORE, 'readonly');
        const req = tx.objectStore(DB_STORE).get('atual');
        req.onsuccess = () => resolve(cleanState(req.result));
        req.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
  }
  function saveToDb(snapshot) {
    if (!db) return;
    try {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(snapshot, 'atual');
      tx.onerror = () => setIndicator('Atenção: falha ao salvar no armazenamento do navegador.', true);
    } catch { /* localStorage ainda guarda os dados */ }
  }
  function setIndicator(message, problem = false) {
    $('save-indicator').textContent = message;
    $('save-indicator').style.color = problem ? '#c33d43' : '#647888';
  }
  function persist() {
    state.atualizadoEm = new Date().toISOString();
    initializedChanges++;
    const json = JSON.stringify(state);
    if (json === lastSavedJson) return;
    lastSavedJson = json;
    let saved = false;
    try { localStorage.setItem(STORAGE_KEY, json); saved = true; }
    catch { /* IndexedDB é uma segunda opção. */ }
    saveToDb(state);
    setIndicator(saved ? '✓ Dados salvos neste dispositivo · mesmo offline' : '⚠ Armazenamento local indisponível; faça uma cópia JSON.', !saved);
    scheduleSync();
  }
  function formToState() {
    for (const field of ['evento', 'local', 'data']) state[field] = $(field).value;
    state.anotacoes = $('anotacoes').value;
    persist();
    render();
  }
  function syncForm() {
    for (const field of ['evento', 'local', 'data']) $(field).value = state[field];
    $('anotacoes').value = state.anotacoes;
  }
  function formatDate(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return '—';
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  }
  function counts() {
    return state.participantes.reduce((o, p) => { if (p.status in o) o[p.status]++; return o; }, { P: 0, F: 0, FJ: 0, FC: 0 });
  }
  function render() {
    $('pv-evento').textContent = state.evento.trim() || 'Não informado';
    $('pv-local').textContent = state.local.trim() || 'Não informado';
    $('pv-data').textContent = formatDate(state.data);
    $('pv-anotacoes').textContent = state.anotacoes.trim() || '—';
    const totals = counts();
    for (const [code, suffix] of [['P','p'],['F','f'],['FJ','fj'],['FC','fc']]) {
      $('count-' + suffix).textContent = totals[code];
      $('total-' + suffix).textContent = totals[code];
    }
    $('total-all').textContent = state.participantes.length;
    $('empty-list').hidden = !!state.participantes.length;
    $('empty-list').style.display = state.participantes.length ? 'none' : 'block';
    const target = $('participants-list');
    target.replaceChildren();
    for (const person of state.participantes) {
      const li = document.createElement('li'); li.className = 'participant-line';
      const mark = document.createElement('span'); mark.className = 'status-mark'; mark.dataset.kind = person.status;
      mark.textContent = statusMark[person.status]; mark.title = statusTitle[person.status];
      const main = document.createElement('span'); main.className = 'participant-main';
      main.append(document.createTextNode(person.nome));
      if (person.cargo || person.comum) {
        main.append(document.createTextNode(' - ' + [person.cargo, person.comum].filter(Boolean).join(' - ')));
      }
      const actions = document.createElement('span'); actions.className = 'participant-actions';
      const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'icon-btn';
      edit.textContent = '✎'; edit.title = 'Editar participante'; edit.setAttribute('aria-label', 'Editar ' + person.nome);
      edit.addEventListener('click', () => editParticipant(person.id));
      const del = document.createElement('button'); del.type = 'button'; del.className = 'icon-btn delete-btn';
      del.title = 'Excluir participante'; del.setAttribute('aria-label', 'Excluir ' + person.nome);
      const trash = document.createElement('img'); trash.src = 'assets/lixeira.png'; trash.alt = '';
      del.append(trash); del.addEventListener('click', () => removeParticipant(person.id));
      actions.append(edit, del); li.append(mark, main, actions); target.append(li);
    }
  }
  function selectedStatus() { return document.querySelector('input[name="status"]:checked')?.value || 'P'; }
  function captureDraft() {
    state.rascunho = {
      nome: $('nome').value, comum: $('comum').value, cargo: $('cargo').value,
      status: selectedStatus(), editingId
    };
    persist();
  }
  function restoreDraft() {
    const draft = state.rascunho || {};
    for (const f of ['nome','comum','cargo']) $(f).value = draft[f] || '';
    const status = statusTitle[draft.status] ? draft.status : 'P';
    document.querySelector(`input[name="status"][value="${status}"]`).checked = true;
    editingId = state.participantes.some(p => p.id === draft.editingId) ? draft.editingId : null;
    $('btn-add').textContent = editingId ? 'Salvar alterações' : 'Adicionar participante';
  }
  function clearParticipant() {
    $('form-participante').reset();
    document.querySelector('input[name="status"][value="P"]').checked = true;
    editingId = null;
    state.rascunho = { nome:'',comum:'',cargo:'',status:'P',editingId:null };
    $('btn-add').textContent = 'Adicionar participante';
  }
  function toast(message, isError = false) {
    clearTimeout(toastTimer);
    $('toast-text').textContent = message;
    $('toast').querySelector('.toast-icon').textContent = isError ? '!' : '✓';
    $('toast').querySelector('.toast-icon').style.color = isError ? '#cb273c' : '#089655';
    $('toast').hidden = false;
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 2600);
  }
  function addParticipant(e) {
    e.preventDefault();
    const nome = $('nome').value.trim().replace(/\s+/g, ' ');
    if (!nome) { $('nome').focus(); toast('Informe o nome do participante.', true); return; }
    const person = {
      id: editingId || makeId(), nome, comum: $('comum').value.trim(),
      cargo: $('cargo').value.trim(), status: selectedStatus()
    };
    const previous = state.participantes.findIndex(p => p.id === editingId);
    if (previous >= 0) state.participantes[previous] = person;
    else state.participantes.push(person);
    const edited = previous >= 0;
    clearParticipant(); persist(); render(); $('nome').focus();
    toast(edited ? 'Participante atualizado com sucesso!' : 'Participante adicionado com sucesso!');
  }
  function editParticipant(id) {
    const person = state.participantes.find(p => p.id === id); if (!person) return;
    editingId = id;
    for (const f of ['nome','comum','cargo']) $(f).value = person[f];
    document.querySelector(`input[name="status"][value="${person.status}"]`).checked = true;
    $('btn-add').textContent = 'Salvar alterações';
    captureDraft();
    $('nome').scrollIntoView({ behavior:'smooth', block:'center' }); $('nome').focus();
  }
  function removeParticipant(id) {
    const person = state.participantes.find(p => p.id === id); if (!person) return;
    if (!window.confirm(`Excluir ${person.nome} da lista de presença?`)) return;
    state.participantes = state.participantes.filter(p => p.id !== id);
    if (editingId === id) clearParticipant();
    persist(); render(); toast('Participante excluído.');
  }
  function createNewEvent() {
    state = blankState(); clearParticipant(); syncForm(); persist(); render();
    $('evento').focus(); toast('Novo evento criado. Formulário limpo.');
  }
  function fileName(extension) {
    const name = (state.evento || 'evento').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 44) || 'evento';
    return `presenca-ccb-${name}-${state.data || 'sem-data'}.${extension}`;
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  function flashAction(id) {
    const button = $(id); button.classList.add('is-activated');
    setTimeout(() => button.classList.remove('is-activated'), 900);
  }
  function backup() {
    download(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json;charset=utf-8' }), fileName('json'));
    toast('Cópia de segurança gerada!');
  }
  async function restoreBackup(file) {
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error('Cópia JSON muito grande (máximo 2 MB).');
      const imported = cleanState(JSON.parse(await file.text()));
      if (!imported) throw new Error('O arquivo não é uma cópia válida do Controle de Presença CCB.');
      if (!window.confirm('Restaurar esta cópia? O evento atual deste aparelho será substituído.')) return;
      state = imported; restoreDraft(); syncForm(); persist(); render();
      toast('Cópia de segurança restaurada com sucesso!');
    } catch (err) { toast(err.message || 'Erro ao abrir o arquivo.', true); }
    finally { $('import-file').value = ''; }
  }
  function makeMessage() {
    const c = counts();
    const rows = state.participantes.map((p, i) => `${i+1}. ${statusMark[p.status]} ${p.nome}${p.cargo ? ' - ' + p.cargo : ''}${p.comum ? ' - ' + p.comum : ''} (${statusTitle[p.status]})`);
    return [
      '*LISTA DE PRESENÇA CCB*',
      `*Evento:* ${state.evento || 'Não informado'}`,
      `*Local do Evento:* ${state.local || 'Não informado'}`,
      `*Data:* ${formatDate(state.data)}`,
      '', `*Presentes:* ${c.P}  |  *Faltantes:* ${c.F}`,
      `*Falta Justificada:* ${c.FJ}  |  *Facultativo:* ${c.FC}`,
      `*Total:* ${state.participantes.length}`, '',
      ...rows, '', `*Anotações Gerais:* ${state.anotacoes || '—'}`, '', 'Deus Abençoe a todos!'
    ].join('\n');
  }
  async function shareWhatsApp() {
    const message = makeMessage();
    const link = 'https://wa.me/?text=' + encodeURIComponent(message);
    if (link.length > 7000) {
      try { await navigator.clipboard.writeText(message); toast('Lista longa: mensagem copiada. Cole no WhatsApp.'); }
      catch { toast('A lista é longa. Use PDF ou Word para compartilhar.', true); }
      window.open('https://web.whatsapp.com/', '_blank', 'noopener,noreferrer');
    } else {
      window.open(link, '_blank', 'noopener,noreferrer');
      toast('Mensagem preparada para o WhatsApp.');
    }
  }
  function getApiBase() { return $('api-url').value.trim().replace(/\/+$/, ''); }
  function credentials() {
    const user = $('api-user').value.trim(), password = $('api-password').value;
    if (!user || !password) return null;
    return 'Basic ' + btoa(unescape(encodeURIComponent(user + ':' + password)));
  }
  function syncStatus(text, isError = false) {
    $('sync-feedback').textContent = text;
    $('sync-feedback').style.color = isError ? '#bf3344' : '#37745e';
  }
  function scheduleSync() {
    clearTimeout(syncTimer);
    if (authReady && getApiBase() && credentials() && navigator.onLine) {
      syncTimer = setTimeout(() => sendToCloud(false), 2200);
    }
  }
  async function requestCloud(method, body) {
    const base = getApiBase();
    if (!/^https:\/\//i.test(base) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(base)) {
      throw new Error('Informe uma URL HTTPS válida do backend (ou HTTP somente em localhost).');
    }
    const authorization = credentials();
    if (!authorization) throw new Error('Informe o usuário e a senha do backend.');
    const request = { method, headers: { Authorization: authorization, Accept: 'application/json' } };
    if (body !== undefined) {
      request.headers['Content-Type'] = 'application/json'; request.body = JSON.stringify(body);
    }
    const response = await fetch(base + '/api/eventos/' + encodeURIComponent(state.id), request);
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new Error('Acesso negado. Confira usuário, senha e CORS.');
      if (response.status === 404) throw new Error('Este evento ainda não existe no MySQL. Primeiro envie seus dados.');
      throw new Error('Erro do servidor: HTTP ' + response.status);
    }
    return response.json();
  }
  async function sendToCloud(showToast = true) {
    if (syncInProgress) return;
    syncInProgress = true; $('btn-sync').disabled = true;
    try {
      const revision = state.atualizadoEm;
      if (!navigator.onLine) throw new Error('Sem internet. Seus dados continuam salvos neste dispositivo.');
      await requestCloud('PUT', state);
      authReady = true;
      syncStatus('✓ Evento sincronizado com o MySQL.');
      if (showToast) toast('Dados enviados ao MySQL com sucesso!');
      if (state.atualizadoEm !== revision) scheduleSync();
    } catch (e) { syncStatus(e.message + ' Os dados locais foram preservados.', true); if (showToast) toast(e.message, true); }
    finally { syncInProgress = false; $('btn-sync').disabled = false; }
  }
  async function loadFromCloud() {
    if (!window.confirm('Carregar o evento do servidor? Os dados locais deste evento serão substituídos. Faça um backup JSON antes, se necessário.')) return;
    try {
      const cloud = await requestCloud('GET');
      const next = cleanState(cloud);
      if (!next) throw new Error('Resposta do servidor inválida.');
      state = next; restoreDraft(); syncForm(); persist(); render();
      authReady = true;
      syncStatus('✓ Evento carregado do MySQL e salvo neste dispositivo.');
      toast('Evento carregado com sucesso!');
    } catch(e) { syncStatus(e.message, true); toast(e.message, true); }
  }
  async function initializePersistence() {
    const changedOnStartup = initializedChanges;
    db = await openDb();
    const recovered = await getFromDb();
    const latestLocal = readLocal();
    if (initializedChanges === changedOnStartup && recovered && (!latestLocal || (recovered.atualizadoEm || '') > (latestLocal.atualizadoEm || ''))) {
      state = recovered; syncForm(); restoreDraft(); render();
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* continue */ }
    } else if (latestLocal) {
      saveToDb(latestLocal);
    } else {
      persist();
    }
  }
  for (const field of ['evento', 'local', 'data', 'anotacoes']) $(field).addEventListener('input', formToState);
  $('form-participante').addEventListener('submit', addParticipant);
  $('btn-clear').addEventListener('click', () => { clearParticipant(); persist(); $('nome').focus(); });
  for (const field of ['nome','comum','cargo']) $(field).addEventListener('input', captureDraft);
  document.querySelectorAll('input[name="status"]').forEach(input => input.addEventListener('change', captureDraft));
  $('btn-novo-evento').addEventListener('click', () => {
    if (typeof $('new-event-dialog').showModal === 'function') {
      $('new-event-dialog').returnValue = '';
      $('new-event-dialog').showModal();
    }
    else if (window.confirm('Criar novo evento e apagar os dados locais atuais?')) createNewEvent();
  });
  $('new-event-dialog').addEventListener('close', () => { if ($('new-event-dialog').returnValue === 'confirm') createNewEvent(); });
  $('btn-backup').addEventListener('click', () => { flashAction('btn-backup'); backup(); });
  $('btn-import').addEventListener('click', () => { flashAction('btn-import'); $('import-file').click(); });
  $('import-file').addEventListener('change', e => restoreBackup(e.target.files?.[0]));
  $('btn-whatsapp').addEventListener('click', shareWhatsApp);
  $('btn-pdf').addEventListener('click', async () => {
    $('btn-pdf').disabled = true;
    try { download(await CCBExports.createPdf(state), fileName('pdf')); toast('PDF gerado com sucesso!'); }
    catch(e) { toast('Não foi possível gerar o PDF: ' + e.message, true); }
    finally { $('btn-pdf').disabled = false; }
  });
  $('btn-word').addEventListener('click', async () => {
    $('btn-word').disabled = true;
    try { download(await CCBExports.createDocx(state), fileName('docx')); toast('Arquivo Word gerado com sucesso!'); }
    catch(e) { toast('Não foi possível gerar o Word: ' + e.message, true); }
    finally { $('btn-word').disabled = false; }
  });
  $('btn-sync').addEventListener('click', () => sendToCloud(true));
  $('btn-load-cloud').addEventListener('click', loadFromCloud);
  try {
    $('api-url').value = localStorage.getItem('ccb_api_url') || window.CCB_CONFIG?.apiBaseUrl || '';
    $('api-user').value = localStorage.getItem('ccb_api_user') || '';
  } catch { $('api-url').value = window.CCB_CONFIG?.apiBaseUrl || ''; }
  for (const f of ['api-url','api-user']) $(f).addEventListener('change', () => {
    try { localStorage.setItem('ccb_api_url', $('api-url').value.trim()); localStorage.setItem('ccb_api_user', $('api-user').value.trim()); } catch {}
  });
  window.addEventListener('online', () => { if (authReady) scheduleSync(); else setIndicator('✓ Conexão restaurada · dados locais preservados'); });
  window.addEventListener('offline', () => setIndicator('● Offline · dados salvos neste dispositivo'));
  syncForm(); restoreDraft(); render(); initializePersistence();
  if (!navigator.onLine) setIndicator('● Offline · dados salvos neste dispositivo');
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
})();
