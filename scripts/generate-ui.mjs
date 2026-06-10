// ============================================================
// Génère les écrans UI via Google Stitch
// Usage: STITCH_API_KEY=xxx node scripts/generate-ui.mjs
// ============================================================

import { stitch } from '@google/stitch-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'stitch-output');
fs.mkdirSync(OUT_DIR, { recursive: true });

const PROJECT_ID = '8263063259330264655';

const SCREENS = [
  {
    name: 'home',
    prompt: `Mobile foraging app home screen. Dark forest theme (#1a2215 background).
Top: mushroom emoji + "ChampIndex" title in gold gradient serif font.
Below: 3-pill toggle selector (Champignons green | Plantes blue | Baies purple) with active state.
Main CTA: green gradient button "📍 Utiliser ma position".
Below: amber gradient button "📸 Identifier une espèce (photo)".
3 secondary buttons in a row: "🌡️ Carte" | "🌲 Habitats" | "📓 Carnet".
Below: scrollable alert cards strip "À surveiller ce mois-ci" with species names.
Grid of 12 forest spot cards (2 columns) with tree emoji, forest name, region.
Bottom: notification toggle + footer credits. Mobile 390px width, dark UI, rounded corners everywhere.`,
  },
  {
    name: 'score-results',
    prompt: `Mobile foraging score results screen. Dark forest theme (#1a2215).
Top bar: location pin + "Forêt de Fontainebleau" + "Changer" amber button.
Tab bar: Score(active) | 7 jours | Terrain | Espèces with amber underline.
Main content: Large circular SVG gauge showing score 72/100 with green arc.
Level label "Favorable 🍄" below gauge.
5 weather factor cards: Rain 14d (45mm, ++), Rain 3d (12mm, +), Temperature (14°C, ++), Amplitude (10°C, +), Season (Automne, ++). Each with label, value, progress bar, impact badge.
Terrain bonus: +8 pts in green.
Advice card with lightbulb emoji and text.
Alert banner strip with species alert cards. Mobile 390px, dark rounded UI.`,
  },
  {
    name: 'species-card',
    prompt: `Mobile species identification card for a foraging app. Dark theme (#1a2215).
Card with rounded corners, subtle border. Header row: heart toggle, mushroom photo placeholder, species name "Cèpe de Bordeaux", latin name italic, badges on right (danger badge red "Confusion dangereuse ⚠️", rain badge blue "élevé").
Below: 12-month mini calendar strip (grey=inactive, green=season, amber=peak).
Expanded details section: description text, habitat tags (pills), tree essences, cooking tips with chef emoji, confusion warnings in colored bordered cards (red for mortal ☠️, amber for toxic ⚠️).
Personal notes area with edit button. Red disclaimer bar at bottom: "Ne consommez JAMAIS sans l'avis d'un expert".
For a DEADLY species, add prominent red banner "☠️ ESPÈCE MORTELLE" at top of card. Mobile 390px.`,
  },
  {
    name: 'identify',
    prompt: `Mobile plant identification screen using camera. Dark forest theme (#1a2215).
Top: back arrow + "Identifier" title + remaining count.
Red warning box: "L'identification par IA est INDICATIVE uniquement. Ne consommez JAMAIS..."
Two big buttons: "📸 Prendre une photo" (dashed green border, large) and "🖼️ Galerie" (subtle).
Tips card: photography advice with emoji bullets.
After photo taken: image preview with X close, organ selector (5 pills: Leaf/Flower/Fruit/Bark/Whole plant), green "Identifier" CTA button.
Results: ranked cards with PlantNet reference photos, confidence percentage (green/amber/red), species name, "Dans notre base" badge if matched, expandable details with confusions.
Red safety reminder at bottom with poison center numbers. Mobile 390px.`,
  },
  {
    name: 'heatmap',
    prompt: `Mobile fullscreen heatmap of France. Dark map tiles.
Floating buttons top-left: "← Retour", refresh icon, "📍 Spots ON/OFF" toggle (green when active).
Top-right: "🌡️ Carte de France" label with forest count.
Map shows France with heat overlay (blue=low, yellow=medium, orange=favorable, red=jackpot).
Forest location markers with emoji icons (🌲 forest, 🌊 coastal, 🌾 prairie).
Bottom-left: legend box "Probabilité champignons" with 6 color levels.
Bottom sheet (slide up): location name, department, habitat type, score box (72 in orange), weather stats grid (rain, temp, soil balance), alert dots, species probability bars.
Loading state: progress bar "2400/7766 forêts 31%". Full width, no max-width constraint.`,
  },
  {
    name: 'notebook',
    prompt: `Mobile foraging notebook/journal screen. Dark forest theme (#1a2215).
Header: back button + "Mon carnet" title.
3 tabs: ❤️ Favoris (with count badge) | 📍 Trouvailles | 📝 Notes. Amber active underline.
Favorites tab: list of species cards with emoji, name, latin name, red heart button.
Trouvailles tab: "+ Ajouter une trouvaille" green button, then cards with species emoji, name, location pin, date, quantity, notes text, delete trash icon.
Add form: species dropdown, location input, date picker, quantity input, notes textarea, Cancel/Save buttons.
Notes tab: cards with species emoji, name, date, note content.
Empty states with large emoji and helpful text. Mobile 390px, dark rounded UI.`,
  },
];

async function generateScreens() {
  const project = stitch.project(PROJECT_ID);

  for (const screen of SCREENS) {
    console.log(`\n🎨 Generating: ${screen.name}...`);
    try {
      const result = await project.generate(screen.prompt, 'MOBILE');

      const htmlUrl = await result.getHtml();
      const imageUrl = await result.getImage();

      console.log(`   HTML: ${htmlUrl}`);
      console.log(`   Image: ${imageUrl}`);

      // Download HTML
      if (htmlUrl) {
        const resp = await fetch(htmlUrl);
        if (resp.ok) {
          const html = await resp.text();
          fs.writeFileSync(path.join(OUT_DIR, `${screen.name}.html`), html);
          console.log(`   ✅ Saved ${screen.name}.html (${html.length} chars)`);
        }
      }

      // Download screenshot
      if (imageUrl) {
        const resp = await fetch(imageUrl);
        if (resp.ok) {
          const buf = Buffer.from(await resp.arrayBuffer());
          fs.writeFileSync(path.join(OUT_DIR, `${screen.name}.png`), buf);
          console.log(`   ✅ Saved ${screen.name}.png (${buf.length} bytes)`);
        }
      }
    } catch (e) {
      console.error(`   ❌ Failed: ${e.message}`);
    }
  }

  console.log(`\n✅ All screens generated in ${OUT_DIR}`);
}

generateScreens();
