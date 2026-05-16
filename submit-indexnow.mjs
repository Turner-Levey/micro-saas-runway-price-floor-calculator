const host = "micro-saas-runway-price-floor-calculator.vercel.app";
const key = "87c4fb126d564ce691fbd301c50621ad";
const baseUrl = `https://${host}`;
const urls = ["/", "/llms.txt", "/sitemap.xml"].map((path) => `${baseUrl}${path}`);

const endpoint = "https://api.indexnow.org/indexnow";
const payload = {
  host,
  key,
  keyLocation: `${baseUrl}/${key}.txt`,
  urlList: urls
};

const response = await fetch(endpoint, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload)
});

console.log(JSON.stringify({ status: response.status, urls }, null, 2));
if (!response.ok && response.status !== 202) {
  process.exitCode = 1;
}
