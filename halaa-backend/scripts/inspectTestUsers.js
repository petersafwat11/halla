const { connectDB, disconnectDB } = require("../src/config/database");
const User = require("../models/UserModel");
const Subscription = require("../models/SubscriptionModel");

async function main() {
  await connectDB();
  const users = await User.find({
    $or: [
      { email: /review/i },
      { email: /test/i },
      { email: /halaa\.com\.sa/i }
    ]
  }).select("email role status accountType subscription").lean();

  console.log(`Found ${users.length} relevant accounts:`);
  for (const u of users) {
    let subInfo = "No subscription";
    if (u.subscription) {
      const s = await Subscription.findById(u.subscription).populate("plan").lean();
      if (s) subInfo = `${s.plan?.nameEn || s.plan?.code || "unknown plan"} (status: ${s.status})`;
    }
    console.log(`• Email: ${u.email} | Role: ${u.role} | Type: ${u.accountType} | Status: ${u.status} | Sub: ${subInfo}`);
  }
  await disconnectDB();
}

main().catch(console.error);
