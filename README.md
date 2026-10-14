# Noć mitova · Mythology Clicker

A clicker game across six mythologies: Croatian, Slavic, Norse, Greek, Roman and Egyptian. Tend the sacred fire, win over spirits and gods, greet the dawn for permanent bonuses, and defeat each myth's monster in a three-phase final battle. Playable in Croatian and English.

**Play:** https://saler-luka.github.io/mythology-clicker/

## How it plays

- **The fire:** click it to gather the myth's power (duh, žar, seiðr, ichor, numen or heka).
- **Spirits and gods:** nine per myth, each earning power every second.
- **Rites:** one-time upgrades taken from the folklore.
- **The bonus in the fire:** a fern flower, golden apple or blue lotus appears now and then; catch it for a boost or buried treasure.
- **Attacks:** the myth's monster (Veles, Typhon, Apep…) climbs toward you and steals power unless you strike it back.
- **Dawn:** end the night to earn permanent prestige rewards.
- **The great battle:** climb, hide and seek, and a final strike against the monster. Winning leaves a trophy by the fire and a morning sky.

Progress saves in the player's browser (local storage), separately for each myth.

## Development

```bash
npm install
npm run dev
```

The dev server shows extra test buttons at the bottom of the page for adding power and triggering an attack. They are hidden in the built site.

```bash
npm run build
```

builds the site into `dist/`. Every push to `main` builds and deploys to GitHub Pages through `.github/workflows/deploy.yml`.

## Code layout

| File | What it holds |
|---|---|
| `index.html` | Page markup |
| `src/style.css` | All styles; each myth swaps a few colour tokens |
| `src/i18n.js` | Interface text in Croatian and English |
| `src/myths.js` | The six myths: spirits, rites, monsters, battles, colours and numeral scripts, in both languages |
| `src/game.js` | Game logic, saving, fire scenes (canvas) and the final battle |
| `src/main.js` | Entry point |
