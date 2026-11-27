// =========================================================================
// 1. LIVELLO STORAGE (Facilmente sostituibile con un Database futuro)
// =========================================================================
const StorageService = {
    KEYS: {
        TEAMS: 'fantamultiple_teams',
        ATHLETES: 'fantamultiple_athletes',
        RACES: 'fantamultiple_races'
    },
    getTeams() {
        return JSON.parse(localStorage.getItem(this.KEYS.TEAMS)) || [];
    },
    saveTeams(teams) {
        localStorage.setItem(this.KEYS.TEAMS, JSON.stringify(teams));
    },
    getAthletes() {
        return JSON.parse(localStorage.getItem(this.KEYS.ATHLETES)) || [];
    },
    saveAthletes(athletes) {
        localStorage.setItem(this.KEYS.ATHLETES, JSON.stringify(athletes));
    },
    getRaces() {
        return JSON.parse(localStorage.getItem(this.KEYS.RACES)) || [];
    },
    saveRaces(races) {
        localStorage.setItem(this.KEYS.RACES, JSON.stringify(races));
    }
};

// =========================================================================
// 2. TABELLE WORLD ATHLETICS & SPECIFICHE CATEGORIE
// Formula Track: INT(A * (B - T)^C) | Formula Field: INT(A * (D - B)^C)
// Nota: Salti in cm (es. 7.20m -> 720), Lanci in metri (es. 14.50m -> 14.50)
// =========================================================================
const WA_EVENTS = {
    // --- MASCHILE ---
    'M_60m':     { name: '60m', type: 'track', A: 58.0150, B: 11.50, C: 1.81, unit: 'sec (es. 7.12)' },
    'M_100m':    { name: '100m', type: 'track', A: 25.4347, B: 18.00, C: 1.81, unit: 'sec (es. 11.20)' },
    'M_400m':    { name: '400m', type: 'track', A: 1.53775, B: 82.00, C: 1.81, unit: 'sec (es. 50.40)' },
    'M_1000m':   { name: '1000m', type: 'track', A: 0.08713, B: 305.50, C: 1.85, unit: 'min:sec o sec (es. 2:45.00)' },
    'M_1500m':   { name: '1500m', type: 'track', A: 0.03768, B: 480.00, C: 1.85, unit: 'min:sec o sec (es. 4:30.00)' },
    'M_60hs':    { name: '60m Ostacoli', type: 'track', A: 20.5173, B: 15.50, C: 1.92, unit: 'sec (es. 8.45)' },
    'M_110hs':   { name: '110m Ostacoli', type: 'track', A: 5.74352, B: 28.50, C: 1.92, unit: 'sec (es. 15.10)' },
    'M_LJ':      { name: 'Salto in Lungo', type: 'jump', A: 0.14354, B: 220.00, C: 1.40, unit: 'metri (es. 6.85)' },
    'M_HJ':      { name: 'Salto in Alto', type: 'jump', A: 0.8465, B: 75.00, C: 1.42, unit: 'metri (es. 1.92)' },
    'M_PV':      { name: 'Salto con l\'Asta', type: 'jump', A: 0.2797, B: 100.00, C: 1.35, unit: 'metri (es. 4.40)' },
    'M_SP':      { name: 'Getto del Peso', type: 'throw', A: 51.39, B: 1.50, C: 1.05, unit: 'metri (es. 13.50)' },
    'M_DT':      { name: 'Lancio del Disco', type: 'throw', A: 12.91, B: 4.00, C: 1.10, unit: 'metri (es. 41.20)' },
    'M_JT':      { name: 'Lancio del Giavellotto', type: 'throw', A: 10.14, B: 7.00, C: 1.08, unit: 'metri (es. 52.00)' },

    // --- FEMMINILE ---
    'F_60m':     { name: '60m', type: 'track', A: 46.0849, B: 13.00, C: 1.81, unit: 'sec (es. 7.85)' },
    'F_200m':    { name: '200m', type: 'track', A: 4.99087, B: 42.50, C: 1.81, unit: 'sec (es. 25.10)' },
    'F_800m':    { name: '800m', type: 'track', A: 0.11193, B: 254.00, C: 1.88, unit: 'min:sec o sec (es. 2:20.50)' },
    'F_60hs':    { name: '60m Ostacoli', type: 'track', A: 20.0479, B: 17.00, C: 1.835, unit: 'sec (es. 8.90)' },
    'F_100hs':   { name: '100m Ostacoli', type: 'track', A: 9.23076, B: 26.70, C: 1.835, unit: 'sec (es. 14.30)' },
    'F_LJ':      { name: 'Salto in Lungo', type: 'jump', A: 0.188807, B: 210.00, C: 1.41, unit: 'metri (es. 5.80)' },
    'F_HJ':      { name: 'Salto in Alto', type: 'jump', A: 1.84523, B: 75.00, C: 1.348, unit: 'metri (es. 1.72)' },
    'F_SP':      { name: 'Getto del Peso', type: 'throw', A: 56.0211, B: 1.50, C: 1.05, unit: 'metri (es. 12.10)' },
    'F_JT':      { name: 'Lancio del Giavellotto', type: 'throw', A: 15.9803, B: 3.80, C: 1.04, unit: 'metri (es. 40.50)' }
};

