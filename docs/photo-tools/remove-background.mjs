// حذف پس‌زمینهٔ عکس لباس‌ها با مدل محلی (بدون ارسال عکس به سرویس بیرونی).
// این ابزار عمداً جزو وابستگی‌های پروژه نیست؛ در پوشه‌ای جداگانه نصب و اجرا کنید (docs/photos.md):
//   npm init -y && npm install @imgly/background-removal-node
//   node remove-background.mjs <پوشهٔ-عکس‌های-اصلی> <پوشهٔ-خروجی-png>
import { removeBackground } from "@imgly/background-removal-node";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [inputDir, outputDir = "cutouts"] = process.argv.slice(2);
if (!inputDir) {
  console.error("استفاده: node remove-background.mjs <input-dir> [output-dir]");
  process.exit(1);
}
fs.mkdirSync(outputDir, { recursive: true });

for (const file of fs.readdirSync(inputDir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f))) {
  const started = Date.now();
  // مدل medium تعادل خوبی بین دقت لبه‌ها (تور، پولک) و زمان پردازش دارد
  const blob = await removeBackground(pathToFileURL(path.join(inputDir, file)).href, { model: "medium", output: { format: "image/png", quality: 1 } });
  const out = path.join(outputDir, file.replace(/\.[^.]+$/, ".png"));
  fs.writeFileSync(out, Buffer.from(await blob.arrayBuffer()));
  console.log(file, "→", out, `${Date.now() - started}ms`);
}
