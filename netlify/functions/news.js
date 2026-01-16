// netlify/functions/news.js
exports.handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const category = params.category || "general";
    const q = (params.q || "").trim();

    const lang = "pt";
    const country = "br";
    const max = params.max || "18";
    const key = process.env.GNEWS_KEY;

    if (!key) {
      return {
        statusCode: 500,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ error: "GNEWS_KEY não configurada nas variáveis do site (Netlify)." }),
      };
    }

    const endpoint = q
      ? `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=${lang}&country=${country}&max=${max}&apikey=${key}`
      : `https://gnews.io/api/v4/top-headlines?category=${encodeURIComponent(category)}&lang=${lang}&country=${country}&max=${max}&apikey=${key}`;

    const r = await fetch(endpoint);
    const data = await r.json();

    return {
      statusCode: r.status,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: "Falha na function", details: String(err) }),
    };
  }
};
