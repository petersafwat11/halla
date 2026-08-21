const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "../../..");

test("Session 2.5 Mobile: Ticket Attachment Matrix (ADM-14)", () => {
  // 1. TicketCard.js renders image thumbnail / video badge and handles preview modal / Linking.openURL
  const cardPath = path.join(repoRoot, "halaa-mobile/components/tickets/TicketCard.js");
  const cardContent = fs.readFileSync(cardPath, "utf-8");

  assert.match(cardContent, /attachment\.type === "image"/);
  assert.match(cardContent, /setImageViewerVisible\(true\)/);
  assert.match(cardContent, /Linking\.openURL\(attachment\.url\)/);
  assert.match(cardContent, /getImageUrl\(attachment\.url\)/);

  // 2. TicketModal.js accepts image / video picker up to 50MB and builds multipart ticketAttachment payload
  const modalPath = path.join(repoRoot, "halaa-mobile/components/tickets/TicketModal.js");
  const modalContent = fs.readFileSync(modalPath, "utf-8");

  assert.match(modalContent, /MAX_ATTACHMENT_BYTES\s*=\s*50\s*\*\s*1024\s*\*\s*1024/);
  assert.match(modalContent, /formData\.append\("ticketAttachment",/);
  assert.match(modalContent, /handlePickAttachment/);

  // 3. TicketDetailsScreen.js maps raw.attachment and renders attachment section with image/video preview
  const adminDetailPath = path.join(repoRoot, "halaa-mobile/screens/admin/admin-dashboard/TicketDetailsScreen.js");
  const adminDetailContent = fs.readFileSync(adminDetailPath, "utf-8");

  assert.match(adminDetailContent, /attachment:\s*raw\.attachment/);
  assert.match(adminDetailContent, /ticket\.attachment\?\.url/);
  assert.match(adminDetailContent, /ticket\.attachment\.type === "image"/);
  assert.match(adminDetailContent, /Linking\.openURL\(ticket\.attachment\.url\)/);
  assert.match(adminDetailContent, /setImageViewerVisible\(true\)/);
});
