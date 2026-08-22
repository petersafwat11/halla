import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");

describe("Session 2.5 Web: Ticket Attachment Viewer Matrix (ADM-14)", () => {
  it("TicketCard.jsx renders attachment preview trigger and opens MediaViewerModal", () => {
    const cardPath = path.join(
      repoRoot,
      "halaa-web/app/[lang]/host/tickets/_components/TicketCard.jsx"
    );
    const content = fs.readFileSync(cardPath, "utf-8");

    assert.match(content, /import MediaViewerModal from/);
    assert.match(content, /ticket\.attachment\?\.url/);
    assert.match(content, /setIsAttachmentOpen\(true\)/);
    assert.match(content, /<MediaViewerModal/);
  });

  it("TicketDetailView.jsx renders attachment preview and MediaViewerModal for admin", () => {
    const detailPath = path.join(
      repoRoot,
      "halaa-web/app/[lang]/admin-dash/tickets/[id]/_components/TicketDetailView.jsx"
    );
    const content = fs.readFileSync(detailPath, "utf-8");

    assert.match(content, /import MediaViewerModal from/);
    assert.match(content, /ticket\.attachment\?\.url/);
    assert.match(content, /<MediaViewerModal/);
    assert.match(content, /setIsAttachmentOpen\(true\)/);
  });

  it("MediaViewerModal.jsx handles both video and image attachments", () => {
    const modalPath = path.join(
      repoRoot,
      "halaa-web/ui/commen/popup/MediaViewerModal.jsx"
    );
    const content = fs.readFileSync(modalPath, "utf-8");

    assert.match(content, /attachment\.type === "video"/);
    assert.match(content, /<video className=/);
    assert.match(content, /<img className=/);
    assert.match(content, /target="_blank"/);
  });

  it("SendTicketPopup.jsx & MakeTicketPopup.js attach files via MediaAttachmentInput and multipart", () => {
    const sendPopupPath = path.join(
      repoRoot,
      "halaa-web/app/[lang]/host/tickets/_components/SendTicketPopup.jsx"
    );
    const makePopupPath = path.join(
      repoRoot,
      "halaa-web/ui/admin/dashboard/makeTicketPopup/MakeTicketPopup.js"
    );

    const sendContent = fs.readFileSync(sendPopupPath, "utf-8");
    const makeContent = fs.readFileSync(makePopupPath, "utf-8");

    assert.match(sendContent, /MediaAttachmentInput/);
    assert.match(sendContent, /formData\.append\("ticketAttachment", attachment\)/);

    assert.match(makeContent, /MediaAttachmentInput/);
    assert.match(makeContent, /formData\.append\("ticketAttachment", attachment\)/);
  });
});
