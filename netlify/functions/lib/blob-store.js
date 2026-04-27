import { getStore } from "@netlify/blobs";

export function getConfiguredStore(name, options = {}) {
  const siteID =
    process.env.NETLIFY_BLOBS_SITE_ID ||
    process.env.NETLIFY_SITE_ID ||
    process.env.SITE_ID;
  const token =
    process.env.NETLIFY_BLOBS_TOKEN ||
    process.env.NETLIFY_AUTH_TOKEN;

  const config = {
    name,
    ...options,
  };

  if (siteID && token) {
    config.siteID = siteID;
    config.token = token;
  }

  return getStore(config);
}
