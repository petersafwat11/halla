/**
 * Rename legacy cloud-oriented database fields to local-storage references.
 * Dry-run by default; pass --apply during deployment before starting new code.
 */

const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "../config.env") });

async function main() {
  const apply = process.argv.includes("--apply");
  await mongoose.connect(process.env.DATABASE, {
    tlsCertificateKeyFile: process.env.DATABASE_CERT_PATH || undefined,
  });
  const db = mongoose.connection.db;
  const templateFilter = {
    $or: [{ imageS3Key: { $exists: true } }, { thumbnailS3Key: { $exists: true } }],
  };
  const deletionFilter = { pendingS3Keys: { $exists: true } };
  const [templates, deletionRequests] = await Promise.all([
    db.collection("templates").countDocuments(templateFilter),
    db.collection("accountdeletionrequests").countDocuments(deletionFilter),
  ]);

  console.log(JSON.stringify({ apply, templates, deletionRequests }));
  if (!apply) return;

  if (templates) {
    await db.collection("templates").updateMany(
      templateFilter,
      [
        {
          $set: {
            imageRef: { $ifNull: ["$imageRef", "$imageS3Key"] },
            thumbnailRef: { $ifNull: ["$thumbnailRef", "$thumbnailS3Key"] },
          },
        },
        { $unset: ["imageS3Key", "thumbnailS3Key"] },
      ],
    );
  }
  if (deletionRequests) {
    await db.collection("accountdeletionrequests").updateMany(
      deletionFilter,
      [
        { $set: { pendingUploadRefs: { $ifNull: ["$pendingUploadRefs", "$pendingS3Keys"] } } },
        { $unset: "pendingS3Keys" },
      ],
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
