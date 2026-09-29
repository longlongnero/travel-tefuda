const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

function loadPlaywright() {
  const candidates = [
    'playwright',
    path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'),
  ];
  for (const candidate of candidates) {
    try { return require(candidate); } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') throw error;
    }
  }
  throw new Error('Playwright is required. Install it locally or use the Codex workspace runtime.');
}

function installedChrome() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);
  return candidates.find(candidate => fs.existsSync(candidate));
}

const { chromium } = loadPlaywright();
const root = path.resolve(__dirname, '..');
const entry = pathToFileURL(path.join(root, 'index.html'));
entry.hash = 'now';
const url = entry.href;

(async () => {
  const executablePath = installedChrome();
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);

    // Seam 0: the default current-day view begins with the source itinerary's first day.
    const nowText = await page.locator('#main').innerText();
    assert.match(nowText, /10 月 02 日 · 周五 · 第 1 天/);
    assert.match(nowText, /抵达布达佩斯/);
    assert.match(nowText, /Budapest Airport/);
    assert.match(nowText, /Hilton Budapest/);
    assert.doesNotMatch(nowText, /10 月 03 日 · 周六 · 第 2 天/);

    // Seam 1: one focused A experience with a liquid-glass mobile shell.
    assert.equal(await page.locator('.review-bar').count(), 0);
    assert.equal(await page.locator('#nav a').count(), 4);
    assert.equal(await page.locator('.wordmark').innerText(), '旅行手札');
    assert.equal(await page.locator('.wordmark i').count(), 0);
    assert.equal(await page.locator('.wordmark img').evaluate(image => image.complete && image.naturalWidth > 0), true);
    const glass = await page.locator('#nav').evaluate(node => {
      const style = getComputedStyle(node);
      return { backdrop: style.backdropFilter, radius: style.borderRadius, position: style.position };
    });
    assert.notEqual(glass.backdrop, 'none');
    assert.ok(parseFloat(glass.radius) >= 20);
    assert.equal(glass.position, 'fixed');
    const activeMarker = await page.locator('#nav a.active').evaluate(node => ({
      before: getComputedStyle(node, '::before').content,
      after: getComputedStyle(node, '::after').content,
    }));
    assert.ok(activeMarker.before === 'none' || activeMarker.before === 'normal');
    assert.ok(activeMarker.after === 'none' || activeMarker.after === 'normal');
    await page.screenshot({ path: path.join(root, 'preview-polished-a.png') });
    await page.screenshot({ path: path.join(root, 'preview-polished-a-full.png'), fullPage: true });

    // Seam 2: all eight source days are present and date controls retain focus.
    await page.locator('#nav a[href="#plan"]').click();
    await page.waitForTimeout(550);
    assert.equal(await page.locator('[data-action="day"]').count(), 8);
    const representative = [
      ['0', 'Tóth Árpád'],
      ['1', '金色大厅音乐会'],
      ['2', 'Hallstatt Bahnhof'],
      ['3', 'Vorderer Gosausee'],
      ['4', 'Malersteig'],
      ['5', 'Kampa'],
      ['6', 'Cafe Louvre / EMA'],
      ['7', '机场'],
    ];
    for (const [day, text] of representative) {
      await page.locator(`[data-action="day"][data-value="${day}"]`).click();
      assert.match(await page.locator('#main').innerText(), new RegExp(text));
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.value), day);
    }
    await page.locator('[data-action="day"][data-value="2"]').click();
    assert.match(await page.locator('#main').innerText(), /12:30[\s\S]*16:24[\s\S]*Hallstatt 湖岸短停[\s\S]*18:50/);
    await page.locator('[data-action="day"][data-value="3"]').click();
    assert.match(await page.locator('#main').innerText(), /不折返 Hallstatt[\s\S]*前湖慢走与湖边长停[\s\S]*Gosaubach/);

    // Returning to the fixed Day 1 current view also resets its write context.
    await page.locator('#nav a[href="#now"]').click();
    await page.locator('#main [data-action="carry"][data-value="packing"]').click();
    await page.waitForURL(/#carry\/packing$/);
    await page.getByRole('heading', { name: '随身', exact: true }).waitFor();
    assert.match(await page.locator('#main').innerText(), /10 月 02 日 · 布达佩斯/);
    await page.locator('#nav a[href="#now"]').click();
    await page.locator('#main [data-action="money-summary"]').click();
    await page.locator('[data-action="new-expense"]').click();
    assert.equal(await page.locator('#expense-form input[name="date"]').inputValue(), '2026-10-02');
    await page.locator('#dialog [data-action="close"]').click();
    await page.locator('#nav a[href="#plan"]').click();

    // Seam 3: status and branch semantics survive into actionable details.
    await page.locator('[data-action="day"][data-value="1"]').click();
    assert.equal(await page.locator('[data-action="concert-time"][data-value="19:00"]').getAttribute('aria-pressed'), 'true');
    assert.match(await page.locator('#main').innerText(), /Café Sperl/);
    await page.locator('[data-action="concert-time"][data-value="15:30"]').click();
    assert.equal(await page.getByText('Café Sperl', { exact: false }).count(), 0);
    assert.match(await page.locator('#main').innerText(), /Karlsplatz/);
    await page.locator('[data-action="event"]').filter({ hasText: '金色大厅音乐会' }).click();
    const closeSize = await page.locator('#dialog [data-action="close"]').evaluate(node => {
      const box = node.getBoundingClientRect();
      return { width: box.width, height: box.height };
    });
    assert.ok(closeSize.width >= 44 && closeSize.height >= 44, `dialog close target is ${JSON.stringify(closeSize)}`);
    assert.match(await page.locator('#dialog').innerText(), /已定节点/);
    assert.match(await page.locator('#dialog').innerText(), /出发前复核/);
    await page.locator('#dialog [data-action="close"]').click();
    await page.locator('[data-action="day"][data-value="6"]').click();
    await page.locator('[data-action="event"]').filter({ hasText: 'Cafe Louvre / EMA' }).click();
    assert.equal(await page.locator('#dialog-title').innerText(), 'Cafe Louvre / EMA');
    assert.match(await page.locator('#dialog').innerText(), /美食候选/);
    await page.locator('#dialog [data-action="close"]').click();

    // Seam 4: an itinerary detail can import and retain an associated document.
    await page.locator('[data-action="day"][data-value="1"]').click();
    await page.locator('[data-action="event"]').filter({ hasText: 'EC 142' }).click();
    await page.locator('#dialog [data-action="attach"]').click();
    const docChooser = page.waitForEvent('filechooser');
    await page.locator('#dialog [data-action="import-for-event"]').click();
    await (await docChooser).setFiles({
      name: 'test-rail.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n% itinerary test'),
    });
    assert.match(await page.locator('#dialog').innerText(), /test-rail\.pdf/);
    await page.getByRole('button', { name: '完成' }).click();
    assert.match(await page.locator('#dialog').innerText(), /test-rail\.pdf/);
    await page.getByRole('button', { name: '关闭详情' }).click();
    await page.locator('[data-action="event"]').filter({ hasText: '寄存行李、入住' }).click();
    assert.match(await page.locator('#dialog').innerText(), /住宿已确认 · 执行时间为计划/);
    assert.doesNotMatch(await page.locator('#dialog').innerText(), /已定节点/);
    await page.getByRole('button', { name: '关闭详情' }).click();

    // Seam 5: packing, photo import and ledger split/edit work as user flows.
    await page.locator('#nav a[href^="#carry"]').click();
    await page.locator('[data-action="carry-tab"][data-value="documents"]').click();
    await page.locator('[data-action="doc-filter"][data-value="交通"]').click();
    assert.equal(await page.locator('[data-action="doc-filter"][data-value="交通"]').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-action="carry-tab"][data-value="packing"]').click();
    await page.waitForTimeout(550);
    const touchHeight = await page.locator('.segmented button').first().evaluate(node => node.getBoundingClientRect().height);
    assert.ok(touchHeight >= 44, `segmented touch target is ${touchHeight}px`);
    await page.locator('[data-check="s2"]').setChecked(true);
    assert.equal(await page.locator('[data-check="s2"]').isChecked(), true);
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.check), 's2');
    await page.locator('[data-action="add-item"]').click();
    await page.locator('#item-form input[name="name"]').fill('太阳镜');
    await page.locator('#item-form input[name="required"]').check();
    await page.locator('#item-form button.solid').click();
    assert.match(await page.locator('#main').innerText(), /太阳镜/);

    await page.locator('[data-action="carry-tab"][data-value="album"]').click();
    const photoChooser = page.waitForEvent('filechooser');
    await page.locator('[data-action="import-photo"]').first().click();
    await (await photoChooser).setFiles({
      name: 'lake-note.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
    });
    assert.match(await page.locator('#main').innerText(), /我的旅途/);
    assert.equal(await page.locator('.photo-grid img').count(), 1);

    await page.locator('#nav a[href="#money"]').click();
    await page.locator('[data-action="new-expense"]').click();
    await page.locator('#expense-form input[name="amount"]').fill('48');
    await page.locator('#expense-form input[name="title"]').fill('晚餐测试');
    await page.locator('#expense-form input[name="split"]').check();
    assert.match(await page.locator('#split-preview').innerText(), /我承担.*24/);
    await page.locator('#expense-form button[type="submit"]').click();
    await page.locator('[data-action="expense-tab"][data-value="details"]').click();
    await page.locator('[data-action="expense-filter"][data-value="餐饮"]').click();
    assert.equal(await page.locator('[data-action="expense-filter"][data-value="餐饮"]').getAttribute('aria-pressed'), 'true');
    await page.locator('.expense-row').filter({ hasText: '晚餐测试' }).click();
    await page.locator('#expense-form input[name="amount"]').fill('60');
    await page.locator('#expense-form button[type="submit"]').click();
    const editedExpense = await page.locator('.expense-row').filter({ hasText: '晚餐测试' }).innerText();
    assert.match(editedExpense, /60/);
    assert.match(editedExpense, /30/);

    // Seam 6: route changes animate, while reduced-motion users get near-instant transitions.
    await page.locator('#nav a[href="#now"]').click();
    assert.match(await page.locator('#main').getAttribute('class'), /page-enter/);
    await page.waitForFunction(() => document.activeElement?.tagName === 'H1');
    assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'H1');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(url);
    const pageAnimation = await page.locator('#main').evaluate(node => getComputedStyle(node).animationDuration);
    assert.ok(pageAnimation === '0s' || parseFloat(pageAnimation) <= 0.01);
    await page.locator('[data-action="event"]').first().click();
    const sheetAnimation = await page.locator('#dialog').evaluate(node => getComputedStyle(node).animationDuration);
    assert.ok(sheetAnimation === '0s' || parseFloat(sheetAnimation) <= 0.01);

    // Layout seam: core routes never widen the document at supported phone widths.
    for (const width of [320, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      for (const hash of ['now', 'plan', 'carry/documents', 'carry/packing', 'carry/album', 'money']) {
        await page.goto(url.split('#')[0] + '#' + hash);
        const size = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
        assert.ok(size.scroll <= size.client, `${width}px ${hash} overflows: ${JSON.stringify(size)}`);
      }
    }
    assert.deepEqual(errors, []);
    console.log('polished A public-flow checks passed');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
