// ============================================================================
// THE COUNTER'S OBJECTS AND THEIR MOTION, CHECKED — Step 11, row 11.2 (2026-11-21).
//
// Reads, beside it: objetos.json (the objects as React Native draws them),
// movimiento.json (the four motions as data), objetos/*.svg and the pictures
// brand/render-mostrador.sh drew from them in png/, and paleta.json (row 11.1).
// Asserts, by group:
//   1. every drawing is rendered at 1x, 2x and 3x, at its own size in points;
//   2. a picture is one colour and its drawing is its alpha — black for the
//      ones tinted at runtime, white for the counter's paper;
//   3. ⚠️ THE PAPER ONLY LIGHTENS: every pixel of it laid over each ground it
//      covers, none darker than the flat ground, and every ink paleta.json
//      measures there still clears 4.5:1 at the darkest and the lightest result;
//   4. the paper is seamless — its wrap-around seams are no rougher than its
//      inside;
//   5. the stamp is inked (its edges and specks are partly transparent) and the
//      specks wear a word stamp without erasing it;
//   6. ⚠️ THE MOTIONS MOVE ONLY TRANSFORM AND OPACITY (ADR-035 §2.11), their
//      keyframes run from 0 to 1, their curves are curves, and whatever answers
//      a tap has ended 300 ms after it — sequences included;
//   7. a resting turn for every place on a card, as many as the database allows
//      (0085's card_terms_stamps, read from the migration);
//   8. the objects name real roles and drawings; a word stamp's words are words
//      the apps already say (their strings.ts); Letra grande's stroke is larger.
//
// It exits 1 on any failure. No workflow runs it (brand/ is read by none). Run:
//   node brand/mostrador/objetos.mjs
// ============================================================================

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readPng } from './png.mjs';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const repo = (p) => here(`../../${p}`);
const json = (p) => JSON.parse(readFileSync(here(p), 'utf8'));

const objetos = json('./objetos.json');
const movimiento = json('./movimiento.json');
const { apps, medir } = json('./paleta.json');

const FLOOR = 4.5;
const fallas = [];
let grupos = 0;
function grupo(nombre, cuerpo) {
  const antes = fallas.length;
  cuerpo();
  grupos++;
  const nuevas = fallas.slice(antes);
  console.log(`${nuevas.length === 0 ? '  ok  ' : '  FAIL'}  ${nombre}`);
  for (const f of nuevas) console.log(`          ${f}`);
}
const falla = (m) => fallas.push(m);

function luminance(rgb) {
  const c = rgb.map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// ---------------------------------------------------------------------------
// The drawings and their pictures.
const fuentes = readdirSync(here('./objetos/')).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)).sort();
function tamano(nombre) {
  const primera = readFileSync(here(`./objetos/${nombre}.svg`), 'utf8').split('\n')[0];
  const w = Number(/ width="([0-9.]+)"/.exec(primera)?.[1]);
  const h = Number(/ height="([0-9.]+)"/.exec(primera)?.[1]);
  return { w, h };
}
const fotos = {};

grupo(`1. every drawing (${fuentes.length}) is drawn at 1x, 2x and 3x, at its size in points`, () => {
  if (fuentes.length === 0) falla('no drawing in objetos/');
  for (const nombre of fuentes) {
    const { w, h } = tamano(nombre);
    if (!(w > 0 && h > 0)) {
      falla(`${nombre}.svg: no width and height on its first line`);
      continue;
    }
    for (const s of [1, 2, 3]) {
      const archivo = `./png/${nombre}${s === 1 ? '' : `@${s}x`}.png`;
      if (!existsSync(here(archivo))) {
        falla(`${archivo} is missing — run bash brand/render-mostrador.sh`);
        continue;
      }
      const foto = readPng(here(archivo));
      const [ew, eh] = [Math.round(w * s), Math.round(h * s)];
      if (foto.width !== ew || foto.height !== eh) falla(`${archivo}: ${foto.width} x ${foto.height}, its drawing says ${ew} x ${eh}`);
      if (s === 3) fotos[nombre] = foto;
    }
  }
});

