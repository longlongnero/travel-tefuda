const path = require("path");
const { chromium } = require("playwright");

async function main() {
  const root = __dirname;
  const pagePath = "file://" + path.join(root, "index.html");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1600 },
    deviceScaleFactor: 1,
  });

  await page.goto(pagePath, { waitUntil: "load" });
  await page.waitForFunction(() => document.fonts && document.fonts.status === "loaded");
  await page.waitForTimeout(700);
  await page.screenshot({
    path: path.join(root, "preview-viewport.png"),
    fullPage: false,
  });
  await page.screenshot({
    path: path.join(root, "preview.png"),
    fullPage: true,
  });
  await page.locator("#route-map").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1600);
  await page.screenshot({
    path: path.join(root, "preview-route-map.png"),
    fullPage: false,
  });
  await page.locator("#food").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(root, "preview-food.png"),
    fullPage: false,
  });
  await page.locator("#budapest").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(root, "preview-budapest.png"),
    fullPage: false,
  });
  await page.locator("#appendix").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(root, "preview-appendix.png"),
    fullPage: false,
  });
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 1100 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  await mobile.goto(pagePath, { waitUntil: "load" });
  await mobile.waitForFunction(() => document.fonts && document.fonts.status === "loaded");
  await mobile.waitForTimeout(700);
  await mobile.screenshot({
    path: path.join(root, "preview-mobile.png"),
    fullPage: false,
  });
  await mobile.close();
  await browser.close();
  console.log(path.join(root, "preview.png"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
