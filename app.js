```js
// app.js — Portal News (Netlify Function + GNews) | Foco: Brasil + últimas 24h
// Requisitos:
// - data.js deve conter: window.NEWS_DATA = { lastUpdate:"", articles:[] };
// - Netlify Function em: /.netlify/functions/news (news.js)
// - index.html deve incluir: <script src="data.js"></script> <script src="app.js"></script>

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const PROXY_NEWS = "/.netlify/functions/news";

// Mapear os chips do site -> categorias da GNews
// GNews categories: general, world, nation, business, technology, entertainment, sports, science, health
const categoryMap = {
  "Todas": "general",
  "Brasil": "nation",
  "Mundo": "world",
  "Economia": "business",
  "Tecnologia": "technology",
  "Esportes": "sports",
  "Entretenimento": "entertainment",
  "Ciência": "science",
  "Saúde": "health",
};

const state = {
  category: "Brasil", // padrão: foco Brasil
  query: "",
  theme: localStorage.getItem("pn_theme") || "dark",
};

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("pn_theme", theme);
  const btn = $("#themeBtn");
  if (btn) btn.textContent = theme === "dark" ? "🌙" : "☀️";
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

function estimateReadMinutes(text) {
  const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(words / 180));
}

function formatKicker(a) {
  // Ex.: "Brasil • 16 jan 2026 • 6 min"
  const cat = a.category || "Geral";
  const date = a.date || "";
  const min = a.minutes || 2;
  return `${cat} • ${date} • ${min} min`;
}

function setActiveChip(category) {
  $$(".chip").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.category === category);
  });
}

function renderHero(article) {
  const hero = $("#heroCard");
  if (!hero) return;

  hero.classList.remove("skeleton");

  // fallback seguro
  const title = escapeHtml(article?.title || "Sem manchete");
  const excerpt = escapeHtml(article?.excerpt || "Sem descrição.");
  const kicker = escapeHtml(formatKicker(article || {}));
  const author = escapeHtml(article?.author || "Fonte");
  const date = escapeHtml(article?.date || "");

  hero.innerHTML = `
    <div class="hero-top">
      <span class="badge">Destaque</span>
      <span class="muted">${kicker}</span>
    </div>
    <h1 class="hero-title">${title}</h1>
    <p class="hero-desc">${excerpt}</p>

    <div class="hero-meta">
      <span class="pill">Fonte: ${author}</span>
      <span class="pill">${date}</span>
    </div>

    <div class="hero-actions">
      <button class="btn" type="button" data-open="${escapeHtml(article?.id || "")}">Abrir matéria</button>
      <button class="btn secondary" type="button" data-share="${escapeHtml(article?.id || "")}">Compartilhar</button>
    </div>
  `;
}

function renderTrending(list) {
  const trending = $("#trendingList");
  const trendingCount = $("#trendingCount");
  if (!trending) return;

  trending.innerHTML = "";
  const items = (list || []).slice(0, 5);
  if (trendingCount) trendingCount.textContent = `${items.length} tópicos`;

  items.forEach((a) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <a href="#" data-open="${escapeHtml(a.id)}">
        <strong>${escapeHtml(a.title)}</strong>
        <div class="muted" style="font-size:12px; margin-top:2px;">
          ${escapeHtml(a.author)} • ${escapeHtml(a.date)}
        </div>
      </a>
    `;
    trending.appendChild(li);
  });
}

function renderCards(list) {
  const cards = $("#cards");
  const empty = $("#emptyState");
  if (!cards) return;

  cards.innerHTML = "";

  if (!list || !list.length) {
    if (empty) empty.classList.remove("hidden");
    return;
  }
  if (empty) empty.classList.add("hidden");

  list.forEach((a) => {
    const el = document.createElement("article");
    el.className = "card";

    const bg =
      a.image
        ? `style="background-image:url('${a.image}'); background-size:cover; background-position:center;"`
        : "";

    el.innerHTML = `
      <div class="thumb" ${bg}>
        <span class="kicker"><span class="dot"></span>${escapeHtml(formatKicker(a))}</span>
      </div>
      <div class="body">
        <h3>${escapeHtml(a.title)}</h3>
        <p>${escapeHtml(a.excerpt)}</p>

        <div class="bottom">
          <span>${escapeHtml(a.author)}</span>
          <a class="read" href="#" data-open="${escapeHtml(a.id)}">Abrir →</a>
        </div>
      </div>
    `;
    cards.appendChild(el);
  });
}

function applyUIMeta() {
  const sectionTitle = $("#sectionTitle");
  const resultsCount = $("#resultsCount");
  const lastUpdate = $("#lastUpdate");

  const articles = (window.NEWS_DATA?.articles || []);
  if (sectionTitle) sectionTitle.textContent = state.category === "Todas" ? "Últimas" : state.category;
  if (resultsCount) resultsCount.textContent = `${articles.length} resultado(s)`;
  if (lastUpdate) lastUpdate.textContent = `Atualizado: ${window.NEWS_DATA?.lastUpdate || "-"}`;
}

function openArticle(id) {
  const a = window.NEWS_DATA?.articles?.find((x) => x.id === id);
  if (!a?.url) return;
  window.open(a.url, "_blank", "noopener,noreferrer");
}

async function shareArticle(id) {
  const a = window.NEWS_DATA?.articles?.find((x) => x.id === id);
  if (!a?.url) return;

  try {
    if (navigator.share) {
      await navigator.share({ title: a.title, url: a.url });
    } else {
      await navigator.clipboard?.writeText(a.url);
      alert("Link copiado:\n\n" + a.url);
    }
  } catch {
    // usuário cancelou ou browser bloqueou
  }
}