// Prove Multiple e Gare Singole selezionabili per Sesso
const DISCIPLINES = {
    M: {
        multi: {
            'DECATHLON': { name: 'Decathlon Outdoor', events: ['M_100m', 'M_LJ', 'M_SP', 'M_HJ', 'M_400m', 'M_110hs', 'M_DT', 'M_PV', 'M_JT', 'M_1500m'] },
            'HEPTATHLON_IN': { name: 'Eptathlon Indoor', events: ['M_60m', 'M_LJ', 'M_SP', 'M_HJ', 'M_60hs', 'M_PV', 'M_1000m'] },
            'PENTATHLON_IN': { name: 'Pentathlon Indoor', events: ['M_60hs', 'M_LJ', 'M_SP', 'M_HJ', 'M_1000m'] },
            'DECATHLON_IN': { name: 'Decathlon Indoor', events: ['M_60m', 'M_LJ', 'M_SP', 'M_HJ', 'M_400m', 'M_60hs', 'M_DT', 'M_PV', 'M_JT', 'M_1000m'] }
        },
        singles: ['M_60m', 'M_100m', 'M_400m', 'M_1000m', 'M_1500m', 'M_60hs', 'M_110hs', 'M_LJ', 'M_HJ', 'M_PV', 'M_SP', 'M_DT', 'M_JT']
    },
    F: {
        multi: {
            'HEPTATHLON': { name: 'Eptathlon Outdoor', events: ['F_100hs', 'F_HJ', 'F_SP', 'F_200m', 'F_LJ', 'F_JT', 'F_800m'] },
            'PENTATHLON_IN': { name: 'Pentathlon Indoor', events: ['F_60hs', 'F_HJ', 'F_SP', 'F_LJ', 'F_800m'] }
        },
        singles: ['F_60m', 'F_200m', 'F_800m', 'F_60hs', 'F_100hs', 'F_LJ', 'F_HJ', 'F_SP', 'F_JT']
    }
};

// Specifiche attrezzi e ostacoli per Sesso e Categoria
const CATEGORY_SPECS = {
    M: {
        'Allievi': 'Ostacoli: 91.4 cm | Peso: 5 kg | Disco: 1.5 kg | Giavellotto: 700 g',
        'Junior': 'Ostacoli: 99.1 cm | Peso: 6 kg | Disco: 1.75 kg | Giavellotto: 800 g',
        'Promesse': 'Ostacoli: 106.7 cm | Peso: 7.26 kg | Disco: 2 kg | Giavellotto: 800 g',
        'Assoluti': 'Ostacoli: 106.7 cm | Peso: 7.26 kg | Disco: 2 kg | Giavellotto: 800 g'
    },
    F: {
        'Allievi': 'Ostacoli: 76.2 cm | Peso: 3 kg | Giavellotto: 500 g',
        'Junior': 'Ostacoli: 83.8 cm | Peso: 4 kg | Giavellotto: 600 g',
        'Promesse': 'Ostacoli: 83.8 cm | Peso: 4 kg | Giavellotto: 600 g',
        'Assoluti': 'Ostacoli: 83.8 cm | Peso: 4 kg | Giavellotto: 600 g'
    }
};

