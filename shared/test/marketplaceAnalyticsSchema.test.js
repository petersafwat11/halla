import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MARKETPLACE_EVENT_TYPES,
  MARKETPLACE_TARGET_TYPES,
  MARKETPLACE_CONTACT_METHODS,
  marketplaceTrackSchema,
} from "../src/schemas/vendor.js";

describe("Marketplace Analytics Tracking Contract (@halaa/shared)", () => {
  it("defines frozen canonical constants", () => {
    assert.deepEqual([...MARKETPLACE_EVENT_TYPES], ["service_view", "vendor_view", "contact_click"]);
    assert.deepEqual([...MARKETPLACE_TARGET_TYPES], ["service", "vendor"]);
    assert.deepEqual([...MARKETPLACE_CONTACT_METHODS], [
      "whatsapp",
      "phone",
      "email",
      "website",
      "social",
      "service_request",
    ]);
    assert.throws(() => {
      MARKETPLACE_EVENT_TYPES.push("invalid");
    });
  });

  it("validates a valid service_view event payload", () => {
    const valid = {
      eventType: "service_view",
      targetType: "service",
      targetId: "507f1f77bcf86cd799439011",
      metadata: { referrer: "marketplace_grid" },
    };
    const parsed = marketplaceTrackSchema.safeParse(valid);
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.eventType, "service_view");
    assert.equal(parsed.data.targetId, "507f1f77bcf86cd799439011");
  });

  it("validates a valid vendor_view event payload", () => {
    const valid = {
      eventType: "vendor_view",
      targetType: "vendor",
      targetId: "507f1f77bcf86cd799439012",
    };
    const parsed = marketplaceTrackSchema.safeParse(valid);
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.eventType, "vendor_view");
  });

  it("validates a valid contact_click event payload with contactMethod", () => {
    const valid = {
      eventType: "contact_click",
      targetType: "vendor",
      targetId: "507f1f77bcf86cd799439013",
      contactMethod: "whatsapp",
      metadata: { serviceId: "507f1f77bcf86cd799439014" },
    };
    const parsed = marketplaceTrackSchema.safeParse(valid);
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.contactMethod, "whatsapp");
  });

  it("rejects invalid eventType, targetType, or invalid ObjectId", () => {
    assert.equal(
      marketplaceTrackSchema.safeParse({
        eventType: "invalid_view",
        targetType: "service",
        targetId: "507f1f77bcf86cd799439011",
      }).success,
      false
    );

    assert.equal(
      marketplaceTrackSchema.safeParse({
        eventType: "service_view",
        targetType: "unknown_target",
        targetId: "507f1f77bcf86cd799439011",
      }).success,
      false
    );

    assert.equal(
      marketplaceTrackSchema.safeParse({
        eventType: "service_view",
        targetType: "service",
        targetId: "not-an-object-id",
      }).success,
      false
    );
  });
});
