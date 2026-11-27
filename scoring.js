/* =========================================================
   FantaMultiple - Tabelle punteggio World Athletics
   Formule ufficiali (Scoring Tables for Combined Events):
     Corse:   P = floor( A * (B - T)^C )   T in secondi
     Salti:   P = floor( A * (M - B)^C )   M in centimetri
     Lanci:   P = floor( A * (D - B)^C )   D in metri
   ========================================================= */

const SCORING = (() => {

  // ---------- Coefficienti UOMINI ----------
  const EVENTS_M = {
    '60m':   { name: '60 m',            type: 'track', A: 58.0150, B: 11.5,  C: 1.81, hand: 0.24, indoor: true },
    '100m':  { name: '100 m',           type: 'track', A: 25.4347, B: 18.0,  C: 1.81, hand: 0.24 },
    '400m':  { name: '400 m',           type: 'track', A: 1.53775, B: 82.0,  C: 1.81, hand: 0.14 },
    '1000m': { name: '1000 m',          type: 'track', A: 0.08713, B: 305.5, C: 1.85, hand: 0,    indoor: true },
    '1500m': { name: '1500 m',          type: 'track', A: 0.03768, B: 480.0, C: 1.85, hand: 0 },
    '60mH':  { name: '60 m ostacoli',   type: 'track', A: 20.5173, B: 15.5,  C: 1.92, hand: 0.24, hurdles: true, indoor: true },
    '110mH': { name: '110 m ostacoli',  type: 'track', A: 5.74352, B: 28.5,  C: 1.92, hand: 0.24, hurdles: true },
    'HJ':    { name: 'Salto in alto',   type: 'jump',  A: 0.8465,  B: 75,    C: 1.42 },
    'PV':    { name: 'Salto con l\'asta', type: 'jump', A: 0.2797, B: 100,   C: 1.35 },
    'LJ':    { name: 'Salto in lungo',  type: 'jump',  A: 0.14354, B: 220,   C: 1.40 },
    'SP':    { name: 'Getto del peso',  type: 'throw', A: 51.39,   B: 1.5,   C: 1.05, implement: 'shot' },
    'DT':    { name: 'Lancio del disco', type: 'throw', A: 12.91,  B: 4.0,   C: 1.10, implement: 'discus' },
    'JT':    { name: 'Lancio del giavellotto', type: 'throw', A: 10.14, B: 7.0, C: 1.08, implement: 'javelin' }
  };

  // ---------- Coefficienti DONNE ----------
  const EVENTS_F = {
    '200m':  { name: '200 m',           type: 'track', A: 4.99087, B: 42.5,  C: 1.81,  hand: 0.24 },
    '800m':  { name: '800 m',           type: 'track', A: 0.11193, B: 254.0, C: 1.88,  hand: 0 },
    '60mH':  { name: '60 m ostacoli',   type: 'track', A: 20.0479, B: 17.0,  C: 1.835, hand: 0.24, hurdles: true, indoor: true },
    '100mH': { name: '100 m ostacoli',  type: 'track', A: 9.23076, B: 26.7,  C: 1.835, hand: 0.24, hurdles: true },
    'HJ':    { name: 'Salto in alto',   type: 'jump',  A: 1.84523, B: 75,    C: 1.348 },
    'LJ':    { name: 'Salto in lungo',  type: 'jump',  A: 0.188807, B: 210,  C: 1.41 },
    'SP':    { name: 'Getto del peso',  type: 'throw', A: 56.0211, B: 1.5,   C: 1.05,  implement: 'shot' },
    'JT':    { name: 'Lancio del giavellotto', type: 'throw', A: 15.9803, B: 3.8, C: 1.04, implement: 'javelin' }
  };

  // ---------- Prove multiple ----------
  const MULTI = {
    M: {
      DEC:   { name: 'Decathlon',          events: ['100m','LJ','SP','HJ','400m','110mH','DT','PV','JT','1500m'] },
      HEP_I: { name: 'Eptathlon indoor',   events: ['60m','LJ','SP','HJ','60mH','PV','1000m'] },
      PEN_I: { name: 'Pentathlon indoor',  events: ['60mH','LJ','SP','HJ','1000m'] },
      // Il decathlon indoor NON è una prova ufficiale World Athletics:
      // composizione modificabile qui sotto.
      DEC_I: { name: 'Decathlon indoor',   events: ['60m','LJ','SP','HJ','400m','60mH','DT','PV','JT','1000m'], unofficial: true }
    },
    F: {
      HEP:   { name: 'Eptathlon',          events: ['100mH','HJ','SP','200m','LJ','JT','800m'] },
      PEN_I: { name: 'Pentathlon indoor',  events: ['60mH','HJ','SP','LJ','800m'] }
    }
  };

  // ---------- Categorie e specifiche attrezzi (regolamento FIDAL) ----------
  const CATEGORIES = {
    M: {
      ALL: { name: 'Allievi',  hurdles: '91,4 cm',  shot: '5 kg',    discus: '1,5 kg',  javelin: '700 g' },
      JUN: { name: 'Junior',   hurdles: '99,1 cm',  shot: '6 kg',    discus: '1,75 kg', javelin: '800 g' },
      PRO: { name: 'Promesse', hurdles: '106,7 cm', shot: '7,26 kg', discus: '2 kg',    javelin: '800 g' },
      ASS: { name: 'Assoluti', hurdles: '106,7 cm', shot: '7,26 kg', discus: '2 kg',    javelin: '800 g' }
    },
    F: {
      ALL: { name: 'Allieve',  hurdles: '76,2 cm',  shot: '3 kg',    javelin: '500 g' },
      JUN: { name: 'Junior',   hurdles: '83,8 cm',  shot: '4 kg',    javelin: '600 g' },
      PRO: { name: 'Promesse', hurdles: '83,8 cm',  shot: '4 kg',    javelin: '600 g' },
      ASS: { name: 'Assolute', hurdles: '83,8 cm',  shot: '4 kg',    javelin: '600 g' }
    }
  };

  function eventsFor(gender) { return gender === 'F' ? EVENTS_F : EVENTS_M; }

  /** Converte "1:02.34" / "62.34" / "2:45,1" in secondi */
  function parseTime(str) {
    if (str == null) return NaN;
    const s = String(str).trim().replace(',', '.');
    if (!s) return NaN;
    const parts = s.split(':').map(Number);
    if (parts.some(isNaN)) return NaN;
    return parts.reduce((acc, p) => acc * 60 + p, 0);
  }

  /** Converte "7.45" / "7,45" in numero (metri) */
  function parseDistance(str) {
    if (str == null) return NaN;
    const s = String(str).trim().replace(',', '.');
    return s ? Number(s) : NaN;
  }

  /**
   * Calcola i punti di una singola prova.
   * @param {'M'|'F'} gender
   * @param {string} code codice evento (es. '100m', 'LJ')
   * @param {string} raw  prestazione così come inserita
   * @param {boolean} handTimed cronometraggio manuale
   */
  function points(gender, code, raw, handTimed = false) {
    const ev = eventsFor(gender)[code];
    if (!ev) return 0;
    let p = 0;
    if (ev.type === 'track') {
      let t = parseTime(raw);
      if (!(t > 0)) return 0;
      if (handTimed) t += ev.hand || 0;
      if (t >= ev.B) return 0;
      p = ev.A * Math.pow(ev.B - t, ev.C);
    } else {
      const m = parseDistance(raw);
      if (!(m > 0)) return 0;
      const val = ev.type === 'jump' ? Math.round(m * 100) : m; // salti in cm
      if (val <= ev.B) return 0;
      p = ev.A * Math.pow(val - ev.B, ev.C);
    }
    // piccola tolleranza per errori floating-point prima di troncare
    return Math.floor(p + 1e-9);
  }

  /** Verifica il formato del valore inserito */
  function isValidMark(gender, code, raw) {
    const ev = eventsFor(gender)[code];
    if (!ev || raw == null || String(raw).trim() === '') return false;
    return ev.type === 'track' ? parseTime(raw) > 0 : parseDistance(raw) > 0;
  }

  /** Testo specifiche attrezzo/ostacoli per categoria */
  function specFor(gender, category, code) {
    const ev = eventsFor(gender)[code];
    const cat = CATEGORIES[gender]?.[category];
    if (!ev || !cat) return '';
    if (ev.hurdles) return `ostacoli ${cat.hurdles}`;
    if (ev.implement && cat[ev.implement]) return `attrezzo ${cat[ev.implement]}`;
    return '';
  }

  /** Elenco di tutte le "gare" selezionabili per un genere */
  function competitionOptions(gender) {
    const multi = Object.entries(MULTI[gender]).map(([k, v]) => ({
      key: k, name: v.name, multi: true, events: v.events, unofficial: !!v.unofficial
    }));
    // gare singole = unione di tutte le prove presenti nelle multiple del genere
    const codes = [...new Set(Object.values(MULTI[gender]).flatMap(m => m.events))];
    const evs = eventsFor(gender);
    const single = codes.map(c => ({
      key: 'S_' + c, name: evs[c].name + (evs[c].indoor ? ' (indoor)' : ''), multi: false, events: [c]
    }));
    return { multi, single };
  }

  function competitionByKey(gender, key) {
    const { multi, single } = competitionOptions(gender);
    return [...multi, ...single].find(o => o.key === key) || null;
  }

  function placeholderFor(gender, code) {
    const ev = eventsFor(gender)[code];
    if (!ev) return '';
    if (ev.type !== 'track') return 'metri, es. ' + (ev.type === 'jump' ? (code === 'HJ' ? '1.85' : code === 'PV' ? '4.20' : '6.80') : '12.50');
    return ev.B > 100 ? 'min:sec, es. 2:45.30' : 'secondi, es. ' + (ev.B > 50 ? '51.20' : ev.B > 20 ? '14.50' : '7.10');
  }

  return {
    EVENTS_M, EVENTS_F, MULTI, CATEGORIES,
    eventsFor, parseTime, parseDistance, points, isValidMark,
    specFor, competitionOptions, competitionByKey, placeholderFor
  };
})();

if (typeof module !== 'undefined') module.exports = SCORING;
