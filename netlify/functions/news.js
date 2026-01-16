// netlify/functions/news.js
exports.handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};

    // Foco Brasil (fixo)
    const lang = "pt";
    const country = "br";

    // Categorias da GNews (general, nation, business, etc.)
    const category = params.category || "nation"; // padrão: Brasil (nation)
    const q = (params.q || "").trim();
    const max = params.max || "18";
    const page = params.page || "1";

    // Últimas 24h (padrão)
    const now = new Date();
    const fromDefault = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const toDefault = now.toISOString();

    // Permite sobrescrever se você quiser (opcional)
    const from = params.from || fromDefault;
    const to = params.to || toDefault;

    // Opções úteis no search
    const inParam = params.in || "title,description";
    const sortby = params.sortby || "publishedAt";

    const key = process.env.GNEWS_KEY;
    if (!key) {
      return {
        statusCode: 500,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ error: "GNEWS_KEY não configurada nas variáveis do site (Netlify)." }),
      };
    }

    // A GNews aceita q, country, lang, max e também from/to (ISO 8601). :contentReference[oaicite:1]{index=1}
    const endpoint = q
      ? `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=${lang}&country=${country}&max=${encodeURIComponent(max)}&page=${encodeURIComponent(page)}&in=${encodeURIComponent(inParam)}&sortby=${encodeURIComponent(sortby)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&apikey=${key}`
      : `https://gnews.io/api/v4/top-headlines?category=${encodeURIComponent(category)}&lang=${lang}&country=${country}&max=${encodeURIComponent(max)}&page=${encodeURIComponent(page)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&apikey=${key}`;

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
