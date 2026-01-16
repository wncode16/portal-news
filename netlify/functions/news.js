export default async (req) => {
  const url = new URL(req.url);
  const category = url.searchParams.get("category") || "general";
  const q = url.searchParams.get("q") || "";
  const lang = "pt";
  const country = "br";
  const max = "18";
  const key = process.env.GNEWS_KEY;

  const endpoint = q
    ? `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=${lang}&country=${country}&max=${max}&apikey=${key}`
    : `https://gnews.io/api/v4/top-headlines?category=${encodeURIComponent(category)}&lang=${lang}&country=${country}&max=${max}&apikey=${key}`;

  const r = await fetch(endpoint);
  const data = await r.json();

  return new Response(JSON.stringify(data), {
    status: r.status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });
};
