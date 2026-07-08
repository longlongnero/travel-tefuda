const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

async function main() {
  const root = __dirname;
  const outputDir = path.join(root, "output", "four-act");
  fs.mkdirSync(outputDir, { recursive: true });
  const pagePath = "file://" + path.join(root, "index.html");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  const page = await browser.newPage({
    viewport: { width: 1300, height: 1700 },
    deviceScaleFactor: 1,
  });

  await page.goto(pagePath, { waitUntil: "load" });
  await page.waitForFunction(() => document.fonts && document.fonts.status === "loaded");
  await page.waitForTimeout(900);

  const targets = await page.$$eval(".poster.xhs", (nodes) =>
    nodes.map((node, index) => ({
      id: node.id,
      file: `xhs-${String(index + 1).padStart(2, "0")}-${node.id.replace(/^xhs-\d+-?/, "").replace(/^xhs-/, "")}.png`,
    }))
  );

  for (const target of targets) {
    const element = await page.$(`#${target.id}`);
    await element.screenshot({ path: path.join(outputDir, target.file) });
  }

  await browser.close();
  console.log(`Rendered ${targets.length} social cards into ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
