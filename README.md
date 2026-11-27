# FantaMultiple

Sito statico (HTML + CSS + JS) per gestire squadre, atleti, gare e classifiche di prove multiple.
I punteggi usano le formule ufficiali World Athletics (Scoring Tables for Combined Events).

## Struttura
```
index.html        pagina unica (navigazione con #home, #squadre, #atleti, #gare, #classifica)
css/style.css     grafica
js/scoring.js     coefficienti WA, prove multiple, categorie e attrezzi
js/storage.js     livello dati (oggi localStorage, domani database)
js/app.js         logica dell'applicazione
.nojekyll         evita l'elaborazione Jekyll su GitHub Pages
```

## Pubblicazione su GitHub Pages
1. Carica tutti i file nella radice del repository (o nella cartella /docs).
2. Settings → Pages → Source: "Deploy from a branch" → branch `main`, cartella `/ (root)`.
3. Il sito sarà su `https://<utente>.github.io/<repository>/`.

## Amministratore
Pulsante "Admin" in alto a destra. La password è verificata tramite hash SHA-256.
Attenzione: su un sito statico il controllo è solo lato browser, quindi non è una vera protezione.
La sicurezza reale arriverà con il database (autenticazione lato server).

## Dati
- Salvati nel `localStorage` del browser: ogni browser/dispositivo ha i suoi dati.
- "Esporta backup" scarica un JSON; "Importa backup" (solo admin) lo ripristina.
- Per collegare un DB: crea una classe con gli stessi metodi di `LocalStore`
  (`getAll`, `get`, `add`, `update`, `remove`) in `js/storage.js` e assegnala a `DB`.
  C'è già uno scheletro `ApiStore` commentato.

## Personalizzazioni
- Composizione del "Decathlon indoor" (non ufficiale WA): `SCORING.MULTI.M.DEC_I` in `js/scoring.js`.
- Pesi attrezzi / altezze ostacoli per categoria: `SCORING.CATEGORIES`.