function medida(foto) {
  const n = foto.width * foto.height;
  let suma = 0;
  let parcial = 0;
  let pintado = 0;
  let maxA = 0;
  const colores = new Set();
  for (let i = 0; i < n; i++) {
    const a = foto.rgba[i * 4 + 3];
    suma += a;
    if (a > maxA) maxA = a;
    if (a > 0) {
      pintado++;
      if (a < 255) parcial++;
      colores.add(`${foto.rgba[i * 4]},${foto.rgba[i * 4 + 1]},${foto.rgba[i * 4 + 2]}`);
    }
  }
  return { media: suma / n / 255, maxA: maxA / 255, parcial: parcial / Math.max(1, pintado), pintado: pintado / n, colores };
}

const PAPEL = objetos.papel.dibujo;

grupo('2. a picture is one colour, and its drawing is its alpha (black to be tinted; the paper white)', () => {
  for (const [nombre, foto] of Object.entries(fotos)) {
    const m = medida(foto);
    const debe = nombre === PAPEL ? '255,255,255' : '0,0,0';
    if (m.pintado === 0) falla(`${nombre}: nothing drawn`);
    const otros = [...m.colores].filter((c) => c !== debe);
    if (otros.length > 0) falla(`${nombre}: ${otros.length} colour(s) besides ${debe}, e.g. ${otros.slice(0, 3).join(' / ')}`);
  }
});

grupo('3. the counter\'s paper only lightens: every ink on every ground it covers still clears 4.5:1', () => {
  const foto = fotos[PAPEL];
  if (!foto) return falla(`${PAPEL}@3x.png is missing`);
  const m = medida(foto);
  const lineas = [];
  for (const [app, roles] of Object.entries(apps)) {
    for (const fondo of objetos.papel.fondos) {
      if (!roles[fondo] || !medir[app].fondos.includes(fondo)) continue;
      const g = hex(roles[fondo]);
      // Every pixel of the paper laid over the flat ground, as the phone composites it; the darkest
      // and the lightest result are what an ink can land on. ⚠️ Measured, not assumed from group 2.
      let [oscuro, claro] = [null, null];
      let [lo, hi] = [Infinity, -Infinity];
      for (let i = 0; i < foto.width * foto.height; i++) {
        const a = foto.rgba[i * 4 + 3] / 255;
        const c = [0, 1, 2].map((k) => g[k] * (1 - a) + foto.rgba[i * 4 + k] * a);
        const l = luminance(c);
        if (l < lo) [lo, oscuro] = [l, c];
        if (l > hi) [hi, claro] = [l, c];
      }
      const medio = g.map((v) => v + (255 - v) * m.media);
      if (lo < luminance(g) - 1e-9) falla(`${app}: the paper darkens ${fondo}`);
      let peor = Infinity;
      let cual = '';
      for (const tinta of medir[app].tintas) {
        const t = hex(roles[tinta]);
        for (const suelo of [oscuro, claro]) {
          const r = contrast(t, suelo);
          if (r < peor) [peor, cual] = [r, tinta];
          if (r < FLOOR) falla(`${app}: ${tinta} on ${fondo} under the paper ${r.toFixed(2)}`);
        }
      }
      const hoja = contrast(hex(roles.superficie), medio);
      lineas.push(`${app} ${fondo}: lowest ${cual} ${peor.toFixed(2)}; a sheet on it ${hoja.toFixed(2)}:1 (flat ${contrast(hex(roles.superficie), g).toFixed(2)})`);
    }
  }
  console.log(`          the paper: ${(m.media * 100).toFixed(1)}% white on average, at most ${(m.maxA * 100).toFixed(0)}% on a pixel, ${(m.pintado * 100).toFixed(0)}% of pixels touched`);
  for (const l of lineas) console.log(`          ${l}`);
  if (m.media > 0.1) falla(`the paper lightens the counter ${(m.media * 100).toFixed(1)}% on average — over 10%, a sheet stops standing out`);
});

