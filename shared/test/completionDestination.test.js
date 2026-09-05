import test from "node:test";
import assert from "node:assert/strict";
import {
  COMPLETION_KINDS,
  parseCompletionDestination,
  resolveWebCompletionUrl,
  resolveMobileCompletionRoute,
} from "../src/schemas/completionDestination.js";

test("parseCompletionDestination: defaults to plans on nullish or invalid input", () => {
  assert.deepEqual(parseCompletionDestination(null), {
    kind: COMPLETION_KINDS.PLANS,
    eventId: null,
    returnTo: null,
  });
  assert.deepEqual(parseCompletionDestination({}), {
    kind: COMPLETION_KINDS.PLANS,
    eventId: null,
    returnTo: null,
  });
  assert.deepEqual(parseCompletionDestination({ kind: "invalid_xyz" }), {
    kind: COMPLETION_KINDS.PLANS,
    eventId: null,
    returnTo: null,
  });
});

test("parseCompletionDestination: accepts allowlisted kinds and preserves parameters", () => {
  assert.deepEqual(
    parseCompletionDestination({
      kind: COMPLETION_KINDS.EVENT_GATE,
      eventId: "evt-123",
    }),
    {
      kind: COMPLETION_KINDS.EVENT_GATE,
      eventId: "evt-123",
      returnTo: null,
    }
  );

  assert.deepEqual(
    parseCompletionDestination({
      origin: "invitation_balance",
      eventId: "evt-456",
      returnTo: "dashboard",
    }),
    {
      kind: COMPLETION_KINDS.INVITATION_BALANCE,
      eventId: "evt-456",
      returnTo: "dashboard",
    }
  );
});

test("resolveWebCompletionUrl: produces canonical web routes", () => {
  assert.equal(
    resolveWebCompletionUrl({ kind: COMPLETION_KINDS.PLANS }, "ar"),
    "/ar/host/plans"
  );
  assert.equal(
    resolveWebCompletionUrl({ kind: COMPLETION_KINDS.PLANS }, "en"),
    "/en/host/plans"
  );

  assert.equal(
    resolveWebCompletionUrl({ kind: COMPLETION_KINDS.EVENT_GATE }, "ar"),
    "/ar/host/create-event"
  );
  assert.equal(
    resolveWebCompletionUrl({ kind: COMPLETION_KINDS.EVENT_GATE, eventId: "evt-1" }, "ar"),
    "/ar/host/events/evt-1"
  );

  assert.equal(
    resolveWebCompletionUrl(
      { kind: COMPLETION_KINDS.INVITATION_BALANCE, returnTo: "dashboard" },
      "ar"
    ),
    "/ar/host"
  );
  assert.equal(
    resolveWebCompletionUrl(
      { kind: COMPLETION_KINDS.INVITATION_BALANCE, eventId: "evt-99" },
      "en"
    ),
    "/en/host/events/evt-99"
  );
});

test("resolveMobileCompletionRoute: produces canonical navigation actions", () => {
  assert.deepEqual(
    resolveMobileCompletionRoute({ kind: COMPLETION_KINDS.PLANS }),
    { screen: "MainTabs", params: { screen: "Plans" } }
  );

  assert.deepEqual(
    resolveMobileCompletionRoute({ kind: COMPLETION_KINDS.EVENT_GATE }),
    { screen: "CreateEvent" }
  );
  assert.deepEqual(
    resolveMobileCompletionRoute({ kind: COMPLETION_KINDS.EVENT_GATE, eventId: "evt-55" }),
    { screen: "EventDetails", params: { eventId: "evt-55" } }
  );

  assert.deepEqual(
    resolveMobileCompletionRoute({ kind: COMPLETION_KINDS.INVITATION_BALANCE, returnTo: "Home" }),
    { screen: "MainTabs", params: { screen: "Home" } }
  );
  assert.deepEqual(
    resolveMobileCompletionRoute({ kind: COMPLETION_KINDS.INVITATION_BALANCE, eventId: "evt-77" }),
    { screen: "EventDetails", params: { eventId: "evt-77" } }
  );
});
