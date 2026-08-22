import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobileRoot = path.resolve(__dirname, "../..");

test("AND-01: ErrorBoundary records uncaught render errors to AsyncStorage for field diagnostics", () => {
  const boundarySource = fs.readFileSync(
    path.join(mobileRoot, "components/shared/ErrorBoundary.js"),
    "utf8"
  );

  assert.ok(
    boundarySource.includes("AsyncStorage"),
    "ErrorBoundary must import AsyncStorage"
  );
  assert.ok(
    boundarySource.includes("LAST_BOUNDARY_ERROR_KEY"),
    "ErrorBoundary must export LAST_BOUNDARY_ERROR_KEY"
  );
  assert.ok(
    boundarySource.includes("getLastBoundaryError"),
    "ErrorBoundary must export getLastBoundaryError helper"
  );
  assert.ok(
    boundarySource.includes("AsyncStorage.setItem(LAST_BOUNDARY_ERROR_KEY"),
    "componentDidCatch must persist error payload to AsyncStorage"
  );
});

test("AND-01: PlansScreen and subcomponents defensively guard against nullish subscription and plan fields", () => {
  const plansScreenSource = fs.readFileSync(
    path.join(mobileRoot, "screens/host/PlansScreen.js"),
    "utf8"
  );
  const currentPlanSource = fs.readFileSync(
    path.join(mobileRoot, "components/plans/CurrentPlanCard.js"),
    "utf8"
  );
  const hostPlanCardSource = fs.readFileSync(
    path.join(mobileRoot, "components/plans/HostPlanCard.js"),
    "utf8"
  );
  const planDescSource = fs.readFileSync(
    path.join(mobileRoot, "components/plans/PlanDescription.js"),
    "utf8"
  );

  // PlansScreen filters store hidden plans safely and handles null response
  assert.ok(
    plansScreenSource.includes("response?.data?.basic?.[billingType]"),
    "PlansScreen safely accesses basic plans"
  );
  assert.ok(
    plansScreenSource.includes("response?.data?.premium?.[billingType]"),
    "PlansScreen safely accesses premium plans"
  );

  // CurrentPlanCard handles null subscription safely
  assert.ok(
    currentPlanSource.includes("if (!subscription)"),
    "CurrentPlanCard handles null subscription gracefully"
  );

  // HostPlanCard handles empty plans array and undefined selection
  assert.ok(
    hostPlanCardSource.includes("plans = []"),
    "HostPlanCard defaults plans to empty array"
  );

  // PlanDescription handles null plan
  assert.ok(
    planDescSource.includes("if (!plan) return null;"),
    "PlanDescription returns null when plan is not provided"
  );
});
