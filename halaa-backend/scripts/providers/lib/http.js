function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function requestJson(url, options = {}) {
  const retries = options.retries ?? 4;
  const method = options.method || "GET";
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          Accept: "application/json",
          ...(options.body == null ? {} : { "Content-Type": "application/json" }),
          ...(options.headers || {}),
        },
        body: options.body == null ? undefined : JSON.stringify(options.body),
        signal: AbortSignal.timeout(options.timeoutMs || 30_000),
      });

      if (response.ok) {
        if (response.status === 204) return null;
        return response.json();
      }

      const retryable = response.status === 429 || response.status >= 500;
      const responseText = await response.text();
      let providerError = null;
      try {
        const parsed = responseText ? JSON.parse(responseText) : null;
        providerError = parsed?.errors?.[0] || parsed?.error || null;
      } catch {
        providerError = null;
      }
      const providerDetail = providerError?.detail || providerError?.message || null;
      const error = new Error(
        `${method} ${new URL(url).origin} failed with HTTP ${response.status}` +
          (providerDetail ? `: ${providerDetail}` : ""),
      );
      error.status = response.status;
      error.code = providerError?.code || providerError?.status || null;
      if (!retryable || attempt === retries) throw error;

      const retryAfter = Number(response.headers.get("retry-after"));
      await delay(Number.isFinite(retryAfter) ? retryAfter * 1000 : 500 * 2 ** attempt);
    } catch (error) {
      lastError = error;
      if (attempt === retries || (error.status && error.status < 500 && error.status !== 429)) throw error;
      await delay(500 * 2 ** attempt);
    }
  }
  throw lastError;
}

async function collectJsonApiPages(url, headers) {
  const data = [];
  let next = url;
  while (next) {
    const page = await requestJson(next, { headers });
    data.push(...(page.data || []));
    const link = page.links && page.links.next;
    next = link || null;
  }
  return data;
}

async function collectRevenueCatPages(url, headers) {
  const items = [];
  let next = url;
  while (next) {
    const page = await requestJson(next, { headers });
    items.push(...(page.items || []));
    const nextPage = page.next_page;
    next = nextPage
      ? new URL(nextPage, "https://api.revenuecat.com").toString()
      : null;
  }
  return items;
}

module.exports = { requestJson, collectJsonApiPages, collectRevenueCatPages };
