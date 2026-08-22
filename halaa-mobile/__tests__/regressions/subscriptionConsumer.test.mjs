import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSubscriptionResponse } from "@halaa/shared/utils";

test("EVT-17: reproduces subscription[0] bug vs normalized subscription access", () => {
  // Backend response shape from /api/v2/subscriptions/my-subscription
  const backendResponse = {
    status: "success",
    data: {
      subscriptions: [
        {
          _id: "660c1f77bcf86cd799439099",
          planCode: "trial",
          planType: "trial",
          status: "active",
        },
      ],
      hasSubscription: true,
      subscription: {
        _id: "660c1f77bcf86cd799439099",
        planCode: "trial",
        planType: "trial",
        status: "active",
      },
    },
  };

  // Buggy access: indexing singular object as array yields undefined
  const buggyAccess = backendResponse?.data?.subscription?.[0]?.planCode;
  assert.equal(buggyAccess, undefined, "Buggy access failed because subscription is an object");
  assert.equal(buggyAccess === "trial", false, "Buggy access failed to identify trial plan");

  // Canonical normalized access:
  const normalized = normalizeSubscriptionResponse(backendResponse);
  assert.equal(normalized.hasSubscription, true);
  assert.equal(normalized.subscription?.planCode, "trial");
  assert.equal(normalized.subscription?.planCode === "trial", true, "Normalized access accurately identifies trial plan");
});
