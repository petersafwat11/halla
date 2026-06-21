/**
 * db_inspect.js — READ-ONLY. One bounded attempt to read the live templates
 * collection so section E can cite real DB state. No writes of any kind.
 * Hard 25s timeout so it never hangs the audit.
 */
const path = require("path");
const dns = require("dns");
require("dotenv").config({ path: path.join(__dirname, "..", "..", "labbe-backend-", "config.env") });
const mongoose = require("mongoose");

const TARGET_ID = "69fb550534860e1f4dc8c96a";
const killer = setTimeout(() => { console.error("[db] timeout — giving up"); process.exit(2); }, 25000);

(async () => {
  try {
    dns.setServers(["1.1.1.1", "1.0.0.1", "8.8.8.8", "8.8.4.4"]);
    let DB = process.env.DATABASE;
    if (!DB) { console.error("[db] no DATABASE env"); process.exit(1); }
    if (process.env.DATABASE_PASSWORD && DB.includes("<PASSWORD>"))
      DB = DB.replace("<PASSWORD>", process.env.DATABASE_PASSWORD);
    const opts = { serverSelectionTimeoutMS: 15000 };
    if (process.env.DATABASE_CERT_PATH) { opts.tls = true; opts.tlsCertificateKeyFile = process.env.DATABASE_CERT_PATH; }
    await mongoose.connect(DB, opts);
    const col = mongoose.connection.db.collection("templates");
    const total = await col.countDocuments({});
    const live = await col.countDocuments({ deletedAt: null, active: true });
    console.log(`[db] connected ${mongoose.connection.host}; templates total=${total} live=${live}`);
    let target = null;
    try { target = await col.findOne({ _id: new mongoose.Types.ObjectId(TARGET_ID) }); } catch (_) {}
    if (target) {
      console.log(`[db] TARGET ${TARGET_ID}: nameEn=${target.nameEn} nameAr=${target.nameAr} src=${target.imageS3Key} ${target.naturalWidth}x${target.naturalHeight} fields=${target.fields?.length} overlays=${target.overlays?.length} deco=${target.decorations?.length} version=${target.version}`);
    } else {
      console.log(`[db] TARGET ${TARGET_ID}: not found`);
    }
    const liveDocs = await col.find({ deletedAt: null, active: true }).project({ nameEn: 1, nameAr: 1, imageS3Key: 1, "fields.key": 1, version: 1 }).limit(40).toArray();
    console.log("[db] live templates:");
    for (const d of liveDocs) {
      const keys = (d.fields || []).map((f) => f.key).join(",");
      console.log(`   - ${d._id} | ${d.nameEn} | ${(d.imageS3Key||"").split("/").pop()} | v${d.version} | [${keys}]`);
    }
    await mongoose.disconnect();
    clearTimeout(killer);
    process.exit(0);
  } catch (e) {
    console.error("[db] failed:", e.message);
    try { await mongoose.disconnect(); } catch (_) {}
    clearTimeout(killer);
    process.exit(1);
  }
})();
