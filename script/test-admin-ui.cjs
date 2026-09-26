/* Isolated production frontend acceptance. All APIs are fixtures; external traffic is blocked. */
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const pw = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const engine = process.env.UI_BROWSER || 'chromium'; assert.ok(['chromium', 'webkit'].includes(engine));
const output = process.env.UI_REPORT || '/tmp/govza-admin-ui'; fs.mkdirSync(output, { recursive: true });
const root = path.resolve('dist/public');
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let target = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!target.startsWith(root + path.sep) && target !== root) { res.writeHead(403).end(); return; }
  if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) target = path.join(root, 'index.html');
  res.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream'); fs.createReadStream(target).pipe(res);
});
const stamp = '2026-09-20T10:00:00.000Z';
const provider = { id: 101, ownerUserId: 1, providerType: 'master', dataSource: 'manual', visible: true, effectiveData: { name: 'Тестовый мастер', phone: '+70000000000', city: 'Грозный', categoryIds: [1], description: 'Описание профиля для тестирования интерфейса.' }, verification: { status: 'pending', note: null, updatedAt: stamp } };
const supplier = { id: 201, ownerUserId: null, name: 'Тестовый автомагазин', supplierType: 'store', partsCondition: 'mixed', salesType: 'retail', city: 'Грозный', address: 'Тестовый адрес', phone: '+70000000000', whatsapp: '', website: '', description: '', brands: ['Lada'], partGroups: ['Кузов'], vehicleTypes: ['passenger'], vehicleOrigins: ['domestic'], pickup: true, delivery: false, visible: true, dataSource: 'manual', verified: false };
const doctor = { id: 301, visible: true, origin: 'manual', updatedAt: stamp, record: { id: 301, name: 'Тестовый врач', specialty: 'Терапевт', specialtyId: 'therapist', phone: '+70000000000', price: 'По запросу', experienceYears: 7, rating: 0, reviews: 0, avatar: '', locations: [{ clinic: 'Тестовая клиника', city: 'Грозный', address: 'Тестовый адрес', schedule: 'По записи' }] } };
const city = { id: 401, visible: true, origin: 'manual', updatedAt: stamp, record: { id: 401, categoryId: 'contacts', name: 'Тестовая организация', subcategory: 'Сервис', phone: '+70000000000', address: '', hours: '', district: '' } };
const category = { id: 1, name: 'Сантехника', iconName: 'Wrench', emoji: '🔧', color: '#0B8FB6' };
const verification = { providerId: 101, name: 'Тестовый мастер', companyName: null, providerType: 'master', ownerUserId: 1, status: 'pending', note: null, documentCount: 1, submittedAt: stamp, updatedAt: stamp, providerComment: '' };
const sections = { overview: 'Обзор', providers: 'Мастера и организации', verifications: 'Проверка документов', doctors: 'Врачи', 'auto-parts': 'Автозапчасти', 'city-services': 'Городские службы', categories: 'Категории', users: 'Пользователи', imports: 'Импорт данных', audit: 'Журнал действий' };
let browser, origin; const results = [];
async function check(name, fn) { try { await fn(); results.push({ name, status: 'passed' }); console.log('PASS', name); } catch (e) { results.push({ name, status: 'failed', error: e.message }); console.error('FAIL', name, e.message); } }
async function context(role = 'admin') {
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  const state = { posts: [], adminGets: [], failNext: false, failLoad: false, deny: false, providers: [structuredClone(provider)], suppliers: [structuredClone(supplier)], doctors: [structuredClone(doctor)], city: [structuredClone(city)] };
  await ctx.addInitScript(() => { localStorage.setItem('welcome-onboarding-seen', '1'); localStorage.setItem('govza-install-dismissed-at', String(Date.now())); });
  await ctx.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url()), p = url.pathname;
    if (url.hostname !== '127.0.0.1') return route.abort();
    if (!p.startsWith('/api/')) return route.continue();
    let body = [], status = 200;
    if (p.startsWith('/api/admin/')) {
      if (req.method() === 'GET') state.adminGets.push(p);
      else state.posts.push({ path: p, body: req.postData() ? req.postDataJSON() : null, headers: req.headers(), method: req.method() });
      if (state.deny) return route.fulfill({ status: 403, contentType: 'application/json', body: '{"message":"Доступ запрещён"}' });
      if ((req.method() !== 'GET' && state.failNext) || (req.method() === 'GET' && state.failLoad)) { state.failNext = false; return route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Тестовая ошибка сервера"}' }); }
    }
    if (p === '/api/auth/me') body = { user: role ? { id: 9001, name: 'Тестовый администратор', role, email: 'admin@example.invalid' } : null };
    else if (p === '/api/admin/summary') body = { totalProviders: 84, importedProviders: 48, hiddenProviders: 5, pendingVerifications: 3, users: 248 };
    else if (p === '/api/admin/providers') body = state.providers.filter(x => !url.searchParams.get('q') || x.effectiveData.name.toLowerCase().includes(url.searchParams.get('q').toLowerCase()));
    else if (/\/providers\/101\/visibility$/.test(p)) { state.providers[0].visible = req.postDataJSON().visible; body = {}; }
    else if (/\/providers\/101$/.test(p) && req.method() === 'PATCH') { Object.assign(state.providers[0].effectiveData, req.postDataJSON()); body = {}; }
    else if (p === '/api/admin/categories') body = [category];
    else if (p === '/api/admin/directories/doctors') body = state.doctors;
    else if (p === '/api/admin/directories/doctors/301' && req.method() === 'PATCH') { Object.assign(state.doctors[0].record, req.postDataJSON()); body = {}; }
    else if (p === '/api/admin/directories/city-services') body = state.city;
    else if (p === '/api/admin/auto-parts/suppliers') body = state.suppliers;
    else if (p === '/api/admin/auto-parts/organization-accounts') body = [{ id: 88, name: 'Тестовый владелец', phone: '+70000000000', email: null }];
    else if (p.endsWith('/201/owner')) { state.suppliers[0].ownerUserId = req.postDataJSON().ownerUserId; body = {}; }
    else if (p === '/api/admin/verifications') body = [verification];
    else if (p === '/api/admin/verifications/101') body = { status: 'pending', note: null, submission: { documents: [{ id: 'doc1', type: 'other', title: 'Тестовый документ', image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6SUAAAAASUVORK5CYII=' }], providerComment: '', submittedAt: stamp }, events: [] };
    else if (p === '/api/admin/import/config') body = { enabled: false, configurationError: null, intervalMinutes: 60, runOnStartup: false, sources: [] };
    else if (p === '/api/admin/import/runs') body = [];
    else if (p === '/api/admin/audit') body = [{ id: 1, adminName: 'Тестовый администратор', action: 'provider.update', entityType: 'provider', entityId: '101', createdAt: stamp, details: { fields: ['name'] } }];
    else if (p === '/api/admin/users') { const q = url.searchParams.get('q') || '', page = Number(url.searchParams.get('page') || 1); body = { total: q ? 0 : 41, page, pageSize: 20, items: q ? [] : Array.from({ length: page === 3 ? 1 : 20 }, (_, i) => ({ id: i + (page - 1) * 20 + 1, name: `Тестовый пользователь ${i + (page - 1) * 20 + 1}`, email: `test${i}@example.invalid`, role: 'client', createdAt: stamp })) }; }
    else if (p.includes('count')) body = { count: 0 };
    return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return { ctx, state };
}
async function loaded(page) { await page.locator('h1').waitFor(); await page.waitForTimeout(300); await page.waitForFunction(() => !Array.from(document.querySelectorAll('[role="status"]')).some(e => e.textContent.includes('Загружаем'))); }
async function visit(page, section) { await page.goto(`${origin}/admin?section=${section}`); await loaded(page); }
async function bounds(page) { const b = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth })); assert.ok(b.scroll <= b.client + 1, JSON.stringify(b)); }
(async () => {
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); origin = `http://127.0.0.1:${server.address().port}`;
    browser = await pw[engine].launch({ ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}), headless: true });
    const { ctx, state } = await context(); const page = await ctx.newPage(); page.setDefaultTimeout(7000);
    for (const [w, h] of [[320,720],[390,844],[768,1024],[1024,768],[1440,1000]]) {
      await page.setViewportSize({ width: w, height: h });
      for (const [id, label] of Object.entries(sections)) await check(`${id} layout ${w}`, async () => {
        await visit(page, id); await page.getByRole('heading', { name: label, exact: true }).waitFor(); await bounds(page);
        if (['overview','providers','users'].includes(id) && [390,1440].includes(w)) await page.screenshot({ path: path.join(output, `${id}-${w}.png`) });
      });
    }
    await page.setViewportSize({ width:390,height:844 });
    await check('mobile navigation and URL are synchronized', async () => { await visit(page,'overview'); await page.getByRole('button',{name:'Разделы админ-панели',exact:true}).click(); await page.locator('[data-testid="admin-nav-doctors"]:visible').click(); await page.getByRole('heading',{name:'Врачи',exact:true}).waitFor(); assert.ok(page.url().includes('section=doctors')); });
    await check('browser back and refresh preserve section', async () => { await page.goBack(); await page.getByRole('heading',{name:'Обзор',exact:true}).waitFor(); await visit(page,'audit'); await page.reload(); await loaded(page); await page.getByRole('heading',{name:'Журнал действий',exact:true}).waitFor(); });
    await check('provider editor uses named categories and fits mobile', async () => { await visit(page,'providers'); await page.getByRole('button',{name:'Изменить',exact:true}).click(); const panel = page.getByRole('dialog'); await panel.waitFor(); await panel.getByLabel('Имя или название').waitFor(); await panel.getByLabel('Сантехника',{exact:true}).waitFor(); await page.waitForTimeout(250); const b = await panel.boundingBox(); assert.ok(b.x>=0 && b.x+b.width<=391 && b.y+b.height<=845); await page.screenshot({path:path.join(output,'provider-editor-390.png')}); });
    await check('dirty form dismissal requires confirmation and preserves input', async () => { const panel=page.getByRole('dialog'); await panel.getByLabel('Имя или название').fill('Изменённый тестовый мастер'); await panel.getByRole('button',{name:'Отмена',exact:true}).click(); await page.getByRole('alertdialog').getByRole('button',{name:'Отмена',exact:true}).click(); assert.equal(await page.getByLabel('Имя или название').inputValue(),'Изменённый тестовый мастер'); });
    await check('failed saves keep edits; retry sends one protected mutation', async () => { state.failNext=true; const n=state.posts.length; await page.getByRole('dialog').getByRole('button',{name:'Сохранить',exact:true}).click(); await page.getByRole('dialog').getByText('Тестовая ошибка сервера').waitFor(); assert.equal(await page.getByLabel('Имя или название').inputValue(),'Изменённый тестовый мастер'); await page.getByRole('dialog').getByRole('button',{name:'Сохранить',exact:true}).click(); await page.getByRole('dialog').waitFor({state:'hidden'}); assert.equal(state.posts.length,n+2); assert.ok(state.posts.slice(n).every(p=>p.headers['x-govza-admin']==='1')); });
    await check('visibility cancellation sends no write', async () => { const n=state.posts.length; await page.getByRole('button',{name:'Скрыть',exact:true}).click(); await page.getByRole('alertdialog').getByRole('button',{name:'Отмена',exact:true}).click(); assert.equal(state.posts.length,n); });
    await check('visibility change explicit and reversible', async () => { await page.getByRole('button',{name:'Скрыть',exact:true}).click(); await page.getByRole('alertdialog').getByRole('button',{name:'Подтвердить',exact:true}).click(); await page.getByRole('button',{name:'Вернуть',exact:true}).waitFor(); assert.equal(state.providers[0].visible,false); });
    await check('doctor editor is a form, not raw JSON, and preserves review totals', async () => { await visit(page,'doctors'); await page.getByRole('button',{name:'Изменить',exact:true}).click(); await page.getByLabel('Имя врача').fill('Изменённый тестовый врач'); assert.equal(await page.locator('textarea[spellcheck="false"]').count(),0); await page.getByRole('dialog').getByRole('button',{name:'Сохранить',exact:true}).click(); await page.getByRole('dialog').waitFor({state:'hidden'}); const post=state.posts.at(-1); assert.equal(post.path,'/api/admin/directories/doctors/301'); assert.ok(!('rating' in post.body)&&!('reviews' in post.body)); });
    await check('owner binding requires explicit confirmation', async () => { await visit(page,'auto-parts'); await page.getByRole('button',{name:'Владелец',exact:true}).click(); await page.getByLabel('Аккаунт организации').selectOption('88'); const n=state.posts.length; await page.getByRole('dialog').getByRole('button',{name:'Сохранить',exact:true}).click(); await page.getByRole('alertdialog').waitFor(); assert.equal(state.posts.length,n); await page.getByRole('alertdialog').getByRole('button',{name:'Подтвердить',exact:true}).click(); await page.getByRole('dialog').waitFor({state:'hidden'}); assert.equal(state.suppliers[0].ownerUserId,88); });
    await check('review rejection requires a reason before any write', async () => { await visit(page,'verifications'); await page.getByRole('button',{name:'Проверить',exact:true}).click(); await page.getByLabel('Отклонить и указать причину').check(); const n=state.posts.length; await page.getByRole('dialog').getByRole('button',{name:'Сохранить',exact:true}).click(); await page.getByText('Укажите причину отклонения — её получит исполнитель.',{exact:true}).waitFor(); assert.equal(state.posts.length,n); await page.screenshot({path:path.join(output,'verification-390.png')}); });
    await check('review decision remains behind confirmation', async () => { await page.getByLabel(/Комментарий исполнителю/).fill('Тестовая причина: требуется читаемое изображение.'); const n=state.posts.length; await page.getByRole('dialog').getByRole('button',{name:'Сохранить',exact:true}).click(); await page.getByRole('alertdialog').waitFor(); assert.equal(state.posts.length,n); await page.getByRole('alertdialog').getByRole('button',{name:'Подтвердить',exact:true}).click(); await page.getByRole('dialog').waitFor({state:'hidden'}); assert.equal(state.posts.at(-1).body.status,'rejected'); });
    await check('user list has server pagination and no role/password controls', async () => { await visit(page,'users'); await page.getByRole('button',{name:'Далее',exact:true}).click(); await page.locator('[data-testid="admin-user-21"]').waitFor(); assert.equal(await page.locator('input[type="password"]').count(),0); await page.getByTestId('admin-user-search').fill('Не существует'); await page.getByText('Пользователи не найдены. Измените запрос или роль.').waitFor(); });
    await check('read errors expose retry, not fake zero counts', async () => { state.failLoad=true; await visit(page,'overview'); await page.getByText('Тестовая ошибка сервера',{exact:true}).waitFor(); assert.equal(await page.locator('.admin-stats').count(),0); state.failLoad=false; await page.getByRole('button',{name:'Повторить',exact:true}).click(); await page.locator('.admin-stats').waitFor(); });
    await check('revoked access removes sensitive screen', async () => { state.deny=true; await page.getByRole('button',{name:'Обновить данные раздела'}).click(); await page.getByRole('heading',{name:'Сессия или права изменились'}).waitFor(); assert.equal(await page.locator('.admin-stats').count(),0); });
    await ctx.close();
    for (const role of [null,'client','master','organization']) await check(`no admin data requested for ${role || 'guest'}`,async()=>{const {ctx,state}=await context(role);const p=await ctx.newPage();await p.goto(`${origin}/admin`);await p.waitForTimeout(800);assert.equal(state.adminGets.length,0);await ctx.close();});
  } catch (e) { results.push({name:'runner',status:'failed',error:e.stack}); console.error(e); }
  finally { if(browser) await browser.close(); server.closeAllConnections(); server.close(); fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({engine,checks:results,failed:results.filter(r=>r.status==='failed').length},null,2)); process.exitCode=results.some(r=>r.status==='failed')?1:0; }
})();
