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

const {chromium}=loadPlaywright();
(async()=>{const browser=await chromium.launch({headless:true,executablePath:installedChrome()});try{
const page=await browser.newPage({viewport:{width:390,height:844}});
page.on('requestfailed',r=>console.log('REQUEST FAILED',r.url(),r.failure()));
await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
await page.waitForFunction(()=>!document.querySelector('.weather-mini').textContent.includes('获取中'),{},{timeout:15000});
console.log('LIVE UI:',await page.locator('.weather-mini').innerText());
assert.match(await page.locator('.weather-mini').innerText(),/°/,'Real weather must load from the file page');
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await page.screenshot({path:path.resolve(__dirname,'../assets/current-home-review.png')});
await page.locator('.weather-mini').click();
await page.locator('#dialog[open]').waitFor();
await page.getByRole('heading',{name:/当前天气/}).waitFor();
await page.waitForTimeout(600);
await page.screenshot({path:path.resolve(__dirname,'../assets/current-weather-review.png')});
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
