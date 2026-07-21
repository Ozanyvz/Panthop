#!/usr/bin/env node
/* ElevenLabs ses efekti ureticisi.

   Kullanim:
     node tools/gen-sfx-elevenlabs.mjs                  -> tabloyu listeler (uretmez)
     node tools/gen-sfx-elevenlabs.mjs eagle-screech    -> tek ses uretir
     node tools/gen-sfx-elevenlabs.mjs --missing        -> assets/sfx'te dosyasi olmayanlari uretir
     node tools/gen-sfx-elevenlabs.mjs --all            -> tablodaki her sesi uretir
     node tools/gen-sfx-elevenlabs.mjs jump land --takes 3   -> ses basina 3 varyant
     node tools/gen-sfx-elevenlabs.mjs --quota          -> kalan krediyi gosterir

   API anahtari: ELEVENLABS_API_KEY ortam degiskeni ya da repo kokundeki .env
   dosyasinda ELEVENLABS_API_KEY=... satiri (.env gitignore'da).

   Cikti repo kokundeki sfx-workshop/<isim>.mp3 dosyalarina yazilir (gitignore
   ve build disi) — mevcut .wav'larin USTUNE YAZMAZ. Begenilen dosya elle
   assets/sfx/'e tasinip js/audio.js'teki SFX tablosunda dosya adi guncellenir
   (WebAudio decodeAudioData mp3'u de cozer, uzanti onemli degil). */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SFX_DIR = path.join(ROOT, 'assets', 'sfx');
const OUT_DIR = path.join(ROOT, 'sfx-workshop');

/* isim -> { text: Ingilizce prompt, dur: saniye (0.5-22), inf: prompt_influence,
             loop: true ise sorunsuz loop icin bas/son elle kirpilmali }
   `file` mevcut oyundaki karsiligi (varsa) — --missing tespiti icin. */
const PROMPTS = {
  // --- Su an oyunda hic olmayan sesler ---
  'eagle-screech': { text: 'Realistic low-pitched raspy hawk cry, deep smooth natural bird of prey call with soft onset, echoing gently over a forest, warm round tone, no shrill high frequencies', dur: 1.2, inf: 0.45 },
  'eagle-death':   { text: 'Soft low-pitched bird squawk of defeat, muffled smooth natural tone, gentle rapid wing flutters descending and fading away, realistic field recording, no shrill screech', dur: 1.2, inf: 0.45 },

  // --- Mevcut placeholder'larin yenileme adaylari ---
  jump:            { file: 'jump.wav',           text: 'Quick springy cartoon jump hop, soft airy whoosh, pixel platformer sound effect', dur: 0.7 },
  'jump-start':    { file: 'jump_start.wav',     text: 'Soft quick takeoff puff, feet leaving ground, subtle game jump start', dur: 0.5 },
  'sprint-jump':   { file: 'sprint-jump.wav',    text: 'Powerful energetic leap with wind whoosh, charged super jump, arcade game sound', dur: 0.8 },
  land:            { file: 'land.wav',           text: 'Soft thud of small animal landing on grass, light impact, game sound effect', dur: 0.5 },
  land2:           { file: 'land2.wav',          text: 'Muffled soft landing thump on forest ground with faint leaf rustle, game sound', dur: 0.5 },
  climb:           { file: 'climb.wav',          text: 'Rapid light scratchy paw steps climbing up a tree trunk, steady rhythm, seamless loop', dur: 1.6, loop: true },
  'sprint-charge': { file: 'sprint-charge.wav',  text: 'Rising energy charge-up hum, building power whir, retro game loop', dur: 1.8, loop: true },
  'sprint-ready':  { file: 'sprint-ready.wav',   text: 'Bright short power-up ding, energy fully charged confirmation, arcade game sound', dur: 0.7 },
  death:           { file: 'death.wav',          text: 'Cartoon character hit and tumble, short descending fail sound, retro platformer death', dur: 1.2 },
  'sword-slash':   { file: 'sword-slash.wav',    text: 'Fast sharp blade slash whoosh cutting through air, quick swipe, game combat sound', dur: 0.7 },
  'sprint-smash':  { file: 'sprint-smash.wav',   text: 'Wooden obstacle smashing into pieces, crunchy break with debris, arcade game impact', dur: 0.9 },
  dodge:           { file: 'dodge.wav',          text: 'Quick swift dash whoosh sidestep, air swish, nimble evade game sound', dur: 0.6 },
  'feather-drop':  { file: 'feather-drop.wav',   text: 'Soft magical feather floating down, gentle airy shimmer, light game pickup', dur: 0.9 },
  'score-pop':     { file: 'score-pop.wav',      text: 'Cheerful tiny pop with sparkle, collecting a point, bright arcade blip', dur: 0.5 },
  'score-tick':    { file: 'score-tick.wav',     text: 'Very short subtle tick blip, minimal score counter increment, soft game UI sound', dur: 0.5 },
  'ui-tap':        { file: 'ui-tap.wav',         text: 'Clean soft menu button tap click, subtle UI confirmation, mobile game interface', dur: 0.5 },
  purchase:        { file: 'purchase.wav',       text: 'Happy purchase success chime with coin clink, shop buy confirmation, arcade game', dur: 0.8 },
  'purchase-fail': { file: 'purchase-fail.wav',  text: 'Gentle negative buzz, not enough coins denial, soft error tone, game UI', dur: 0.7 },
  'tab-switch':    { file: 'tab-switch.wav',     text: 'Quick soft swipe click, switching menu tab, snappy UI transition sound', dur: 0.5 },
  reset:           { file: 'reset.wav',          text: 'Short rewinding whoosh with a click, restart action, game UI sound', dur: 0.7 },
  'reward-2x':     { file: 'reward-2x.wav',      text: 'Exciting bonus multiplier fanfare, coins doubling jingle, rewarding arcade sound', dur: 1.2 },
  'ach-open':      { file: 'ach-open.wav',       text: 'Soft parchment page opening with a subtle chime, menu panel reveal, game UI', dur: 0.8 },
  'reward-collect':{ file: 'reward-collect.wav', text: 'Satisfying treasure collect jingle, short ascending sparkle arpeggio, game reward', dur: 0.9 },
  'wallet-land':   { file: 'wallet-land.wav',    text: 'Coins dropping into a pouch with soft thump, collected currency landing, game sound', dur: 0.7 },
  gameover:        { file: 'gameover.wav',       text: 'Melancholic short game over sting, gentle descending melody, retro arcade', dur: 1.5 },
  'new-best':      { file: 'new-best.wav',       text: 'Triumphant new high score fanfare, celebratory ascending jingle, arcade game victory', dur: 1.5 },
  milestone:       { file: 'milestone.wav',      text: 'Bright milestone achievement chime, rewarding bell arpeggio, positive game progress', dur: 1.2 },
  'count-up':      { file: 'count-up.wav',       text: 'Rapid ticking score counter rolling up, accelerating tally clicks, arcade game', dur: 1.2 },
  'coin-fly':      { file: 'coin-fly.wav',       text: 'Small coin whizzing through air into wallet, quick metallic zip, game UI sound', dur: 0.8 },
  'reveal-pop':    { file: 'reveal-pop.wav',     text: 'Playful bubble pop reveal, bouncy cartoon appearance, light game UI sound', dur: 0.6 },
};

function apiKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  const envFile = path.join(ROOT, '.env');
  if (existsSync(envFile)) {
    const m = readFileSync(envFile, 'utf8').match(/^ELEVENLABS_API_KEY\s*=\s*(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

async function showQuota(key) {
  const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': key } });
  if (!res.ok) throw new Error(`Abonelik sorgusu basarisiz: ${res.status} ${await res.text()}`);
  const s = await res.json();
  console.log(`Plan: ${s.tier} — kredi: ${s.character_count}/${s.character_limit} kullanilmis (kalan ${s.character_limit - s.character_count})`);
}

async function generate(key, name, spec, take, takes) {
  const res = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: spec.text,
      duration_seconds: spec.dur,
      prompt_influence: spec.inf ?? 0.35,
    }),
  });
  if (!res.ok) throw new Error(`${name}: API ${res.status} — ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const suffix = takes > 1 ? `-t${take}` : '';
  const file = path.join(OUT_DIR, `${name}${suffix}.mp3`);
  writeFileSync(file, buf);
  console.log(`  + ${path.relative(ROOT, file)} (${(buf.length / 1024).toFixed(0)} KB${spec.loop ? ', LOOP — bas/son kirpilmali' : ''})`);
}

async function main() {
  const args = process.argv.slice(2);
  const takes = Math.max(1, parseInt(args[args.indexOf('--takes') + 1], 10) || 1);
  const names = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--takes');

  let list;
  if (args.includes('--all')) list = Object.keys(PROMPTS);
  else if (args.includes('--missing')) list = Object.keys(PROMPTS).filter(n => !PROMPTS[n].file || !existsSync(path.join(SFX_DIR, PROMPTS[n].file)));
  else list = names;

  const key = apiKey();

  if (args.includes('--quota')) {
    if (!key) { console.error('API anahtari yok (ELEVENLABS_API_KEY ya da .env).'); process.exit(1); }
    await showQuota(key);
    if (!list.length) return;
  }

  if (!list.length) {
    console.log('Uretilebilecek sesler (isim vererek ya da --all/--missing ile calistir):\n');
    for (const [n, s] of Object.entries(PROMPTS)) {
      const has = s.file && existsSync(path.join(SFX_DIR, s.file));
      console.log(`  ${has ? ' ' : '*'} ${n.padEnd(15)} ${s.dur}s  ${s.text.slice(0, 60)}...`);
    }
    console.log('\n  * = oyunda karsiligi olmayan (eksik) ses');
    return;
  }

  const unknown = list.filter(n => !PROMPTS[n]);
  if (unknown.length) { console.error(`Tabloda olmayan isim(ler): ${unknown.join(', ')}`); process.exit(1); }
  if (!key) { console.error('API anahtari yok: ELEVENLABS_API_KEY ortam degiskeni ya da .env dosyasi gerekli.'); process.exit(1); }

  mkdirSync(OUT_DIR, { recursive: true });
  for (const name of list) {
    console.log(`${name} (${takes} varyant):`);
    for (let t = 1; t <= takes; t++) await generate(key, name, PROMPTS[name], t, takes);
  }
  console.log(`\nBitti. Dosyalar: ${path.relative(ROOT, OUT_DIR)}\\`);
  console.log('Begendiklerini assets/sfx/ icine tasiyip js/audio.js SFX tablosunu guncelle.');
}

main().catch(e => { console.error(e.message); process.exit(1); });
