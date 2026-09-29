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
    console.log('PASS: all eight days open the correct editor; representative add/edit/delete works; 19:00 concert is default');
  } finally { await browser.close(); }
})().catch(error=>{ console.error(error); process.exitCode=1; });
