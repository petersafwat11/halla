/**
 * Backfill legacy vendor serviceDescription into the preferred-language About
 * field. Dry-run is the default; pass --write to persist changes.
 */
require("dotenv").config();
const { connectDB, disconnectDB } = require("../src/config/database");
const User = require("../models/UserModel");

async function run() {
  const write = process.argv.includes("--write");
  await connectDB();
  const vendors = await User.find({
    role: "vendor",
    "profile.vendorData.serviceDescription": { $type: "string", $ne: "" },
  }).select("preferredLanguage profile.vendorData.serviceDescription profile.vendorData.aboutAr profile.vendorData.aboutEn");
  let eligible = 0;
  for (const vendor of vendors) {
    const vd = vendor.profile?.vendorData;
    const target = vendor.preferredLanguage === "en" ? "aboutEn" : "aboutAr";
    if (!vd || vd[target]?.trim()) continue;
    eligible += 1;
    if (write) {
      vendor.set(`profile.vendorData.${target}`, vd.serviceDescription.trim());
      await vendor.save({ validateBeforeSave: false });
    }
  }
  console.log(`${write ? "Migrated" : "Would migrate"} ${eligible} vendor profile(s).`);
}

run()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => disconnectDB().catch(() => {}));