grupo('4. the counter\'s paper is seamless', () => {
  const foto = fotos[PAPEL];
  if (!foto) return;
  const { width: w, height: h, rgba } = foto;
  const a = (x, y) => rgba[((y % h) * w + (x % w)) * 4 + 3];
  const salto = (x0, y0, dx, dy, n) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Math.abs(a(x0 + i * dy, y0 + i * dx) - a(x0 + i * dy + dx, y0 + i * dx + dy));
    return s / n;
  };
  let dentroX = 0;
  for (let x = 0; x < w - 1; x++) dentroX += salto(x, 0, 1, 0, h);
  dentroX /= w - 1;
  let dentroY = 0;
  for (let y = 0; y < h - 1; y++) dentroY += salto(0, y, 0, 1, w);
  dentroY /= h - 1;
  const bordeX = salto(w - 1, 0, 1, 0, h);
  const bordeY = salto(0, h - 1, 0, 1, w);
  console.log(`          left to right edge ${bordeX.toFixed(1)} against ${dentroX.toFixed(1)} inside; top to bottom ${bordeY.toFixed(1)} against ${dentroY.toFixed(1)}`);
  if (bordeX > dentroX * 2 || bordeY > dentroY * 2) falla('a seam: the step across the tile\'s edge is over twice the step inside it');
});

grupo('5. the stamp is inked, and the specks wear a word without erasing it', () => {
  const sello = fotos[objetos.sello.vaca.dibujo];
  const motas = fotos[objetos.sello.palabra.motas];
  if (!sello || !motas) return falla('the stamp or the specks are missing');
  const s = medida(sello);
  const mo = medida(motas);
  console.log(`          the stamp: ${(s.parcial * 100).toFixed(0)}% of its ink partly transparent; the specks cover ${(mo.media * 100).toFixed(1)}% of a word stamp`);
  if (s.parcial < 0.15) falla(`the stamp's ink is ${(s.parcial * 100).toFixed(0)}% partly transparent — under 15%, it reads printed, not inked`);
  if (mo.media < 0.02 || mo.media > 0.08) falla(`the specks cover ${(mo.media * 100).toFixed(1)}% — outside 2% to 8%, they vanish or eat the word`);
});

grupo('6. the motions move only transform and opacity, and what answers a tap has ended within 300 ms', () => {
  const permitidas = new Set(movimiento.reglas.propiedades);
  const limite = movimiento.reglas.conToque;
  for (const [id, mv] of Object.entries(movimiento.movimientos)) {
    const f = mv.fotogramas ?? [];
    if (f.length < 2) falla(`${id}: fewer than two keyframes`);
    if (f[0]?.en !== 0 || f[f.length - 1]?.en !== 1) falla(`${id}: keyframes must run from 0 to 1`);
    f.forEach((k, i) => {
      if (i > 0 && !(k.en > f[i - 1].en)) falla(`${id}: keyframe ${i} does not come after ${i - 1}`);
      for (const clave of Object.keys(k)) {
        if (clave !== 'en' && clave !== 'curva' && !permitidas.has(clave)) falla(`${id}: keyframe ${i} moves ${clave} — only ${[...permitidas].join(', ')}`);
      }
      if (k.curva !== undefined) {
        const c = k.curva;
        if (!Array.isArray(c) || c.length !== 4 || c.some((v) => typeof v !== 'number') || c[0] < 0 || c[0] > 1 || c[2] < 0 || c[2] > 1) {
          falla(`${id}: keyframe ${i}'s curve is not a cubic Bézier (x between 0 and 1)`);
        }
      } else if (i < f.length - 1) falla(`${id}: keyframe ${i} has no curve to the next`);
    });
    if (!(mv.duracion > 0)) falla(`${id}: no duration`);
    if (mv.conToque && mv.duracion + (mv.retraso ?? 0) > limite) falla(`${id} answers a tap and lasts ${mv.duracion + (mv.retraso ?? 0)} ms — over ${limite}`);
    if (!Array.isArray(mv.donde) || mv.donde.length === 0) falla(`${id}: says nowhere it goes`);
  }
  if (!movimiento.reglas.menosMovimiento) falla('no rule for a phone that asks for less motion');
  for (const [id, sq] of Object.entries(movimiento.secuencias ?? {})) {
    let fin = 0;
    let conToque = false;
    for (const p of sq.pasos) {
      const mv = movimiento.movimientos[p.movimiento];
      if (!mv) {
        falla(`sequence ${id}: no motion ${p.movimiento}`);
        continue;
      }
      conToque ||= mv.conToque;
      fin = Math.max(fin, p.en + (mv.retraso ?? 0) + mv.duracion);
    }
    console.log(`          sequence ${id}: ends ${fin} ms after the tap`);
    if (conToque && fin > limite) falla(`sequence ${id} answers a tap and ends ${fin} ms after it — over ${limite}`);
  }
});

