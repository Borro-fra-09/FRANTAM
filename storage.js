/* =========================================================
   FantaMultiple - Livello dati
   - SupabaseStore: dati online su Supabase (PostgreSQL), login admin
     con Supabase Auth (usato se supabase-config.js è compilato)
   - LocalStore: dati nel browser (fallback / modalità offline)
   Entrambi hanno la stessa interfaccia, quindi app.js non cambia.
   ========================================================= */

const COLLECTIONS = ['teams', 'athletes', 'competitions'];

/* ---------------- LocalStore (browser) ---------------- */
class LocalStore {
  constructor(prefix = 'fantamultiple_v1') {
    this.kind = 'local';
    this.prefix = prefix;
    // SHA-256 di "FraBorro"
    this.adminHash = '4df48dc58d415d05b3b4b862708635fdf2ef96a2eac4e2eaf8f936a55738e9d3';
  }
  async init() {}
  _key(col) { return `${this.prefix}_${col}`; }
  _read(col) { try { return JSON.parse(localStorage.getItem(this._key(col))) || []; } catch { return []; } }
  _write(col, data) { localStorage.setItem(this._key(col), JSON.stringify(data)); }
  _id() { return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2); }

  hasData() { return COLLECTIONS.some(c => this._read(c).length > 0); }

  async getAll(col) { return this._read(col); }
  async add(col, item) {
    const data = this._read(col);
    const rec = { ...item, id: this._id(), createdAt: new Date().toISOString() };
    data.push(rec); this._write(col, data); return rec;
  }
  async update(col, id, patch) {
    const data = this._read(col);
    const i = data.findIndex(x => x.id === id);
    if (i < 0) throw new Error('Elemento non trovato');
    data[i] = { ...data[i], ...patch, updatedAt: new Date().toISOString() };
    this._write(col, data); return data[i];
  }
  async remove(col, id) { this._write(col, this._read(col).filter(x => x.id !== id)); }

  async exportAll() {
    const out = { app: 'FantaMultiple', version: 1, exportedAt: new Date().toISOString() };
    COLLECTIONS.forEach(c => out[c] = this._read(c));
    return out;
  }
  async importAll(obj) {
    if (!obj || obj.app !== 'FantaMultiple') throw new Error('File di backup non valido');
    COLLECTIONS.forEach(c => this._write(c, Array.isArray(obj[c]) ? obj[c] : []));
  }

  // --- autenticazione (solo lato browser) ---
  isAdmin() { return sessionStorage.getItem('fm_admin') === '1'; }
  async login(password) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    const h = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    if (h !== this.adminHash) return false;
    sessionStorage.setItem('fm_admin', '1'); return true;
  }
  async logout() { sessionStorage.removeItem('fm_admin'); }
}

/* ---------------- SupabaseStore (online) ---------------- */
class SupabaseStore {
  constructor(url, key, adminEmail) {
    this.kind = 'supabase';
    this.adminEmail = adminEmail.toLowerCase();
    this.sb = supabase.createClient(url, key);
    this.user = null;
  }

