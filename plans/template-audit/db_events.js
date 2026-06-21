/**
 * db_events.js — READ-ONLY. Quantify the §F-8 migration risk and scan live
 * placeholders/defaults for the forbidden surname. No writes. 25s hard cap.
 */
const path = require("path");
const dns = require("dns");
require("dotenv").config({ path: path.join(__dirname, "..", "..", "labbe-backend-", "config.env") });
const mongoose = require("mongoose");

const killer = setTimeout(() => { console.error("[db] timeout"); process.exit(2); }, 25000);
const RX = /(آل\s*سعود|al[-\s]?saud)/i;

(async () => {
  try {
    dns.setServers(["1.1.1.1", "1.0.0.1", "8.8.8.8", "8.8.4.4"]);
    let DB = process.env.DATABASE;
    if (process.env.DATABASE_PASSWORD && DB.includes("<PASSWORD>")) DB = DB.replace("<PASSWORD>", process.env.DATABASE_PASSWORD);
    const opts = { serverSelectionTimeoutMS: 15000 };
    if (process.env.DATABASE_CERT_PATH) { opts.tls = true; opts.tlsCertificateKeyFile = process.env.DATABASE_CERT_PATH; }
    await mongoose.connect(DB, opts);
    const db = mongoose.connection.db;
    const templates = db.collection("templates");
    const events = db.collection("events");

    const live = await templates.find({ deletedAt: null, active: true }).project({ _id: 1, nameEn: 1, fields: 1 }).toArray();
    const ids = live.map((t) => t._id);

    // 1) event dependency count
    const totalEvents = await events.countDocuments({});
    const withVisual = await events.countDocuments({ "visualTemplate.templateRef": { $ne: null } });
    const dependent = await events.countDocuments({ "visualTemplate.templateRef": { $in: ids } });
    console.log(`[events] total=${totalEvents} withVisualTemplate=${withVisual} referencing-these-20=${dependent}`);

    // per-template event counts (only non-zero)
    const agg = await events.aggregate([
      { $match: { "visualTemplate.templateRef": { $in: ids } } },
      { $group: { _id: "$visualTemplate.templateRef", n: { $sum: 1 } } },
    ]).toArray();
    const nameById = Object.fromEntries(live.map((t) => [String(t._id), t.nameEn]));
    for (const a of agg) console.log(`   - ${nameById[String(a._id)] || a._id}: ${a.n} event(s)`);

    // dump one dependent event's fieldValues
    const sample = await events.findOne({ "visualTemplate.templateRef": { $in: ids } }, { projection: { "visualTemplate.fieldValues": 1, "visualTemplate.templateRef": 1, "visualTemplate.bakedImagePath": 1, name: 1, status: 1 } });
    if (sample) {
      console.log(`[events] sample ${sample._id} status=${sample.status} bakedImagePath=${sample.visualTemplate?.bakedImagePath ? "SET" : "none"}`);
      console.log(`[events] sample fieldValues keys = ${JSON.stringify(Object.keys(sample.visualTemplate?.fieldValues || {}))}`);
    } else {
      console.log(`[events] no event references these templates`);
    }

    // 2) surname scan across live placeholders/defaults
    let hits = 0;
    for (const t of live) {
      for (const f of t.fields || []) {
        for (const k of ["placeholderEn", "placeholderAr", "defaultValue", "labelEn", "labelAr"]) {
          const v = f[k];
          if (typeof v === "string" && RX.test(v)) { console.log(`[surname] ${t.nameEn} field=${f.key} ${k}="${v}"`); hits++; }
        }
      }
    }
    console.log(`[surname] live placeholder/default hits = ${hits}`);

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
