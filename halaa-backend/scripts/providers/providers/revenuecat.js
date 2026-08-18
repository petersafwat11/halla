const { collectRevenueCatPages, requestJson } = require("../lib/http");

const BASE_URL = "https://api.revenuecat.com/v2";

async function exportRevenueCat() {
  const projectId = process.env.REVENUECAT_PROJECT_ID || "projc49d20a4";
  const apiKey = process.env.REVENUECAT_API_KEY;
  if (!apiKey) throw new Error("RevenueCat export requires REVENUECAT_API_KEY");
  const headers = { Authorization: `Bearer ${apiKey}` };
  const projectPath = `${BASE_URL}/projects/${encodeURIComponent(projectId)}`;

  const [projects, apps, products, entitlements, offerings, webhooks] = await Promise.all([
    collectRevenueCatPages(`${BASE_URL}/projects?limit=100`, headers),
    collectRevenueCatPages(`${projectPath}/apps?limit=100`, headers),
    collectRevenueCatPages(`${projectPath}/products?limit=100`, headers),
    collectRevenueCatPages(`${projectPath}/entitlements?limit=100`, headers),
    collectRevenueCatPages(`${projectPath}/offerings?limit=100`, headers),
    collectRevenueCatPages(`${projectPath}/integrations/webhooks?limit=100`, headers),
  ]);
  const project = projects.find((item) => item.id === projectId);
  if (!project) throw new Error(`RevenueCat project not visible to the configured API key: ${projectId}`);

  for (const entitlement of entitlements) {
    entitlement.products = await collectRevenueCatPages(
      `${projectPath}/entitlements/${encodeURIComponent(entitlement.id)}/products?limit=100`,
      headers,
    );
  }
  for (const offering of offerings) {
    offering.packages = await collectRevenueCatPages(
      `${projectPath}/offerings/${encodeURIComponent(offering.id)}/packages?limit=100`,
      headers,
    );
    for (const pkg of offering.packages) {
      pkg.products = await collectRevenueCatPages(
        `${projectPath}/packages/${encodeURIComponent(pkg.id)}/products?limit=100`,
        headers,
      );
    }
  }

  return {
    provider: "revenueCat",
    project: {
      id: project.id,
      name: project.name,
      createdAt: project.created_at,
    },
    apps,
    products,
    entitlements,
    offerings,
    webhooks: webhooks.map((webhook) => ({
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      environment: webhook.environment,
      eventTypes: webhook.event_types,
      appId: webhook.app_id,
    })),
  };
}

module.exports = { exportRevenueCat };
