/**
 * Fetch a payment directly from Moyasar by ID. Prints the full response.
 * Use to verify whether a moyasarPaymentId actually exists on the Moyasar
 * side (vs. only existing in our DB).
 *
 * Usage:
 *   node scripts/verify-moyasar-payment.js <paymentId>
 *   node scripts/verify-moyasar-payment.js 0468e030-c65d-48f6-8f15-57b67d35d2d8
 */
require("dotenv").config({ path: __dirname + "/../config.env" });
const axios = require("axios");

const id = process.argv[2];
if (!id) {
  console.error("Usage: node scripts/verify-moyasar-payment.js <moyasarPaymentId>");
  process.exit(1);
}

const KEY = process.env.MOYASAR_API_KEY;
const BASE = process.env.MOYASAR_BASE_URL || "https://api.moyasar.com/v1";

if (!KEY) {
  console.error("MOYASAR_API_KEY missing");
  process.exit(1);
}

console.log(`API key starts with: ${KEY.slice(0, 12)}... (length ${KEY.length})`);
console.log(`Fetching ${BASE}/payments/${id}\n`);

(async () => {
  try {
    const resp = await axios.get(`${BASE}/payments/${id}`, {
      auth: { username: KEY, password: "" },
      timeout: 15000,
    });
    console.log("STATUS:", resp.status);
    console.log(JSON.stringify(resp.data, null, 2));
  } catch (err) {
    console.error("ERROR:", err.response?.status, err.response?.statusText);
    console.error(JSON.stringify(err.response?.data, null, 2));
  }
})();