grupo('7. a resting turn for every place on a card, as many as the database allows', () => {
  const archivo = readdirSync(repo('supabase/migrations')).filter((f) => f.endsWith('.sql')).sort()
    .filter((f) => /constraint card_terms_stamps check/.test(readFileSync(repo(`supabase/migrations/${f}`), 'utf8'))).pop();
  if (!archivo) return falla('no migration defines card_terms_stamps');
  const max = Number(/constraint card_terms_stamps check \(stamps between \d+ and (\d+)\)/.exec(readFileSync(repo(`supabase/migrations/${archivo}`), 'utf8'))?.[1]);
  if (!(max > 0)) return falla(`${archivo}: card_terms_stamps is not "between N and M"`);
  const giros = objetos.sello.giros;
  console.log(`          ${giros.length} turns for a card of up to ${max} stamps (${archivo})`);
  if (giros.length < max) falla(`${giros.length} turns, and a card may hold ${max} stamps`);
  giros.forEach((g, i) => {
    if (Math.abs(g) > 10 || g === 0) falla(`turn ${i} is ${g}° — a stamp is a little turned: between 1 and 10 degrees either way`);
    if (i > 0 && Math.sign(g) === Math.sign(giros[i - 1])) falla(`turns ${i - 1} and ${i} lean the same way`);
  });
});

grupo('8. the objects name real roles and drawings, and a word stamp says only what the apps say', () => {
  const roles = new Set(Object.values(apps).flatMap((r) => Object.keys(r)));
  for (const papel of [objetos.boleto.perforacion.color, objetos.boleto.perforacion.colorSobreAccion, objetos.etiqueta.color, objetos.pestana.trazo.color, ...Object.values(objetos.pestana.trazo.colorPorPestana), ...objetos.papel.fondos]) {
    if (!roles.has(papel)) falla(`${papel} is no app's palette role`);
  }
  for (const dibujo of [objetos.boleto.muesca.dibujo, objetos.sello.vaca.dibujo, objetos.sello.palabra.motas, objetos.etiqueta.punta.dibujo, objetos.pestana.trazo.dibujo, objetos.papel.dibujo]) {
    if (!fuentes.includes(dibujo)) falla(`no drawing objetos/${dibujo}.svg`);
  }
  const muesca = tamano(objetos.boleto.muesca.dibujo);
  if (muesca.w !== objetos.boleto.muesca.radio) falla(`the notch's drawing is ${muesca.w} wide and its radius ${objetos.boleto.muesca.radio}`);
  const { normal, grande } = objetos.pestana.trazo;
  if (!(grande[0] > normal[0] && grande[1] > normal[1])) falla('the stroke under the tab is not larger at Letra grande');
  const trazo = tamano(objetos.pestana.trazo.dibujo);
  if (trazo.w !== normal[0] || trazo.h !== normal[1]) falla(`the stroke is drawn ${trazo.w} x ${trazo.h} and used ${normal.join(' x ')}`);
  const dichos = ['app/src/strings.ts', 'cocina/src/strings.ts', 'itacate/src/strings.ts'].map((f) => readFileSync(repo(f), 'utf8')).join('\n');
  for (const palabra of objetos.sello.palabra.palabras) {
    if (!dichos.includes(`'${palabra}'`)) falla(`"${palabra}" is in no app's strings.ts — a stamp says only what the apps already say`);
  }
});

console.log(fallas.length === 0 ? `\nall ${grupos} assertion groups passed` : `\n${fallas.length} failure(s)`);
process.exit(fallas.length === 0 ? 0 : 1);
