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
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:installedChrome()});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 let fail=false,mode='normal';
 await page.route('https://api.open-meteo.com/**',async route=>{if(fail)return route.abort();const vienna=new URL(route.request().url()).searchParams.get('latitude')==='48.2082';if(vienna)await new Promise(r=>setTimeout(r,500));return route.fulfill({json:{current:{time:Math.floor(Date.now()/1000)-(mode==='stale'?10800:0),temperature_2m:mode==='invalid'?null:vienna?23:12.4,weather_code:3,wind_speed_10m:8.2,apparent_temperature:10.1,precipitation:0}}});});
 await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
 assert.match(await page.locator('.date-heading').innerText(),/10 月 02 日/);
 assert.match(await page.locator('.ticket').innerText(),/寄存行李/);
 await page.getByRole('button',{name:'完整行程',exact:true}).click();
 assert.match(await page.locator('.date-chip.active').innerText(),/02/);
 await page.locator('#nav a[href="#now"]').click();
 await page.waitForFunction(()=>document.querySelector('.weather-mini')?.textContent.includes('12°'));
 await page.locator('.weather-mini').click();
 assert.match(await page.locator('#dialog').innerText(),/布达佩斯/);
 assert.match(await page.locator('#dialog').innerText(),/Open-Meteo/);
 fail=true;
 await page.getByRole('button',{name:'刷新天气',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#dialog')?.textContent.includes('天气暂不可用'));
 assert.doesNotMatch(await page.locator('.weather-mini').innerText(),/12°|17°/);
 assert.equal(await page.evaluate(()=>document.activeElement?.dataset.action),'refresh-weather');
 fail=false;
 await page.getByRole('button',{name:'刷新天气',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#dialog')?.textContent.includes('12°'));
 for(const bad of ['stale','invalid']){
 mode=bad;
 await page.getByRole('button',{name:'刷新天气',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#dialog').textContent.includes('天气暂不可用'));
 assert.doesNotMatch(await page.locator('.weather-mini').innerText(),/12°/);
 }
 mode='normal';
 await page.getByRole('button',{name:'关闭详情',exact:true}).click();
 await page.locator('#nav a[href="#plan"]').click();
 await page.getByRole('button',{name:'10月3日',exact:true}).click();
 await page.getByRole('button',{name:'10月2日',exact:true}).click();
 await page.waitForTimeout(700);
 assert.match(await page.locator('.weather-mini').innerText(),/布达佩斯/);
 assert.doesNotMatch(await page.locator('.weather-mini').innerText(),/23°|维也纳/);
 console.log('PASS: October 2, weather success/failure/retry, stale/null rejected, city response race');
}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