function mapArticlesFromApi(data) {
  const raw = data?.articles || [];
  return raw.map((x, idx) => ({
    id: x.url || `${Date.now()}-${idx}`,
    // Mantém a categoria escolhida no chip; se for "Todas", vira "Geral"
    category: state.category === "Todas" ? "Geral" : state.category,
    title: x.title || "Sem título",
    excerpt: x.description || x.content || "Sem descrição.",
    author: x.source?.name || "Fonte",
    minutes: estimateReadMinutes(`${x.title || ""} ${x.description || ""} ${x.content || ""}`),
    date: fmtDate(x.publishedAt) || "",
    trending: idx < 5,
    url: x.url,
    image: x.image || ""
  }));
}

async function fetchNews() {
  const max = 18;

  // Se tiver busca, manda q=...
  if (state.query.trim()) {
    const q = encodeURIComponent(state.query.trim());
    const url = `${PROXY_NEWS}?q=${q}&max=${max}`;
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Erro API (${res.status}) ${txt}`.trim());
    }
    const data = await res.json();
    return mapArticlesFromApi(data);
  }

  // Sem busca: top-headlines por categoria
  const apiCategory = categoryMap[state.category] || "nation";
  const url = `${PROXY_NEWS}?category=${encodeURIComponent(apiCategory)}&max=${max}`;
  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Erro API (${res.status}) ${txt}`.trim());
  }
  const data = await res.json();
  return mapArticlesFromApi(data);
}

function setLoadingUI(isLoading, message = "Carregando...") {
  const hero = $("#heroCard");
  if (!hero) return;

  if (isLoading) {
    hero.classList.add("skeleton");
    hero.textContent = message;
  } else {
    hero.classList.remove("skeleton");
  }
}

function renderAll() {
  const articles = window.NEWS_DATA?.articles || [];
  const heroPick = articles[0];
  if (heroPick) renderHero(heroPick);
  renderTrending(articles.slice(0, 5));
  renderCards(articles);
  applyUIMeta();
}

async function refresh() {
  setLoadingUI(true, "Carregando manchete...");

  try {
    const mapped = await fetchNews();

    // Garante que NEWS_DATA exista (caso data.js falhe)
    if (!window.NEWS_DATA) window.NEWS_DATA = { lastUpdate: "", articles: [] };

    window.NEWS_DATA.articles = mapped;
    window.NEWS_DATA.lastUpdate = new Date().toLocaleString("pt-BR");

    renderAll();
  } catch (err) {
    const hero = $("#heroCard");
    if (hero) {
      hero.classList.remove("skeleton");
      hero.innerHTML = `
        <strong>Erro ao carregar notícias</strong>
        <div class="muted" style="margin-top:6px;">${escapeHtml(err.message)}</div>
        <div class="muted" style="margin-top:10px;">Dica: teste a function em <code>/.netlify/functions/news?category=nation</code></div>
      `;
    }
    const cards = $("#cards");
    if (cards) cards.innerHTML = "";
    const empty = $("#emptyState");
    if (empty) empty.classList.remove("hidden");
    applyUIMeta();
  }
}

function setupEvents() {
  // Chips (categorias)
  $$(".chip").forEach((btn) => {
    btn.addEventListener("click", async () => {
      state.category = btn.dataset.category;
      setActiveChip(state.category);

      // ao trocar categoria, limpa busca (opcional — deixa mais "portal")
      state.query = "";
      const input = $("#searchInput");
      if (input) input.value = "";

      // fecha menu mobile
      const menu = $("#menu");
      if (menu) menu.classList.remove("open");
      const menuBtn = $("#menuBtn");
      if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");

      await refresh();
    });
  });

  // Busca (enter ou sair do campo)
  const search = $("#searchInput");
  if (search) {
    search.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        state.query = e.target.value || "";
        await refresh();
      }
    });
    search.addEventListener("change", async (e) => {
      state.query = e.target.value || "";
      await refresh();
    });
  }

  // Delegação: abrir / compartilhar
  document.body.addEventListener("click", (e) => {
    const open = e.target.closest("[data-open]");
    const share = e.target.closest("[data-share]");
    if (open) {
      e.preventDefault();
      openArticle(open.dataset.open);
    }
    if (share) {
      e.preventDefault();
      shareArticle(share.dataset.share);
    }

    // Footer links (se existirem)
    const footer = e.target.closest("[data-footer-category]");
    if (footer) {
      e.preventDefault();
      state.category = footer.dataset.footerCategory;
      setActiveChip(state.category);
      refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  // Tema
  const themeBtn = $("#themeBtn");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      setTheme(state.theme === "dark" ? "light" : "dark");
    });
  }

  // Menu mobile
  const menuBtn = $("#menuBtn");
  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      const menu = $("#menu");
      if (!menu) return;
      const isOpen = menu.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", String(isOpen));
    });
  }

  // Newsletter (exemplo)
  const form = $("#newsletterForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const msg = $("#newsletterMsg");
      if (msg) msg.textContent = "Inscrição registrada (exemplo).";
      e.target.reset();
    });
  }
}

function init() {
  // Garante NEWS_DATA
  if (!window.NEWS_DATA) window.NEWS_DATA = { lastUpdate: "", articles: [] };

  setTheme(state.theme);

  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  // Define chip ativo inicial
  setActiveChip(state.category);

  setupEvents();
  refresh();
}

init();
```