// =========================================================================
// 3. MOTORE DI CALCOLO PUNTEGGI WORLD ATHLETICS
// =========================================================================
function parsePerformanceToSeconds(inputStr) {
    const clean = inputStr.trim().replace(',', '.');
    if (clean.includes(':')) {
        const parts = clean.split(':');
        const mins = parseFloat(parts[0]);
        const secs = parseFloat(parts[1]);
        if (isNaN(mins) || isNaN(secs)) return NaN;
        return (mins * 60) + secs;
    }
    return parseFloat(clean);
}

function calculateEventPoints(eventCode, rawValue) {
    const spec = WA_EVENTS[eventCode];
    if (!spec || !rawValue || rawValue.trim() === '') return 0;

    let val = parsePerformanceToSeconds(rawValue);
    if (isNaN(val) || val <= 0) return 0;

    if (spec.type === 'track') {
        if (val >= spec.B) return 0;
        return Math.floor(spec.A * Math.pow((spec.B - val), spec.C));
    } else if (spec.type === 'jump') {
        // L'utente inserisce in metri (es. 6.80), la formula WA usa centimetri (680)
        const cm = val < 20 ? val * 100 : val;
        if (cm <= spec.B) return 0;
        return Math.floor(spec.A * Math.pow((cm - spec.B), spec.C));
    } else if (spec.type === 'throw') {
        // I lanci nella formula WA usano i metri direttamente
        if (val <= spec.B) return 0;
        return Math.floor(spec.A * Math.pow((val - spec.B), spec.C));
    }
    return 0;
}

// =========================================================================
// 4. STATO APPLICAZIONE & AUTENTICAZIONE ADMIN
// =========================================================================
let isAdmin = sessionStorage.getItem('fantamultiple_admin') === 'true';

function updateAdminUI() {
    const adminElements = document.querySelectorAll('.admin-only');
    const statusBadge = document.getElementById('admin-status');
    const btnLogin = document.getElementById('btn-login');
    const btnLogout = document.getElementById('btn-logout');

    if (isAdmin) {
        adminElements.forEach(el => el.classList.remove('hidden'));
        statusBadge.textContent = 'Admin Attivo';
        statusBadge.className = 'badge badge-admin';
        btnLogin.classList.add('hidden');
        btnLogout.classList.remove('hidden');
    } else {
        adminElements.forEach(el => el.classList.add('hidden'));
        statusBadge.textContent = 'Modalità Ospite';
        statusBadge.className = 'badge badge-user';
        btnLogin.classList.remove('hidden');
        btnLogout.classList.add('hidden');
    }
}

// =========================================================================
// 5. AGGIORNAMENTO INTERFACCIA E CALCOLO CLASSIFICHE
// =========================================================================
function getAthletePoints(athleteId, races) {
    return races
        .filter(r => r.athleteId === athleteId)
        .reduce((sum, r) => sum + r.totalPoints, 0);
}

function getTeamPoints(teamId, athletes, races) {
    const teamAthletes = athletes.filter(a => a.teamId === teamId);
    return teamAthletes.reduce((sum, a) => sum + getAthletePoints(a.id, races), 0);
}

