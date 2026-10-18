// Actualización con datos ficticios existentes. Firestore simulado: nunca toca una cuenta real.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { OWNER_SETTINGS, seedOwner } from './owner-fixture.mjs';
const { chromium } = createRequire(path.join(process.env.PW_DIR || process.cwd(), 'x.js'))('playwright');
const dir = process.argv[2];
if (!dir) throw new Error('Falta la copia web de pruebas');
const server = http.createServer((q, r) => {
  const file = path.join(dir, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]);
  fs.readFile(file, (e, bytes) => { if (e) { r.writeHead(404); r.end(); return; } r.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.woff2') ? 'font/woff2' : 'text/html'); r.end(bytes); });
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL === 'chromium' ? undefined : 'msedge', headless: true });
const retired = ['importSym1', 'importSym2', 'importSym3', 'symDate9', 'weekFix1', 'hevyImport1', 'symImport2', 'planFix2'];
let fail = 0;
try {
  for (const missingFlags of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route(/googleapis|gstatic|google\.com|firebase/, route => route.abort());
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.clock.setFixedTime(new Date('2026-10-19T12:00:00Z'));
    await seedOwner(page, OWNER_SETTINGS);
    const settings = structuredClone(OWNER_SETTINGS);
    if (missingFlags) for (const key of retired) delete settings[key];
    await page.addInitScript(({ settings, retired }) => {
      if (sessionStorage.getItem('preserve-seeded')) return;
      sessionStorage.setItem('preserve-seeded', '1');
      localStorage.setItem('cdh.settings', JSON.stringify(settings));
      localStorage.setItem('cdh.newsSeen', '"n6"');
      const keys = ['sessions', 'plans', 'gyms'];
      const data = {}; for (const key of keys) data[key] = JSON.parse(localStorage.getItem('cdh.' + key));
      data.prof = settings.prof; data.body = settings.body;
      data.flags = retired.map(key => [key, settings[key] ?? null]);
      sessionStorage.setItem('preserve-before', JSON.stringify(data));
    }, { settings, retired });
    const snapshot = () => page.evaluate(retired => ({ sessions: state.sessions, plans: state.plans, gyms: state.gyms, prof: state.settings.prof, body: state.settings.body, flags: retired.map(key => [key, state.settings[key] ?? null]) }), retired);
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
    await page.waitForTimeout(1200);
    const before = await page.evaluate(() => JSON.parse(sessionStorage.getItem('preserve-before')));
    assert.deepEqual(await snapshot(), before, 'datos existentes idénticos después del arranque');
    await page.reload(); await page.waitForTimeout(1200);
    assert.deepEqual(await snapshot(), before, 'datos existentes idénticos después de reabrir');
    console.log(`ok: dueño existente, indicadores ${missingFlags ? 'ausentes' : 'presentes'}: perfil, cuerpo, planes, gimnasios y sesiones intactos`);
    const cloud = await page.evaluate(async () => {
      const copy = x => JSON.parse(JSON.stringify(x));
      const doc = { v: 2, profile: { plans: copy(state.plans), gyms: copy(state.gyms), settings: copy(sync.shared()) }, sessions: copy(state.sessions.map(cleanSess)), daily: copy(state.daily), tomb: {} };
      let remote = copy(doc), writes = [];
      fb.auth = { acc: 'fixture-account', uid: 'fixture-account' };
      fb.fs = async (method, target, query, body) => {
        if (method === 'GET') return { fields: { data: fb.str(JSON.stringify(remote)) }, updateTime: 'fixture-version' };
        if (method !== 'PATCH') throw new Error('Operación inesperada: ' + method);
        const next = JSON.parse(body.fields.data.stringValue); writes.push(next); remote = next;
        return {};
      };
      sync.on = () => true; sync.busy = false;
      const read = await sync.readRemote();
      await sync.run();
      return { read: read.doc, doc, remote, writes, status: sync.status };
    });
    assert.deepEqual(cloud.read, cloud.doc, 'lectura de Firestore conserva el documento');
    assert.equal(cloud.status, 'ok', 'sincronización simulada correcta');
    assert.deepEqual(cloud.remote.sessions, cloud.doc.sessions, 'Firestore conserva las sesiones');
    assert.deepEqual(cloud.remote.profile.plans, cloud.doc.profile.plans, 'Firestore conserva planes');
    assert.deepEqual(cloud.remote.profile.settings.prof, cloud.doc.profile.settings.prof, 'Firestore conserva perfil');
    assert.deepEqual(cloud.remote.profile.settings.body, cloud.doc.profile.settings.body, 'Firestore conserva medidas');
    assert.deepEqual(await snapshot(), before, 'sin reinsertar ni cambiar datos tras sincronizar');
    assert.deepEqual(errors, []);
    console.log('ok: lectura y sincronización de Firestore simulado, sin borrados, cambios de entrenamiento ni migraciones personales');
    await context.close();
  }
} catch (e) { fail++; console.error(e); }
finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
process.exitCode = fail ? 1 : 0;
