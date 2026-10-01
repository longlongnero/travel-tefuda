const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

function loadPlaywright() {
  for (const candidate of [
    'playwright',
    path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'),
  ]) {
    try { return require(candidate); } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') throw error;
    }
  }
  throw new Error('Playwright is required.');
}

function installedChrome() {
  return [process.env.PLAYWRIGHT_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium']
    .filter(Boolean).find(candidate => fs.existsSync(candidate));
}

const { chromium } = loadPlaywright();
(async()=>{
  const browser = await chromium.launch({ headless:true, executablePath:installedChrome() });
  try {
    const page = await browser.newPage({ viewport:{ width:390, height:844 } });
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
    await page.locator('#nav a[href="#plan"]').click();
    await page.waitForFunction(() => location.hash === '#plan' && document.querySelector('.date-strip'));

    // Day 1 ships with the confirmed detailed Budapest route and a visible edit entry.
    const dayOneText = await page.locator('#main').innerText();
    for (const expected of [
      '希尔顿寄存行李、整理休息',
      'Csészényi Café',
      'Retek午餐、休息',
      'Citygraph Art Gallery（机动项）',
      '渔人堡、马加什教堂周边夜景',
    ]) assert.match(dayOneText, new RegExp(expected));
    assert.equal(await page.locator('.timeline .event-row').count(), 27);
    const editBox = await page.getByRole('button', { name:'编辑当日行程', exact:true }).boundingBox();
    const firstEventBox = await page.locator('.timeline .event-row').first().boundingBox();
    assert.ok(editBox && firstEventBox && editBox.y < firstEventBox.y && editBox.y < 844, 'edit entry should be visible above the timeline');

    // Manual ordering is touch-friendly, updates the timeline, and persists across reloads.
    await page.getByRole('button', { name:'编辑当日行程', exact:true }).click();
    assert.equal(await page.getByRole('button', { name:'上移 希尔顿寄存行李、整理休息', exact:true }).isDisabled(), true);
    await page.getByRole('button', { name:'下移 希尔顿寄存行李、整理休息', exact:true }).click();
    assert.match(await page.locator('.itinerary-edit-row').first().innerText(), /前往 Csészényi Café/);
    await page.getByRole('button', { name:'关闭详情', exact:true }).click();
    assert.match(await page.locator('.timeline .event-row').first().innerText(), /前往 Csészényi Café/);
    await page.reload();
    assert.match(await page.locator('.timeline .event-row').first().innerText(), /前往 Csészényi Café/);

    // Restore the default order so the remaining CRUD checks start from the shipped itinerary.
    await page.getByRole('button', { name:'编辑当日行程', exact:true }).click();
    await page.getByRole('button', { name:'上移 希尔顿寄存行李、整理休息', exact:true }).click();
    await page.getByRole('button', { name:'关闭详情', exact:true }).click();

    // Itinerary mutations survive a reload in the same browser.
    await page.getByRole('button', { name:'编辑当日行程', exact:true }).click();
    await page.getByRole('button', { name:'新增安排', exact:true }).click();
    await page.locator('#event-form [name="time"]').fill('22:15');
    await page.locator('#event-form [name="type"]').selectOption('walk');
    await page.locator('#event-form [name="title"]').fill('持久化测试安排');
    await page.locator('#event-form [name="place"]').fill('Budapest');
    await page.locator('#event-form [name="note"]').fill('刷新后应继续存在。');
    await page.getByRole('button', { name:'保存安排', exact:true }).click();
    await page.reload();
    assert.match(await page.locator('#main').innerText(), /持久化测试安排/);
    await page.getByRole('button', { name:'编辑当日行程', exact:true }).click();
    await page.getByRole('button', { name:/编辑 持久化测试安排/ }).click();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name:'删除安排', exact:true }).click();
    await page.reload();
    assert.doesNotMatch(await page.locator('#main').innerText(), /持久化测试安排/);

    // The confirmed evening programme is the default branch, pending ticket-face verification.
    await page.getByRole('button', { name:'10月3日', exact:true }).click();
    assert.equal(await page.locator('[data-action="concert-time"][data-value="19:00"]').getAttribute('aria-pressed'), 'true');
    assert.match(await page.locator('#main').innerText(), /ORF RSO Wien[\s\S]*19:00/);

    // Every selected day exposes the same editing seam.
    await page.getByRole('button', { name:'编辑当日行程', exact:true }).click();
    assert.match(await page.getByRole('dialog').innerText(), /编辑 10 月 03 日行程/);
    await page.getByRole('button', { name:'新增安排', exact:true }).click();
    await page.locator('#event-form [name="time"]').fill('17:20');
    await page.locator('#event-form [name="type"]').selectOption('food');
    await page.locator('#event-form [name="title"]').fill('纳旭市场附近晚餐');
    await page.locator('#event-form [name="place"]').fill('Naschmarkt, Wien');
    await page.locator('#event-form [name="note"]').fill('音乐会前就近用餐，不跨城。');
    await page.getByRole('button', { name:'保存安排', exact:true }).click();
    assert.match(await page.locator('#main').innerText(), /17:20[\s\S]*纳旭市场附近晚餐[\s\S]*19:00/);

    await page.getByRole('button', { name:'编辑当日行程', exact:true }).click();
    await page.getByRole('button', { name:/编辑 纳旭市场附近晚餐/ }).click();
    await page.locator('#event-form [name="time"]').fill('17:30');
    await page.locator('#event-form [name="title"]').fill('音乐会前简餐');
    await page.getByRole('button', { name:'保存安排', exact:true }).click();
    assert.match(await page.locator('#main').innerText(), /17:30[\s\S]*音乐会前简餐/);

    await page.getByRole('button', { name:'编辑当日行程', exact:true }).click();
    await page.getByRole('button', { name:/编辑 音乐会前简餐/ }).click();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name:'删除安排', exact:true }).click();
    assert.doesNotMatch(await page.locator('#main').innerText(), /音乐会前简餐/);

    // Every date routes the shared editor to its own day, while Day 2 above covers full CRUD.
    for (let day=0;day<8;day++) {
      const date=String(day+2).padStart(2,'0');
      await page.getByRole('button', { name:`10月${day+2}日`, exact:true }).click();
      await page.getByRole('button', { name:'编辑当日行程', exact:true }).click();
      assert.match(await page.getByRole('dialog').innerText(), new RegExp(`编辑 10 月 ${date} 日行程`));
      await page.getByRole('button', { name:'新增安排', exact:true }).click();
      assert.equal(await page.locator('#event-form').getAttribute('data-day'), String(day));
      await page.getByRole('button', { name:'关闭详情', exact:true }).click();
      await page.getByRole('button', { name:'关闭详情', exact:true }).click();
    }
    console.log('PASS: Oct 2 has 27 items and visible editor; manual order and CRUD persist across reload; all eight day editors work; 19:00 concert is default');
  } finally { await browser.close(); }
})().catch(error=>{ console.error(error); process.exitCode=1; });
