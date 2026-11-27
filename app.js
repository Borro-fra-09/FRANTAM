/* =========================================================
   FantaMultiple - Applicazione
   ========================================================= */
(() => {
  'use strict';

  const TEAM_COLORS = ['#ff5a36', '#4aa8ff', '#2ecc8f', '#ffb020', '#b46bff', '#ff6fb5', '#22c7d6', '#e6e65c'];

  const state = { teams: [], athletes: [], competitions: [] };
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const app = $('#app');

  /* ---------------- Utility ---------------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmtPts = n => Number(n || 0).toLocaleString('it-IT');
  const fullName = a => a ? `${a.firstName} ${a.lastName}` : 'Atleta eliminato';
  const initials = s => s.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  const catName = (g, c) => SCORING.CATEGORIES[g]?.[c]?.name || c;
  const genderTag = g => g === 'F' ? '<span class="tag f">♀ Femmina</span>' : '<span class="tag m">♂ Maschio</span>';
  const teamById = id => state.teams.find(t => t.id === id);
  const athleteById = id => state.athletes.find(a => a.id === id);
  const isAdmin = () => DB.isAdmin();

  function toast(msg, type = 'ok') {
    const t = $('#toast');
    t.textContent = msg; t.className = 'toast ' + type; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 2600);
  }

  async function loadAll() {
    const [teams, athletes, competitions] = await Promise.all([
      DB.getAll('teams'), DB.getAll('athletes'), DB.getAll('competitions')
    ]);
    Object.assign(state, { teams, athletes, competitions });
  }

  /* ---------------- Punteggi e classifiche ---------------- */
  function compName(c) {
    const ath = athleteById(c.athleteId);
    const opt = SCORING.competitionByKey(c.gender || ath?.gender || 'M', c.eventKey);
    return opt ? opt.name : c.eventKey;
  }

  /**
   * Punteggio di un atleta
   * criterion: 'sum' = somma punti di tutte le gare | 'best' = miglior gara
   * eventKey : filtra per tipo di gara ('' = tutte)
   */
  function athleteScore(athleteId, criterion = 'sum', eventKey = '') {
    const list = state.competitions.filter(c => c.athleteId === athleteId && (!eventKey || c.eventKey === eventKey));
    if (!list.length) return { score: 0, count: 0, best: null };
    const best = list.reduce((b, c) => (!b || c.total > b.total ? c : b), null);
    const score = criterion === 'best' ? best.total : list.reduce((s, c) => s + c.total, 0);
    return { score, count: list.length, best };
  }

  function athleteRanking({ gender = '', category = '', criterion = 'sum', eventKey = '' } = {}) {
    return state.athletes
      .filter(a => (!gender || a.gender === gender) && (!category || a.category === category))
      .map(a => ({ athlete: a, ...athleteScore(a.id, criterion, eventKey) }))
      .filter(r => r.count > 0 || !eventKey)
      .sort((x, y) => y.score - x.score || fullName(x.athlete).localeCompare(fullName(y.athlete)));
  }

  function teamRanking({ gender = '', category = '', criterion = 'sum', eventKey = '' } = {}) {
    return state.teams.map(t => {
      const members = state.athletes.filter(a => a.teamId === t.id && (!gender || a.gender === gender) && (!category || a.category === category));
      const scores = members.map(a => athleteScore(a.id, criterion, eventKey));
      return {
        team: t,
        members: members.length,
        races: scores.reduce((s, x) => s + x.count, 0),
        score: scores.reduce((s, x) => s + x.score, 0)
      };
    }).sort((x, y) => y.score - x.score || x.team.name.localeCompare(y.team.name));
  }

  /* ---------------- Router ---------------- */
  const routes = { home: viewHome, squadre: viewTeams, atleti: viewAthletes, gare: viewCompetitions, classifica: viewRanking };

  function parseHash() {
    const [path, qs] = location.hash.replace(/^#/, '').split('?');
    return { route: routes[path] ? path : 'home', params: Object.fromEntries(new URLSearchParams(qs || '')) };
  }

  function render() {
    const { route, params } = parseHash();
    $$('.nav a').forEach(a => a.classList.toggle('active', a.dataset.route === route));
    $('#nav').classList.remove('open');
    document.body.classList.toggle('is-admin', isAdmin());
    const btn = $('#adminBtn');
    btn.classList.toggle('on', isAdmin());
    btn.textContent = isAdmin() ? '🔓 Esci admin' : '🔒 Admin';
    app.innerHTML = routes[route](params);
    bindView(route, params);
    window.scrollTo({ top: 0 });
  }

  const lockNote = '<span class="lock-note">🔒 Accedi come amministratore per aggiungere</span>';
  const emptyBox = (icon, text) => `<div class="empty"><span class="big">${icon}</span>${text}</div>`;

  /* ---------------- HOME ---------------- */
  function viewHome() {
    const topA = athleteRanking().find(r => r.score > 0);
    const topT = teamRanking().find(r => r.score > 0);
    const last = [...state.competitions].sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

    return `
      <section class="hero">
        <h1>Fanta<span>Multiple</span></h1>
        <p>Squadre, atleti, gare e classifiche delle prove multiple. Ogni prestazione è convertita in punti con le tabelle ufficiali World Athletics.</p>
      </section>

      <div class="grid grid-4">
        <div class="card stat"><span class="icon">🏃</span><div class="label">Atleti</div><div class="value">${state.athletes.length}</div>
          <div class="small muted">♂ ${state.athletes.filter(a => a.gender === 'M').length} · ♀ ${state.athletes.filter(a => a.gender === 'F').length}</div></div>
        <div class="card stat"><span class="icon">🛡️</span><div class="label">Squadre</div><div class="value">${state.teams.length}</div></div>
        <div class="card stat"><span class="icon">🏁</span><div class="label">Gare inserite</div><div class="value">${state.competitions.length}</div></div>
        <div class="card stat"><span class="icon">⚡</span><div class="label">Punti totali</div><div class="value">${fmtPts(state.competitions.reduce((s, c) => s + c.total, 0))}</div></div>
      </div>

      <h2 class="section-title">In testa alla classifica</h2>
      <div class="grid grid-2">
        <div class="card podium-card">
          <div class="medal">🥇</div>
          <div>
            <div class="small muted">Primo atleta</div>
            ${topA ? `<div class="who">${esc(fullName(topA.athlete))}</div>
              <div class="pts">${fmtPts(topA.score)} punti · ${topA.count} gar${topA.count === 1 ? 'a' : 'e'}</div>
              <div class="small muted">${esc(teamById(topA.athlete.teamId)?.name || 'Senza squadra')}</div>`
              : '<div class="who muted">Nessun dato</div>'}
          </div>
        </div>
        <div class="card podium-card">
          <div class="medal">🏆</div>
          <div>
            <div class="small muted">Prima squadra</div>
            ${topT ? `<div class="who">${esc(topT.team.name)}</div>
              <div class="pts">${fmtPts(topT.score)} punti · ${topT.members} atlet${topT.members === 1 ? 'a' : 'i'}</div>`
              : '<div class="who muted">Nessun dato</div>'}
          </div>
        </div>
      </div>

      <h2 class="section-title">Ultime gare</h2>
      ${last.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Data</th><th>Atleta</th><th>Gara</th><th>Luogo</th><th class="num">Punti</th></tr></thead>
        <tbody>${last.map(c => `<tr>
          <td>${fmtDate(c.date)}</td><td>${esc(fullName(athleteById(c.athleteId)))}</td>
          <td>${esc(compName(c))}</td><td class="muted">${esc(c.location || '—')}</td>
          <td class="pts">${fmtPts(c.total)}</td></tr>`).join('')}</tbody></table></div>`
        : emptyBox('🏁', 'Ancora nessuna gara inserita.')}
    `;
  }

  /* ---------------- SQUADRE ---------------- */
  function viewTeams() {
    const ranking = teamRanking();
    return `
      <div class="page-head">
        <div><h1>Squadre</h1><p>${state.teams.length} squadr${state.teams.length === 1 ? 'a' : 'e'} registrat${state.teams.length === 1 ? 'a' : 'e'}</p></div>
        <div>${lockNote}<button class="btn admin-only" data-action="add-team">＋ Nuova squadra</button></div>
      </div>
      <div class="toolbar"><input class="grow" id="teamSearch" placeholder="🔍 Cerca squadra o città..."></div>
      ${ranking.length ? `<div class="grid grid-auto" id="teamGrid">${ranking.map(r => {
        const t = r.team;
        return `<div class="card item" data-search="${esc((t.name + ' ' + (t.city || '')).toLowerCase())}">
          <div class="item-head">
            <div class="avatar" style="background:${esc(t.color || TEAM_COLORS[0])}">${esc(initials(t.name))}</div>
            <div><div class="item-title">${esc(t.name)}</div><div class="small muted">${esc(t.city || '—')}</div></div>
          </div>
          <div class="item-meta"><span class="tag">👥 ${r.members} atleti</span><span class="tag">🏁 ${r.races} gare</span><span class="tag gold">⚡ ${fmtPts(r.score)} pt</span></div>
          <div class="item-foot">
            <a class="btn btn-ghost btn-sm" href="#atleti?squadra=${t.id}">Vedi atleti</a>
            <span class="admin-only">
              <button class="btn btn-ghost btn-sm" data-action="edit-team" data-id="${t.id}">✎</button>
              <button class="btn btn-danger btn-sm" data-action="del-team" data-id="${t.id}">🗑</button>
            </span>
          </div>
        </div>`;
      }).join('')}</div>` : emptyBox('🛡️', 'Nessuna squadra inserita.')}
    `;
  }

  /* ---------------- ATLETI ---------------- */
  function viewAthletes(params) {
    const catOptions = Object.entries(SCORING.CATEGORIES.M).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('');
    return `
      <div class="page-head">
        <div><h1>Atleti</h1><p>${state.athletes.length} atlet${state.athletes.length === 1 ? 'a' : 'i'} registrat${state.athletes.length === 1 ? 'o' : 'i'}</p></div>
        <div>${lockNote}<button class="btn admin-only" data-action="add-athlete" ${state.teams.length ? '' : 'title="Puoi anche crearlo senza squadra"'}>＋ Nuovo atleta</button></div>
      </div>
      <div class="toolbar">
        <div class="tabs" id="genderTabs">
          <button data-g="" class="active">Tutti</button><button data-g="M">♂ Uomini</button><button data-g="F">♀ Donne</button>
        </div>
        <select id="fCat" style="width:auto"><option value="">Tutte le categorie</option>${catOptions}</select>
        <select id="fTeam" style="width:auto"><option value="">Tutte le squadre</option>
          ${state.teams.map(t => `<option value="${t.id}" ${params.squadra === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}
          <option value="_none">Senza squadra</option></select>
        <input class="grow" id="athSearch" placeholder="🔍 Cerca per nome...">
      </div>
      <div id="athList"></div>
    `;
  }

  function renderAthleteList() {
    const g = $('#genderTabs .active').dataset.g, cat = $('#fCat').value, team = $('#fTeam').value;
    const q = $('#athSearch').value.trim().toLowerCase();
    const list = state.athletes
      .filter(a => (!g || a.gender === g) && (!cat || a.category === cat)
        && (!team || (team === '_none' ? !a.teamId || !teamById(a.teamId) : a.teamId === team))
        && (!q || fullName(a).toLowerCase().includes(q)))
      .sort((a, b) => a.lastName.localeCompare(b.lastName));

    $('#athList').innerHTML = list.length ? `<div class="grid grid-auto">${list.map(a => {
      const t = teamById(a.teamId), s = athleteScore(a.id);
      return `<div class="card item">
        <div class="item-head">
          <div class="avatar" style="background:${a.gender === 'F' ? 'var(--female)' : 'var(--male)'}">${esc(initials(fullName(a)))}</div>
          <div><div class="item-title">${esc(fullName(a))}</div><div class="small muted">${esc(t?.name || 'Senza squadra')}</div></div>
        </div>
        <div class="item-meta">${genderTag(a.gender)}<span class="tag">${esc(catName(a.gender, a.category))}</span>
          ${a.birthYear ? `<span class="tag">${esc(a.birthYear)}</span>` : ''}</div>
        <div class="item-meta"><span class="tag">🏁 ${s.count} gare</span><span class="tag gold">⚡ ${fmtPts(s.score)} pt</span>
          ${s.best ? `<span class="tag">🏅 best ${fmtPts(s.best.total)}</span>` : ''}</div>
        <div class="item-foot">
          <a class="btn btn-ghost btn-sm" href="#gare?atleta=${a.id}">Vedi gare</a>
          <span class="admin-only">
            <button class="btn btn-ghost btn-sm" data-action="add-comp" data-id="${a.id}" title="Aggiungi gara">＋🏁</button>
            <button class="btn btn-ghost btn-sm" data-action="edit-athlete" data-id="${a.id}">✎</button>
            <button class="btn btn-danger btn-sm" data-action="del-athlete" data-id="${a.id}">🗑</button>
          </span>
        </div>
      </div>`;
    }).join('')}</div>` : emptyBox('🏃', 'Nessun atleta trovato.');
  }

  /* ---------------- GARE ---------------- */
  function viewCompetitions(params) {
    return `
      <div class="page-head">
        <div><h1>Gare</h1><p>${state.competitions.length} gar${state.competitions.length === 1 ? 'a' : 'e'} registrat${state.competitions.length === 1 ? 'a' : 'e'}</p></div>
        <div>${lockNote}<button class="btn admin-only" data-action="add-comp" ${state.athletes.length ? '' : 'disabled title="Prima inserisci almeno un atleta"'}>＋ Nuova gara</button></div>
      </div>
      <div class="toolbar">
        <select id="fAth" class="grow"><option value="">Tutti gli atleti</option>
          ${[...state.athletes].sort((a, b) => a.lastName.localeCompare(b.lastName)).map(a =>
            `<option value="${a.id}" ${params.atleta === a.id ? 'selected' : ''}>${esc(a.lastName + ' ' + a.firstName)} (${a.gender})</option>`).join('')}
        </select>
        <select id="fEv" style="width:auto"><option value="">Tutte le gare</option>${eventFilterOptions()}</select>
      </div>
      <div id="compList"></div>
    `;
  }

  function eventFilterOptions(selected = '') {
    const seen = new Map();
    ['M', 'F'].forEach(g => {
      const { multi, single } = SCORING.competitionOptions(g);
      [...multi, ...single].forEach(o => {
        const label = o.name;
        if (seen.has(o.key)) { if (!seen.get(o.key).includes(label)) seen.set(o.key, seen.get(o.key) + ' / ' + label); }
        else seen.set(o.key, label);
      });
    });
    const multiKeys = [...seen].filter(([k]) => !k.startsWith('S_'));
    const singleKeys = [...seen].filter(([k]) => k.startsWith('S_'));
    const opt = ([k, l]) => `<option value="${k}" ${k === selected ? 'selected' : ''}>${esc(l)}</option>`;
    return `<optgroup label="Prove multiple">${multiKeys.map(opt).join('')}</optgroup>
            <optgroup label="Gare singole">${singleKeys.map(opt).join('')}</optgroup>`;
  }

  function renderCompList() {
    const athId = $('#fAth').value, ev = $('#fEv').value;
    const list = state.competitions.filter(c => (!athId || c.athleteId === athId) && (!ev || c.eventKey === ev));
    if (!list.length) { $('#compList').innerHTML = emptyBox('🏁', 'Nessuna gara trovata.'); return; }

    // raggruppa per atleta
    const groups = {};
    list.forEach(c => (groups[c.athleteId] ||= []).push(c));
    const ordered = Object.entries(groups).sort(([a], [b]) => fullName(athleteById(a)).localeCompare(fullName(athleteById(b))));

    $('#compList').innerHTML = ordered.map(([aid, comps]) => {
      const a = athleteById(aid);
      comps.sort((x, y) => (y.date || '').localeCompare(x.date || ''));
      return `<h2 class="section-title">${esc(fullName(a))} <span class="small muted" style="font-family:var(--body);text-transform:none">· ${esc(teamById(a?.teamId)?.name || 'Senza squadra')} · ${comps.length} gar${comps.length === 1 ? 'a' : 'e'}</span></h2>
        ${comps.map(c => compCard(c, a)).join('')}`;
    }).join('');
  }

  function compCard(c, a) {
    const g = c.gender || a?.gender || 'M';
    const evs = SCORING.eventsFor(g);
    const opt = SCORING.competitionByKey(g, c.eventKey);
    return `<div class="card race" data-id="${c.id}">
      <div class="race-head" data-toggle>
        <div>
          <div class="race-title">${esc(compName(c))} ${opt?.multi ? '' : '<span class="tag">singola</span>'} ${c.handTimed ? '<span class="tag warn">manuale</span>' : ''}</div>
          <div class="small muted">📅 ${fmtDate(c.date)} · 📍 ${esc(c.location || '—')} · ${esc(catName(g, c.category))}</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <div class="race-total">${fmtPts(c.total)} <span class="small muted">pt</span></div>
          <button class="btn btn-danger btn-sm admin-only" data-action="del-comp" data-id="${c.id}">🗑</button>
        </div>
      </div>
      <div class="race-detail"><div class="table-wrap"><table>
        <thead><tr><th>Prova</th><th>Specifiche</th><th>Prestazione</th><th class="num">Punti</th></tr></thead>
        <tbody>${Object.keys(c.results).map(code => `<tr>
          <td>${esc(evs[code]?.name || code)}</td>
          <td class="muted small">${esc(SCORING.specFor(g, c.category, code) || '—')}</td>
          <td>${esc(c.results[code] || 'NM')}</td>
          <td class="pts">${fmtPts(c.points[code])}</td></tr>`).join('')}</tbody>
      </table></div>${c.notes ? `<p class="small muted">📝 ${esc(c.notes)}</p>` : ''}</div>
    </div>`;
  }

  /* ---------------- CLASSIFICA ---------------- */
  function viewRanking() {
    const catOptions = Object.entries(SCORING.CATEGORIES.M).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('');
    return `
      <div class="page-head"><div><h1>Classifica</h1><p>Punteggi World Athletics</p></div></div>
      <div class="toolbar">
        <div class="tabs" id="rankTabs"><button data-t="athletes" class="active">🏃 Atleti</button><button data-t="teams">🛡️ Squadre</button></div>
        <div class="tabs" id="rankGender"><button data-g="" class="active">Tutti</button><button data-g="M">♂</button><button data-g="F">♀</button></div>
      </div>
      <div class="toolbar">
        <select id="rCat" style="width:auto"><option value="">Tutte le categorie</option>${catOptions}</select>
        <select id="rEv" style="width:auto"><option value="">Tutte le gare</option>${eventFilterOptions()}</select>
        <select id="rCrit" style="width:auto">
          <option value="sum">Somma di tutti i punti</option>
          <option value="best">Miglior prestazione</option>
        </select>
      </div>
      <div id="rankTable"></div>
    `;
  }

  function renderRanking() {
    const type = $('#rankTabs .active').dataset.t;
    const f = { gender: $('#rankGender .active').dataset.g, category: $('#rCat').value, eventKey: $('#rEv').value, criterion: $('#rCrit').value };
    const pos = i => `<span class="pos ${i < 3 ? 'p' + (i + 1) : ''}">${i + 1}</span>`;

    if (type === 'athletes') {
      const rows = athleteRanking(f);
      $('#rankTable').innerHTML = rows.length ? `<div class="table-wrap"><table>
        <thead><tr><th>#</th><th>Atleta</th><th>Sesso</th><th>Categoria</th><th>Squadra</th><th class="num">Gare</th><th>Miglior gara</th><th class="num">Punti</th></tr></thead>
        <tbody>${rows.map((r, i) => `<tr>
          <td>${pos(i)}</td><td><b>${esc(fullName(r.athlete))}</b></td><td>${genderTag(r.athlete.gender)}</td>
          <td>${esc(catName(r.athlete.gender, r.athlete.category))}</td>
          <td class="muted">${esc(teamById(r.athlete.teamId)?.name || '—')}</td>
          <td class="num">${r.count}</td>
          <td class="small muted">${r.best ? esc(compName(r.best)) + ' · ' + fmtPts(r.best.total) : '—'}</td>
          <td class="pts">${fmtPts(r.score)}</td></tr>`).join('')}</tbody></table></div>`
        : emptyBox('📊', 'Nessun atleta in classifica con questi filtri.');
    } else {
      const rows = teamRanking(f);
      $('#rankTable').innerHTML = rows.length ? `<div class="table-wrap"><table>
        <thead><tr><th>#</th><th>Squadra</th><th>Città</th><th class="num">Atleti</th><th class="num">Gare</th><th class="num">Punti</th></tr></thead>
        <tbody>${rows.map((r, i) => `<tr>
          <td>${pos(i)}</td>
          <td><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${esc(r.team.color)};margin-right:8px"></span><b>${esc(r.team.name)}</b></td>
          <td class="muted">${esc(r.team.city || '—')}</td><td class="num">${r.members}</td><td class="num">${r.races}</td>
          <td class="pts">${fmtPts(r.score)}</td></tr>`).join('')}</tbody></table></div>`
        : emptyBox('📊', 'Nessuna squadra in classifica.');
    }
  }

  /* ---------------- Binding eventi delle viste ---------------- */
  function bindTabs(sel, cb) {
    $$(sel + ' button').forEach(b => b.onclick = () => {
      $$(sel + ' button').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); cb();
    });
  }

  function bindView(route) {
    if (route === 'squadre') {
      $('#teamSearch')?.addEventListener('input', e => {
        const q = e.target.value.trim().toLowerCase();
        $$('#teamGrid .item').forEach(el => el.style.display = el.dataset.search.includes(q) ? '' : 'none');
      });
    }
    if (route === 'atleti') {
      bindTabs('#genderTabs', renderAthleteList);
      ['#fCat', '#fTeam'].forEach(s => $(s).onchange = renderAthleteList);
      $('#athSearch').oninput = renderAthleteList;
      renderAthleteList();
    }
    if (route === 'gare') {
      $('#fAth').onchange = $('#fEv').onchange = renderCompList;
      renderCompList();
    }
    if (route === 'classifica') {
      bindTabs('#rankTabs', renderRanking);
      bindTabs('#rankGender', renderRanking);
      ['#rCat', '#rEv', '#rCrit'].forEach(s => $(s).onchange = renderRanking);
      renderRanking();
    }
  }

  // Delega click per azioni
  app.addEventListener('click', async e => {
    const toggle = e.target.closest('[data-toggle]');
    const btn = e.target.closest('[data-action]');
    if (btn) {
      e.stopPropagation();
      const { action, id } = btn.dataset;
      if (action.startsWith('add') || action.startsWith('edit') || action.startsWith('del')) {
        if (!isAdmin()) return openLogin();
      }
      switch (action) {
        case 'add-team': return openTeamForm();
        case 'edit-team': return openTeamForm(teamById(id));
        case 'del-team': return deleteTeam(id);
        case 'add-athlete': return openAthleteForm();
        case 'edit-athlete': return openAthleteForm(athleteById(id));
        case 'del-athlete': return deleteAthlete(id);
        case 'add-comp': return openCompetitionForm(id || $('#fAth')?.value || '');
        case 'del-comp': return deleteCompetition(id);
      }
    }
    if (toggle) toggle.closest('.race').classList.toggle('open');
  });

  /* ---------------- Modale ---------------- */
  function openModal(html) {
    $('#modalBody').innerHTML = html;
    $('#modal').hidden = false;
    setTimeout(() => $('#modalBody input:not([type=hidden]), #modalBody select')?.focus(), 50);
  }
  function closeModal() { $('#modal').hidden = true; $('#modalBody').innerHTML = ''; }
  $('#modalClose').onclick = closeModal;
  $('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });

  /* ---------------- Login amministratore ---------------- */
  function openLogin() {
    openModal(`<h2>Accesso amministratore</h2>
      <form id="loginForm">
        <label class="field">Password<input type="password" name="pwd" autocomplete="current-password" required></label>
        <p class="small muted" id="loginErr" style="color:var(--danger)"></p>
        <div class="form-actions"><button type="button" class="btn btn-ghost" data-close>Annulla</button><button class="btn">Accedi</button></div>
      </form>`);
    $('[data-close]').onclick = closeModal;
    $('#loginForm').onsubmit = async e => {
      e.preventDefault();
      const btnSubmit = e.target.querySelector('button.btn:not(.btn-ghost)');
      btnSubmit.disabled = true;
      try {
        if (await DB.login(e.target.pwd.value)) {
          closeModal(); render(); updateMigrate(); toast('Accesso effettuato ✔');
        } else $('#loginErr').textContent = 'Password errata.';
      } catch (err) {
        $('#loginErr').textContent = err.message || 'Errore di accesso.';
      } finally { btnSubmit.disabled = false; }
    };
  }

  $('#adminBtn').onclick = () => {
    if (isAdmin()) { DB.logout().then(() => { render(); updateMigrate(); toast('Sei uscito dalla modalità admin'); }); }
    else openLogin();
  };
  $('#menuToggle').onclick = () => $('#nav').classList.toggle('open');

  /* ---------------- Form SQUADRA ---------------- */
  function openTeamForm(team = null) {
    const color = team?.color || TEAM_COLORS[state.teams.length % TEAM_COLORS.length];
    openModal(`<h2>${team ? 'Modifica' : 'Nuova'} squadra</h2>
      <form id="teamForm" class="form-grid">
        <label class="field full">Nome squadra *<input name="name" required maxlength="60" value="${esc(team?.name)}"></label>
        <label class="field">Città<input name="city" maxlength="60" value="${esc(team?.city)}"></label>
        <label class="field">Colore<input type="color" name="color" value="${esc(color)}" style="height:42px;padding:4px"></label>
        <div class="form-actions full"><button type="button" class="btn btn-ghost" data-close>Annulla</button><button class="btn">Salva</button></div>
      </form>`);
    $('[data-close]').onclick = closeModal;
    $('#teamForm').onsubmit = async e => {
      e.preventDefault();
      const f = e.target;
      const data = { name: f.elements.name.value.trim(), city: f.city.value.trim(), color: f.color.value };
      if (!data.name) return;
      if (state.teams.some(t => t.name.toLowerCase() === data.name.toLowerCase() && t.id !== team?.id))
        return toast('Esiste già una squadra con questo nome', 'err');
      team ? await DB.update('teams', team.id, data) : await DB.add('teams', data);
      await loadAll(); closeModal(); render(); toast(team ? 'Squadra aggiornata' : 'Squadra aggiunta ✔');
    };
  }

  async function deleteTeam(id) {
    const t = teamById(id);
    if (!confirm(`Eliminare la squadra "${t.name}"?\nGli atleti resteranno senza squadra.`)) return;
    await DB.remove('teams', id);
    for (const a of state.athletes.filter(a => a.teamId === id)) await DB.update('athletes', a.id, { teamId: null });
    await loadAll(); render(); toast('Squadra eliminata');
  }

  /* ---------------- Form ATLETA ---------------- */
  function openAthleteForm(ath = null) {
    const g = ath?.gender || 'M';
    const catOpts = gender => Object.entries(SCORING.CATEGORIES[gender])
      .map(([k, v]) => `<option value="${k}" ${ath?.category === k ? 'selected' : ''}>${v.name}</option>`).join('');
    openModal(`<h2>${ath ? 'Modifica' : 'Nuovo'} atleta</h2>
      <form id="athForm" class="form-grid">
        <div class="field full">Sesso *
          <div class="radio-group">
            <label><input type="radio" name="gender" value="M" ${g === 'M' ? 'checked' : ''}> ♂ Maschio</label>
            <label><input type="radio" name="gender" value="F" ${g === 'F' ? 'checked' : ''}> ♀ Femmina</label>
          </div>
        </div>
        <label class="field">Nome *<input name="firstName" required maxlength="40" value="${esc(ath?.firstName)}"></label>
        <label class="field">Cognome *<input name="lastName" required maxlength="40" value="${esc(ath?.lastName)}"></label>
        <label class="field">Categoria *<select name="category" required>${catOpts(g)}</select></label>
        <label class="field">Anno di nascita<input name="birthYear" type="number" min="1940" max="2030" value="${esc(ath?.birthYear)}"></label>
        <label class="field full">Squadra<select name="teamId"><option value="">— Senza squadra —</option>
          ${state.teams.map(t => `<option value="${t.id}" ${ath?.teamId === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>
        <div class="full small muted" id="catSpec"></div>
        <div class="form-actions full"><button type="button" class="btn btn-ghost" data-close>Annulla</button><button class="btn">Salva</button></div>
      </form>`);
    const f = $('#athForm');
    const showSpec = () => {
      const gg = f.gender.value, c = SCORING.CATEGORIES[gg][f.category.value];
      $('#catSpec').innerHTML = c ? `ℹ️ ${c.name}: ostacoli ${c.hurdles} · peso ${c.shot}${c.discus ? ' · disco ' + c.discus : ''} · giavellotto ${c.javelin}` : '';
    };
    $$('input[name=gender]', f).forEach(r => r.onchange = () => { f.category.innerHTML = catOpts(f.gender.value); showSpec(); });
    f.category.onchange = showSpec; showSpec();
    $('[data-close]').onclick = closeModal;
    f.onsubmit = async e => {
      e.preventDefault();
      const data = {
        gender: f.gender.value, firstName: f.firstName.value.trim(), lastName: f.lastName.value.trim(),
        category: f.category.value, birthYear: f.birthYear.value ? Number(f.birthYear.value) : null, teamId: f.teamId.value || null
      };
      if (!data.firstName || !data.lastName) return;
      if (ath && ath.gender !== data.gender && state.competitions.some(c => c.athleteId === ath.id))
        return toast('Non puoi cambiare sesso a un atleta che ha già gare inserite', 'err');
      ath ? await DB.update('athletes', ath.id, data) : await DB.add('athletes', data);
      await loadAll(); closeModal(); render(); toast(ath ? 'Atleta aggiornato' : 'Atleta aggiunto ✔');
    };
  }

  async function deleteAthlete(id) {
    const a = athleteById(id);
    const n = state.competitions.filter(c => c.athleteId === id).length;
    if (!confirm(`Eliminare ${fullName(a)}?${n ? `\nVerranno eliminate anche le sue ${n} gare.` : ''}`)) return;
    await DB.remove('athletes', id);
    for (const c of state.competitions.filter(c => c.athleteId === id)) await DB.remove('competitions', c.id);
    await loadAll(); render(); toast('Atleta eliminato');
  }

  /* ---------------- Form GARA ---------------- */
  function openCompetitionForm(preselectId = '') {
    if (!state.athletes.length) return toast('Prima inserisci almeno un atleta', 'err');
    const today = new Date().toISOString().slice(0, 10);
    openModal(`<h2>Nuova gara</h2>
      <form id="compForm" class="form-grid">
        <label class="field full">Atleta *<select name="athleteId" required><option value="">— Seleziona atleta —</option>
          ${[...state.athletes].sort((a, b) => a.lastName.localeCompare(b.lastName)).map(a =>
            `<option value="${a.id}" ${a.id === preselectId ? 'selected' : ''}>${esc(a.lastName + ' ' + a.firstName)} · ${a.gender === 'F' ? '♀' : '♂'} ${esc(catName(a.gender, a.category))}</option>`).join('')}
        </select></label>
        <label class="field full">Gara *<select name="eventKey" required disabled><option>Seleziona prima l'atleta</option></select></label>
        <label class="field">Data *<input type="date" name="date" required value="${today}"></label>
        <label class="field">Luogo<input name="location" maxlength="60" placeholder="es. Ancona"></label>
        <label class="check full"><input type="checkbox" name="handTimed"> Cronometraggio manuale (aggiunge +0,24 s su 60/100/110/200, +0,14 s sui 400)</label>
        <div class="full" id="unofficialNote"></div>
        <div class="full"><div class="events-table" id="eventsTable"></div><div id="totalBox"></div></div>
        <label class="field full">Note<input name="notes" maxlength="200" placeholder="vento, condizioni, ecc. (facoltativo)"></label>
        <div class="form-actions full"><button type="button" class="btn btn-ghost" data-close>Annulla</button><button class="btn" id="saveComp">Salva gara</button></div>
      </form>`);

    const f = $('#compForm');
    const getAth = () => athleteById(f.athleteId.value);

    const fillEvents = () => {
      const a = getAth();
      if (!a) { f.eventKey.disabled = true; f.eventKey.innerHTML = '<option>Seleziona prima l\'atleta</option>'; $('#eventsTable').innerHTML = ''; $('#totalBox').innerHTML = ''; return; }
      const { multi, single } = SCORING.competitionOptions(a.gender);
      f.eventKey.disabled = false;
      f.eventKey.innerHTML = `<optgroup label="Prove multiple">${multi.map(o => `<option value="${o.key}">${esc(o.name)}${o.unofficial ? ' *' : ''}</option>`).join('')}</optgroup>
        <optgroup label="Gare singole">${single.map(o => `<option value="${o.key}">${esc(o.name)}</option>`).join('')}</optgroup>`;
      buildRows();
    };

    const buildRows = () => {
      const a = getAth(); if (!a) return;
      const opt = SCORING.competitionByKey(a.gender, f.eventKey.value);
      const evs = SCORING.eventsFor(a.gender);
      $('#unofficialNote').innerHTML = opt.unofficial ? '<span class="tag warn">* Prova non ufficiale World Athletics: punteggi calcolati sulle singole tabelle</span>' : '';
      $('#eventsTable').innerHTML = opt.events.map((code, i) => {
        const spec = SCORING.specFor(a.gender, a.category, code);
        return `<div class="event-row">
          <span class="n">${i + 1}</span>
          <div><span class="ename">${esc(evs[code].name)}</span>${spec ? `<span class="spec">${esc(spec)}</span>` : ''}</div>
          <input data-code="${code}" placeholder="${esc(SCORING.placeholderFor(a.gender, code))}" inputmode="decimal" autocomplete="off">
          <span class="epts" data-pts="${code}">0</span>
        </div>`;
      }).join('');
      $$('#eventsTable input').forEach(inp => inp.oninput = recalc);
      recalc();
    };

    const recalc = () => {
      const a = getAth(); if (!a) return;
      let total = 0;
      $$('#eventsTable input').forEach(inp => {
        const code = inp.dataset.code;
        const p = SCORING.points(a.gender, code, inp.value, f.handTimed.checked);
        const el = $(`[data-pts="${code}"]`);
        el.textContent = fmtPts(p); el.classList.toggle('has', p > 0);
        inp.style.borderColor = inp.value && !SCORING.isValidMark(a.gender, code, inp.value) ? 'var(--danger)' : '';
        total += p;
      });
      $('#totalBox').innerHTML = `<div class="total-bar"><span>Totale punti</span><span class="tv">${fmtPts(total)}</span></div>`;
    };

    f.athleteId.onchange = fillEvents;
    f.eventKey.onchange = buildRows;
    f.handTimed.onchange = recalc;
    $('[data-close]').onclick = closeModal;
    if (preselectId) fillEvents();

    f.onsubmit = async e => {
      e.preventDefault();
      const a = getAth(); if (!a) return toast('Seleziona un atleta', 'err');
      const results = {}, points = {};
      let total = 0, valid = 0, invalid = false;
      $$('#eventsTable input').forEach(inp => {
        const code = inp.dataset.code, v = inp.value.trim();
        if (v && !SCORING.isValidMark(a.gender, code, v)) invalid = true;
        if (v) valid++;
        results[code] = v;
        points[code] = SCORING.points(a.gender, code, v, f.handTimed.checked);
        total += points[code];
      });
      if (invalid) return toast('Controlla il formato delle prestazioni evidenziate', 'err');
      if (!valid) return toast('Inserisci almeno una prestazione', 'err');
      await DB.add('competitions', {
        athleteId: a.id, gender: a.gender, category: a.category, eventKey: f.eventKey.value,
        date: f.date.value, location: f.location.value.trim(), notes: f.notes.value.trim(),
        handTimed: f.handTimed.checked, results, points, total
      });
      await loadAll(); closeModal(); render(); toast(`Gara salvata: ${fmtPts(total)} punti ✔`);
    };
  }

  async function deleteCompetition(id) {
    const c = state.competitions.find(x => x.id === id);
    if (!confirm(`Eliminare la gara "${compName(c)}" del ${fmtDate(c.date)}?`)) return;
    await DB.remove('competitions', id);
    await loadAll(); render(); toast('Gara eliminata');
  }

  /* ---------------- Backup ---------------- */
  $('#exportBtn').onclick = async () => {
    const data = await DB.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fantamultiple-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(a.href);
    toast('Backup scaricato');
  };

  $('#importFile').onchange = async e => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file || !isAdmin()) return;
    if (!confirm('Importando il backup i dati attuali verranno sostituiti. Continuare?')) return;
    try {
      await DB.importAll(JSON.parse(await file.text()));
      await loadAll(); render(); toast('Backup importato ✔');
    } catch (err) { toast(err.message || 'File non valido', 'err'); }
  };

  /* ---------------- Trasferimento dati locali → online ---------------- */
  function updateMigrate() {
    const b = $('#migrateBtn');
    if (b) b.hidden = !(DB.kind !== 'local' && isAdmin() && LOCAL_DB.hasData());
  }
  $('#migrateBtn').onclick = async () => {
    if (!confirm('Caricare online i dati salvati in questo browser?\nI dati online attuali verranno sostituiti.')) return;
    try {
      await DB.importAll(await LOCAL_DB.exportAll());
      await loadAll(); render(); toast('Dati trasferiti online ✔');
    } catch (err) { toast('Errore: ' + (err.message || err), 'err'); }
  };

  // Errori di scrittura/lettura (es. permessi o connessione)
  window.addEventListener('unhandledrejection', e => {
    const m = String(e.reason?.message || e.reason || '');
    toast(/permission|insufficient|row-level security|permesso/i.test(m) ? 'Permesso negato: accedi come amministratore' : 'Errore: ' + m, 'err');
  });

  /* ---------------- Avvio ---------------- */
  window.addEventListener('hashchange', render);
  if (DB.kind === 'local') window.addEventListener('storage', async () => { await loadAll(); render(); });
  app.innerHTML = '<div class="empty"><span class="big">⏳</span>Caricamento dati...</div>';
  DB.init()
    .then(loadAll)
    .then(() => { render(); updateMigrate(); })
    .catch(err => {
      console.error(err);
      app.innerHTML = `<div class="empty"><span class="big">⚠️</span>Impossibile caricare i dati.<br><span class="small">${esc(err.message || err)}</span></div>`;
    });
})();
