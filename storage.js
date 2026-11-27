/* =========================================================
   FantaMultiple - Livello dati
   Tutti i metodi sono asincroni (Promise): per passare a un
   database basta scrivere una classe con la stessa interfaccia
   (es. ApiStore con fetch verso un backend / Supabase / Firebase)
   e cambiare l'ultima riga: const DB = new ApiStore(...)
   ========================================================= */

class LocalStore {
  constructor(prefix = 'fantamultiple_v1') {
    this.prefix = prefix;
    this.collections = ['teams', 'athletes', 'competitions'];
  }

  _key(col) { return `${this.prefix}_${col}`; }

  _read(col) {
    try { return JSON.parse(localStorage.getItem(this._key(col))) || []; }
    catch { return []; }
  }

  _write(col, data) { localStorage.setItem(this._key(col), JSON.stringify(data)); }

  _id() {
    return (crypto.randomUUID ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2));
  }

  async getAll(col) { return this._read(col); }

  async get(col, id) { return this._read(col).find(x => x.id === id) || null; }

  async add(col, item) {
    const data = this._read(col);
    const rec = { ...item, id: this._id(), createdAt: new Date().toISOString() };
    data.push(rec);
    this._write(col, data);
    return rec;
  }

  async update(col, id, patch) {
    const data = this._read(col);
    const i = data.findIndex(x => x.id === id);
    if (i < 0) throw new Error('Elemento non trovato');
    data[i] = { ...data[i], ...patch, updatedAt: new Date().toISOString() };
    this._write(col, data);
    return data[i];
  }

  async remove(col, id) {
    this._write(col, this._read(col).filter(x => x.id !== id));
  }

  /** Backup completo in un oggetto JSON */
  async exportAll() {
    const out = { app: 'FantaMultiple', version: 1, exportedAt: new Date().toISOString() };
    this.collections.forEach(c => out[c] = this._read(c));
    return out;
  }

  /** Ripristina un backup (sovrascrive i dati attuali) */
  async importAll(obj) {
    if (!obj || obj.app !== 'FantaMultiple') throw new Error('File di backup non valido');
    this.collections.forEach(c => this._write(c, Array.isArray(obj[c]) ? obj[c] : []));
  }
}

/* ---- Esempio di scheletro per il futuro collegamento DB ----
class ApiStore {
  constructor(baseUrl) { this.base = baseUrl; }
  async getAll(col)        { return (await fetch(`${this.base}/${col}`)).json(); }
  async get(col, id)       { return (await fetch(`${this.base}/${col}/${id}`)).json(); }
  async add(col, item)     { return (await fetch(`${this.base}/${col}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(item) })).json(); }
  async update(col, id, p) { return (await fetch(`${this.base}/${col}/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(p) })).json(); }
  async remove(col, id)    { await fetch(`${this.base}/${col}/${id}`, { method:'DELETE' }); }
}
-------------------------------------------------------------- */

const DB = new LocalStore();
