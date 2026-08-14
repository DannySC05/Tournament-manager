module.exports = async function handler(req, res) {
  const url = new URL(req.url, "http://localhost");
  const path = url.searchParams.get("path");

  if (path) {
    url.searchParams.delete("path");
    const query = url.searchParams.toString();
    req.url = `/api/${path}${query ? `?${query}` : ""}`;
  }

  const { handleRequest } = await import("../backend/src/app.mjs");
  return handleRequest(req, res);
};
