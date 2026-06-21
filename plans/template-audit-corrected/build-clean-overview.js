const sharp = require("sharp");
const fs = require("fs/promises");
const path = require("path");

const requestedDir = process.argv[2];
const inputDir = requestedDir
  ? path.resolve(requestedDir)
  : path.join(__dirname, "git-parent", "template-cards");
const output = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.join(__dirname, "clean-source-overview.png");

async function main() {
  const files = (await fs.readdir(inputDir)).filter((name) => /\.(jpe?g|png)$/i.test(name));
  const panelWidth = 300;
  const panelHeight = 580;
  const columns = 5;
  const rows = Math.ceil(files.length / columns);
  const panels = [];

  for (const [index, name] of files.entries()) {
    const image = await sharp(path.join(inputDir, name))
      .resize({ width: 280, height: 510, fit: "contain", background: "#fff" })
      .png()
      .toBuffer();
    const label = Buffer.from(
      `<svg width="${panelWidth}" height="50"><rect width="100%" height="100%" fill="white"/><text x="150" y="30" text-anchor="middle" font-family="Arial" font-size="15" fill="black">${name}</text></svg>`
    );
    const panel = await sharp({
      create: { width: panelWidth, height: panelHeight, channels: 4, background: "#eee" },
    })
      .composite([
        { input: label, left: 0, top: 0 },
        { input: image, left: 10, top: 55 },
      ])
      .png()
      .toBuffer();
    panels.push({ input: panel, left: (index % columns) * panelWidth, top: Math.floor(index / columns) * panelHeight });
  }

  await sharp({
    create: { width: columns * panelWidth, height: rows * panelHeight, channels: 4, background: "#ddd" },
  })
    .composite(panels)
    .png()
    .toFile(output);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