  // L'app usa nomi camelCase (firstName), il database snake_case (first_name)
  static toDb(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k.replace(/[A-Z]/g, c => '_' + c.toLowerCase())] = v;
    return out;
  }
  static fromDb(row) {
    const out = {};
    for (const [k, v] of Object.entries(row)) out[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v;
    if (out.date && typeof out.date === 'string') out.date = out.date.slice(0, 10);
    return out;
  }
  static check({ data, error }) {
    if (error) throw new Error(error.message);
    return data;
  }

  /** Recupera l'eventuale sessione admin salvata */
  async init() {
    const { data } = await this.sb.auth.getSession();
    this.user = data.session?.user || null;
    this.sb.auth.onAuthStateChange((_e, session) => { this.user = session?.user || null; });
  }

  async getAll(col) {
    // Supabase restituisce max 1000 righe per richiesta: leggo a blocchi
    const all = [];
    for (let from = 0; ; from += 1000) {
      const rows = SupabaseStore.check(await this.sb.from(col).select('*').range(from, from + 999));
      all.push(...rows);
      if (rows.length < 1000) break;
    }
    return all.map(SupabaseStore.fromDb);
  }

  async add(col, item) {
    const { id, ...rest } = item;
    const rows = SupabaseStore.check(await this.sb.from(col).insert(SupabaseStore.toDb(rest)).select());
    return SupabaseStore.fromDb(rows[0]);
  }

  async update(col, id, patch) {
    const { id: _, createdAt, ...rest } = patch;
    const data = SupabaseStore.toDb({ ...rest, updatedAt: new Date().toISOString() });
    const rows = SupabaseStore.check(await this.sb.from(col).update(data).eq('id', id).select());
    if (!rows.length) throw new Error('Permesso negato o elemento non trovato');
    return SupabaseStore.fromDb(rows[0]);
  }

  async remove(col, id) {
    const rows = SupabaseStore.check(await this.sb.from(col).delete().eq('id', id).select());
    // con le regole di sicurezza, chi non è admin cancella 0 righe senza errore
    if (!rows.length && !this.isAdmin()) throw new Error('Permesso negato');
  }

  async exportAll() {
    const out = { app: 'FantaMultiple', version: 1, exportedAt: new Date().toISOString() };
    for (const c of COLLECTIONS) out[c] = await this.getAll(c);
    return out;
  }

  /** Sostituisce tutti i dati online con quelli del backup */
  async importAll(obj) {
    if (!obj || obj.app !== 'FantaMultiple') throw new Error('File di backup non valido');
    if (!this.isAdmin()) throw new Error('Permesso negato');
    const isUuid = s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s));
    const newId = () => crypto.randomUUID();
    const remap = {};
    const fixId = id => (remap[id] ||= isUuid(id) ? id : newId());

    const teams = (obj.teams || []).map(t => ({ ...t, id: fixId(t.id) }));
    const teamIds = new Set(teams.map(t => t.id));
    const athletes = (obj.athletes || []).map(a => {
      const tid = a.teamId ? remap[a.teamId] || a.teamId : null;
      return { ...a, id: fixId(a.id), teamId: teamIds.has(tid) ? tid : null,
               birthYear: a.birthYear ? Number(a.birthYear) || null : null };
    });
    const athIds = new Set(athletes.map(a => a.id));
    const competitions = (obj.competitions || [])
      .map(c => ({ ...c, id: fixId(c.id), athleteId: remap[c.athleteId] || c.athleteId, date: c.date || null }))
      .filter(c => athIds.has(c.athleteId));

    // svuota (prima le tabelle "figlie") e reinserisce
    const NONE = '00000000-0000-0000-0000-000000000000';
    for (const c of ['competitions', 'athletes', 'teams'])
      SupabaseStore.check(await this.sb.from(c).delete().neq('id', NONE));
    for (const [c, rows] of [['teams', teams], ['athletes', athletes], ['competitions', competitions]]) {
      for (let i = 0; i < rows.length; i += 500) {
        SupabaseStore.check(await this.sb.from(c).insert(rows.slice(i, i + 500).map(SupabaseStore.toDb)));
      }
    }
  }

  // --- autenticazione reale con Supabase Auth ---
  isAdmin() { return !!this.user && (this.user.email || '').toLowerCase() === this.adminEmail; }
  async login(password) {
    const { data, error } = await this.sb.auth.signInWithPassword({ email: this.adminEmail, password });
    if (error) {
      if (/fetch|network/i.test(error.message)) throw new Error('Connessione assente');
      return false;
    }
    this.user = data.user; return true;
  }
  async logout() { await this.sb.auth.signOut(); this.user = null; }
}

/* ---------------- Scelta automatica ---------------- */
const LOCAL_DB = new LocalStore();
const DB = (typeof supabase !== 'undefined' && typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL && SUPABASE_KEY)
  ? new SupabaseStore(SUPABASE_URL, SUPABASE_KEY, ADMIN_EMAIL)
  : LOCAL_DB;
