/**
 * Session 3.2 Web: Plan Editing, Bullets Textarea, and Presentation Tests (PLN-06, PLN-07, PLN-08)
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { toPlanPresentationDTO } from "@halaa/shared/utils/adapters";

test("Web Plan Presentation DTO: Matches presentation contract for business and host cards (PLN-08)", () => {
  const plan = {
    code: "premium_event_150",
    planType: "premium_event",
    planFamily: "premium",
    pricing: { oneTime: 650 },
    setupFeeAmount: 0,
    features: { whatsAppTemplates: 2 },
    featureBullets: {
      ar: ["تصميم دعوة مخصص", "متابعة الحضور المباشر"],
      en: ["Custom design", "Live RSVP tracking"],
    },
    limits: {
      maxEvents: 1,
      invitePool: 150,
      durationDays: 90,
    },
  };

  const dto = toPlanPresentationDTO(plan);
  assert.equal(dto.code, "premium_event_150");
  assert.equal(dto.isManaged, true);
  assert.equal(dto.isPool, false);
  assert.equal(dto.isPerEvent, true);
  assert.equal(dto.limits.compensationPool, 22); // 15% of 150 = 22.5 -> floor = 22
  assert.equal(dto.features.whatsAppTemplates, 2);
  assert.equal(dto.extras.length, 1);
  assert.equal(dto.extras[0].type, "whatsapp_templates");
});

test("Web PlanFeatureBulletsSection: Source verification for raw text editing preservation (PLN-07)", () => {
  const sectionPath = path.resolve(
    __dirname,
    "../../app/[lang]/admin-dash/manage-plans/_components/edit-plan/PlanFeatureBulletsSection.js"
  );
  const content = fs.readFileSync(sectionPath, "utf8");

  assert.ok(
    content.includes("BulletField"),
    "PlanFeatureBulletsSection must use dedicated BulletField component"
  );
  assert.ok(
    content.includes("setRawText(newText)"),
    "BulletField must update local rawText state on change to preserve trailing newlines"
  );
});

test("Web EditPlanPopup: Source verification for unlimited durationDays handling", () => {
  const popupPath = path.resolve(
    __dirname,
    "../../app/[lang]/admin-dash/manage-plans/_components/EditPlanPopup.js"
  );
  const content = fs.readFileSync(popupPath, "utf8");

  assert.ok(
    content.includes('plan?.planType === "unlimited" ? null : 90'),
    "EditPlanPopup must preserve null durationDays for unlimited plans"
  );
});