function renderAll() {
    const teams = StorageService.getTeams();
    const athletes = StorageService.getAthletes();
    const races = StorageService.getRaces();

    // Calcola punteggi arricchiti
    const athletesWithPts = athletes.map(a => ({
        ...a,
        points: getAthletePoints(a.id, races),
        teamName: (teams.find(t => t.id === a.teamId) || { name: 'Senza Squadra' }).name
    })).sort((a, b) => b.points - a.points);

    const teamsWithPts = teams.map(t => ({
        ...t,
        athleteCount: athletes.filter(a => a.teamId === t.id).length,
        points: getTeamPoints(t.id, athletes, races)
    })).sort((a, b) => b.points - a.points);

    // 1. Aggiorna HOME
    document.getElementById('stat-teams-count').textContent = teams.length;
    document.getElementById('stat-athletes-count').textContent = athletes.length;
    if (teamsWithPts.length > 0 && teamsWithPts[0].points > 0) {
document.getElementById('stat-top-team').textContent = teamsWithPts[0].name;
document.getElementById('stat-top-team-pts').textContent = ${teamsWithPts[0].points} pt;
} else if (teamsWithPts.length > 0) {
document.getElementById('stat-top-team').textContent = teamsWithPts[0].name;
document.getElementById('stat-top-team-pts').textContent = '0 pt';
} else {
document.getElementById('stat-top-team').textContent = '-';
document.getElementById('stat-top-team-pts').textContent = '0 pt';
}
if (athletesWithPts.length > 0) {
document.getElementById('stat-top-athlete').textContent = ${athletesWithPts[0].name} ${athletesWithPts[0].surname};
document.getElementById('stat-top-athlete-pts').textContent = ${athletesWithPts[0].points} pt;
} else {
document.getElementById('stat-top-athlete').textContent = '-';
document.getElementById('stat-top-athlete-pts').textContent = '0 pt';
}
// 2. Aggiorna SQUADRE
const tbodyTeams = document.querySelector('#table-teams tbody');
tbodyTeams.innerHTML = teamsWithPts.map(t => `
${t.name}
${t.athleteCount}${t.points} pt`).join('') || 'Nessuna squadra inserita.';
// Aggiorna select squadre nel form atleti
const selectTeam = document.getElementById('athlete-team');
selectTeam.innerHTML = 'Seleziona Squadra...' +
teams.map(t => <option value="${t.id}">${t.name}</option>).join('');
// 3. Aggiorna ATLETI
const tbodyAthletes = document.querySelector('#table-athletes tbody');
tbodyAthletes.innerHTML = athletesWithPts.map(a => `
\(a.name\){a.surname}
${a.gender}${a.category}${a.teamName}${a.points} pt`).join('') || 'Nessun atleta registrato.';
// Aggiorna select atleti nella sezione gare
const raceAthleteSelect = document.getElementById('race-athlete');
const filterAthleteSelect = document.getElementById('filter-race-athlete');
const currentFilter = filterAthleteSelect.value;
const athleteOptions = athletes.map(a =>
<option value="${a.id}">${a.name} ${a.surname} (${a.gender} - ${a.category})</option>
).join('');
raceAthleteSelect.innerHTML = '1. Seleziona Atleta...' + athleteOptions;
filterAthleteSelect.innerHTML = 'Tutti gli atleti' + athleteOptions;
filterAthleteSelect.value = currentFilter || 'ALL';
// 4. Aggiorna GARE
renderRacesTable(races, athletes);
// 5. Aggiorna CLASSIFICHE
document.querySelector('#ranking-teams tbody').innerHTML = teamsWithPts.map((t, idx) => `
#${idx + 1}
${t.name}${t.athleteCount}${t.points} pt`).join('') || 'Nessun dato disponibile.';
document.querySelector('#ranking-athletes tbody').innerHTML = athletesWithPts.map((a, idx) => `
#${idx + 1}
\(a.name\){a.surname}\({a.category} (\){a.gender})${a.teamName}${a.points} pt`).join('') || 'Nessun dato disponibile.';
updateAdminUI();
}
function renderRacesTable(races, athletes) {
const filterId = document.getElementById('filter-race-athlete').value;
const filteredRaces = filterId === 'ALL' ? races : races.filter(r => r.athleteId === filterId);
const tbodyRaces = document.querySelector('#table-races tbody');
tbodyRaces.innerHTML = filteredRaces.slice().reverse().map(r => {
const ath = athletes.find(a => a.id === r.athleteId);
const athLabel = ath ? ${ath.name} ${ath.surname} (${ath.category}) : 'Atleta rimosso';
const details = r.results.map(res => ${WA_EVENTS[res.eventCode].name}: ${res.mark} (${res.points}pt)).join(' | ');
return `
${r.date}
${athLabel}${r.disciplineName}${details}${r.totalPoints} pt`;
}).join('') || 'Nessuna gara registrata.';
}
// =========================================================================
// 6. GESTIONE EVENTI & FORM DINAMICI
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
// Navigazione Tab
document.querySelectorAll('.nav-btn').forEach(btn => {
btn.addEventListener('click', () => {
document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
btn.classList.add('active');
document.getElementById(btn.dataset.target).classList.add('active');
});
});
// Login / Logout Admin
const modal = document.getElementById('login-modal');
document.getElementById('btn-login').addEventListener('click', () => {
document.getElementById('admin-password').value = '';
document.getElementById('login-error').classList.add('hidden');
modal.classList.remove('hidden');
});
document.getElementById('btn-cancel-login').addEventListener('click', () => {
modal.classList.add('hidden');
});
document.getElementById('btn-confirm-login').addEventListener('click', () => {
const pwd = document.getElementById('admin-password').value;
if (pwd === 'FraBorro') {
isAdmin = true;
sessionStorage.setItem('fantamultiple_admin', 'true');
modal.classList.add('hidden');
renderAll();
} else {
document.getElementById('login-error').classList.remove('hidden');
}
});
document.getElementById('btn-logout').addEventListener('click', () => {
isAdmin = false;
sessionStorage.removeItem('fantamultiple_admin');
renderAll();
});
// Aggiungi Squadra
document.getElementById('form-team').addEventListener('submit', (e) => {
e.preventDefault();
if (!isAdmin) return;
const nameInput = document.getElementById('team-name');
const teams = StorageService.getTeams();
teams.push({ id: 'T_' + Date.now(), name: nameInput.value.trim() });
StorageService.saveTeams(teams);
nameInput.value = '';
renderAll();
});
// Aggiungi Atleta
document.getElementById('form-athlete').addEventListener('submit', (e) => {
e.preventDefault();
if (!isAdmin) return;
const athletes = StorageService.getAthletes();
athletes.push({
id: 'A_' + Date.now(),
name: document.getElementById('athlete-name').value.trim(),
surname: document.getElementById('athlete-surname').value.trim(),
gender: document.getElementById('athlete-gender').value,
category: document.getElementById('athlete-category').value,
teamId: document.getElementById('athlete-team').value
});
StorageService.saveAthletes(athletes);
e.target.reset();
renderAll();
});
// Selezione Atleta nel Form Gara -> Popola Specialità e Specifiche Attrezzi
const raceAthleteSelect = document.getElementById('race-athlete');
const raceTypeSelect = document.getElementById('race-type');
const specsBanner = document.getElementById('race-specs-info');
const inputsContainer = document.getElementById('race-inputs-container');
raceAthleteSelect.addEventListener('change', () => {
const athleteId = raceAthleteSelect.value;
inputsContainer.innerHTML = '';
document.getElementById('preview-points').textContent = '0';
document.getElementById('btn-save-race').disabled = true;
if (!athleteId) {
raceTypeSelect.disabled = true;
raceTypeSelect.innerHTML = '2. Seleziona Specialità / Gara...';
specsBanner.classList.add('hidden');
return;
}
const athlete = StorageService.getAthletes().find(a => a.id === athleteId);
const genderData = DISCIPLINES[athlete.gender];
// Mostra specifiche categoria (altezza ostacoli e peso attrezzi)
specsBanner.textContent = Specifiche ${athlete.category} (${athlete.gender}): ${CATEGORY_SPECS[athlete.gender][athlete.category]};
specsBanner.classList.remove('hidden');
// Popola tendina con Prove Multiple + Gare Singole
let optionsHtml = '2. Seleziona Specialità / Gara...';
optionsHtml += '';
for (const [key, val] of Object.entries(genderData.multi)) {
optionsHtml += <option value="MULTI:${key}">${val.name}</option>;
}
optionsHtml += '';
genderData.singles.forEach(evCode => {
optionsHtml += <option value="SINGLE:${evCode}">${WA_EVENTS[evCode].name}</option>;
});
optionsHtml += '';
raceTypeSelect.innerHTML = optionsHtml;
raceTypeSelect.disabled = false;
});
// Selezione Specialità -> Genera campi input per le singole prove
raceTypeSelect.addEventListener('change', () => {
const val = raceTypeSelect.value;
const athlete = StorageService.getAthletes().find(a => a.id === raceAthleteSelect.value);
inputsContainer.innerHTML = '';
document.getElementById('preview-points').textContent = '0';
if (!val || !athlete) {
document.getElementById('btn-save-race').disabled = true;
return;
}
const [mode, code] = val.split(':');
const eventCodes = mode === 'MULTI'
? DISCIPLINES[athlete.gender].multi[code].events
: [code];
eventCodes.forEach(evCode => {
const evSpec = WA_EVENTS[evCode];
const div = document.createElement('div');
div.className = 'event-input-group';
div.innerHTML = `
${evSpec.name}
Punti: 0
`;
inputsContainer.appendChild(div);
});
document.getElementById('btn-save-race').disabled = false;
// Calcolo punteggio in tempo reale durante la digitazione
document.querySelectorAll('.perf-input').forEach(inp => {
inp.addEventListener('input', updateLiveRaceScore);
});
});
function updateLiveRaceScore() {
let total = 0;
document.querySelectorAll('.perf-input').forEach(inp => {
const pts = calculateEventPoints(inp.dataset.event, inp.value);
inp.nextElementSibling.textContent = Punti: ${pts};
total += pts;
});
document.getElementById('preview-points').textContent = total;
}
// Salva Gara
document.getElementById('form-race').addEventListener('submit', (e) => {
e.preventDefault();
if (!isAdmin) return;
const athleteId = raceAthleteSelect.value;
const athlete = StorageService.getAthletes().find(a => a.id === athleteId);
const [mode, code] = raceTypeSelect.value.split(':');
const disciplineName = mode === 'MULTI'
? DISCIPLINES[athlete.gender].multi[code].name
: Gara Singola: ${WA_EVENTS[code].name};
const results = [];
let totalPoints = 0;
document.querySelectorAll('.perf-input').forEach(inp => {
const evCode = inp.dataset.event;
const mark = inp.value.trim();
const points = calculateEventPoints(evCode, mark);
results.push({ eventCode: evCode, mark, points });
totalPoints += points;
});
const races = StorageService.getRaces();
races.push({
id: 'R_' + Date.now(),
athleteId,
date: document.getElementById('race-date').value,
disciplineName,
results,
totalPoints
});
StorageService.saveRaces(races);
e.target.reset();
inputsContainer.innerHTML = '';
specsBanner.classList.add('hidden');
raceTypeSelect.disabled = true;
document.getElementById('preview-points').textContent = '0';
document.getElementById('btn-save-race').disabled = true;
renderAll();
});
// Filtro storico gare per atleta
document.getElementById('filter-race-athlete').addEventListener('change', () => {
renderRacesTable(StorageService.getRaces(), StorageService.getAthletes());
});
// Imposta data odierna di default nel form gara
document.getElementById('race-date').valueAsDate = new Date();
// Avvio iniziale
renderAll();
});
// =========================================================================
// 7. FUNZIONI DI ELIMINAZIONE (ADMIN)
// =========================================================================
window.deleteTeam = function(id) {
if (!isAdmin || !confirm('Eliminare questa squadra?')) return;
const teams = StorageService.getTeams().filter(t => t.id !== id);
StorageService.saveTeams(teams);
renderAll();
};
window.deleteAthlete = function(id) {
if (!isAdmin || !confirm('Eliminare questo atleta e le sue gare?')) return;
const athletes = StorageService.getAthletes().filter(a => a.id !== id);
const races = StorageService.getRaces().filter(r => r.athleteId !== id);
StorageService.saveAthletes(athletes);
StorageService.saveRaces(races);
renderAll();
};
window.deleteRace = function(id) {
if (!isAdmin || !confirm('Eliminare questo risultato?')) return;
const races = StorageService.getRaces().filter(r => r.id !== id);
StorageService.saveRaces(races);
renderAll();
};
 
      
