// netlify/functions/news.js
// Proxy seguro para a GNews API (chave fica na Netlify)
// Padrão: Brasil (country=br), PT (lang=pt), últimas 24h (from/to)
// Uso no navegador:
//   /.netlify/functions/news?category=nation
//   /.netlify/functions/news?q=governo
//   /.netlify/functions/news?category=business
//
// Requer variável de ambiente na Netlify:
//   GNEWS_KEY = sua_chave

exports.handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};

    // Foco Brasil (fixo)
    const lang = "pt";
    const country = "br";

    // Inputs
    const category = params.category || "nation";  // padrão: Brasil
    const q = (params.q || "").trim();
    const max = params.max || "18";
    const page = params.page || "1";

    // Últimas 24h (padrão)
    const now = new Date();
    const fromDefault = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const toDefault = now.toISOString();

    // Permite sobrescrever se necessário (opcional)
    const from = params.from || fromDefault;
    const to = params.to || toDefault;

    // Extras úteis (principalmente no search)
    const inParam = params.in || "title,description";
    const sortby = params.sortby || "publishedAt";

    const key = process.env.GNEWS_KEY;
    if (!key) {
      return {
        statusCode: 500,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          error: "GNEWS_KEY não configurada nas variáveis do site (Netlify).",
          hint: "Vá em Site settings → Environment variables e adicione GNEWS_KEY, depois redeploy."
        }),
      };
    }

    // Monta endpoint
    const endpoint = q
      ? `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=${lang}&country=${country}&max=${encodeURIComponent(max)}&page=${encodeURIComponent(page)}&in=${encodeURIComponent(inParam)}&sortby=${encodeURIComponent(sortby)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&apikey=${key}`
      : `https://gnews.io/api/v4/top-headlines?category=${encodeURIComponent(category)}&lang=${lang}&country=${country}&max=${encodeURIComponent(max)}&page=${encodeURIComponent(page)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&apikey=${key}`;

    const r = await fetch(endpoint);
    const text = await r.text();

    // Resposta da GNews pode ser JSON (normal), mas em caso de erro pode vir outro conteúdo.
    // Tentamos devolver como JSON quando possível.
    let body = text;
    try {
      body = JSON.stringify(JSON.parse(text));
    } catch {
      // mantém texto bruto
    }

    return {
      statusCode: r.status,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "cache-control": "no-store",
      },
      body,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: "Falha na function", details: String(err) }),
    };
  }
};
