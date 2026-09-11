/** Read the host template-list API envelope without passing objects to list UIs. */
export function readTaqnyatTemplates(response) {
  const list = response?.data?.templates ?? response?.templates ?? response?.data ?? response;
  return Array.isArray(list) ? list : [];
}
