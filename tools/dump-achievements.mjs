import { readFileSync, writeFileSync } from 'node:fs';
const tr = JSON.parse(readFileSync('i18n/tr.json','utf8')).achievements;
const en = JSON.parse(readFileSync('i18n/en.json','utf8')).achievements;
const src = readFileSync('js/achievements.js','utf8');

const MILESTONES = [25,50,100,200,350,500,750,1000];
const LEAF = JSON.parse(readFileSync('js/storage.js','utf8').match(/LEAF_REWARDS\s*=\s*(\[[^\]]*\])/)[1]);
const groups = [
  ['milestone', MILESTONES, id=>`ms_${id}`],
  ['smash', [10,30,75,150,300,600], id=>`smash_${id}`],
  ['runs', [5,25,100,500], id=>`runs_${id}`],
  ['jumps', [50,250,1000,5000], id=>`jumps_${id}`],
  ['time', [600,1800,3600,10800,36000], id=>`time_${id}`],
  ['runtime', [30,60,120,300], id=>`runtime_${id}`],
];
const fmtDur = (s, d) => s<60 ? `${s}${d.unit_s}` : s<3600 ? `${Math.floor(s/60)}${d.unit_m}` : `${Number.isInteger(s/3600)?s/3600:Math.round(s/360)/10}${d.unit_h}`;
const TIME = new Set(['time','runtime']);
const rows = [];
for (const [g, vals, mk] of groups) {
  vals.forEach((v,i) => {
    const n = TIME.has(g) ? null : v;
    const nt = TIME.has(g) ? fmtDur(v,tr) : v;
    const ne = TIME.has(g) ? fmtDur(v,en) : v;
    const sub = (s,x)=>s.replace('{n}',x);
    let reward = '-';
    if (g==='milestone') reward = `${LEAF[i] ?? LEAF[LEAF.length-1]} yaprak`;
    if (g==='smash') reward = ['40 kabuk','120 kabuk','320 kabuk','4 tuy','8 tuy','14 tuy'][i];
    rows.push({ id: mk(v), grup: tr[`group_${g}`],
      ad_tr: sub(tr[`${g}_name`],nt), ad_en: sub(en[`${g}_name`],ne),
      acik_tr: sub(tr[`${g}_desc`],nt), acik_en: sub(en[`${g}_desc`],ne), odul: reward });
  });
}
rows.push({ id:'musician', grup: tr.group_secret, ad_tr: tr.musician_name, ad_en: en.musician_name,
  acik_tr: tr.musician_desc, acik_en: en.musician_desc, odul: '- (gizli)' });

let md = `# Play Games / Game Center basarim listesi\n\n`;
md += `Oyundaki 32 basarimin tamami. Play Console ve App Store Connect'te bunlari\n`;
md += `elle olusturacaksin; **Yerel ID** sutunu koddaki karsiligi, olusturduktan\n`;
md += `sonra platformun verdigi ID'yi ilgili haritaya yazacagiz:\n\n`;
md += `- Play Games -> \`js/services/providers/playgames.js\` icindeki \`LOCAL_TO_PLAY\`\n`;
md += `- Game Center -> \`js/services/providers/gamecenter.js\` icindeki \`LOCAL_TO_GC\`\n`;
md += `  (onerilen GC ID bicimi: \`panthop.<yerel_id>\`)\n\n`;
md += `> Bu dosya \`node tools/dump-achievements.mjs\` ile uretildi; basarim tanimlari\n`;
md += `> degisirse yeniden uret.\n\n`;
md += `| # | Yerel ID | Grup | Ad (TR) | Aciklama (TR) | Ad (EN) | Odul |\n|---|---|---|---|---|---|---|\n`;
rows.forEach((r,i)=> md += `| ${i+1} | \`${r.id}\` | ${r.grup} | ${r.ad_tr} | ${r.acik_tr} | ${r.ad_en} | ${r.odul} |\n`);
md += `\nToplam: **${rows.length}** basarim.\n`;
writeFileSync('store/basarimlar.md', md);
console.log('store/basarimlar.md yazildi -', rows.length, 'satir');
