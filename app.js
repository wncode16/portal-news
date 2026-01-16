const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const GNEWS_KEY = "071421"; // ⚠️ ficará exposta no navegador
const PROXY_NEWS = "/.netlify/functions/news";
const url = state.query.trim()
  ? `${PROXY_NEWS}?q=${encodeURIComponent(state.query.trim())}&max=18`
  : `${PROXY_NEWS}?category=${encodeURIComponent(categoryMap[state.category] || "general")}&max=18`;

const res = await fetch(url);


const state = {
  category: "Todas",
  query: "",
  theme: localStorage.getItem("pn_theme") || "dark",
  articles: [],
};

const categoryMap = {
  "Todas": "general",
  "Brasil": "nation",
  "Mundo": "world",
  "Economia": "business",
  "Tecnologia": "technology",
  "Esportes": "sports",
  "Entretenimento": "entertainment",
};

function setTheme(theme){
  state.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("pn_theme", theme);
  $("#themeBtn").textContent = theme === "dark" ? "🌙" : "☀️";
}

function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmtDate(iso){
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day:"2-digit", month:"short", year:"numeric" });
  } catch { return ""; }
}

function formatKicker(a){
  return `${a.category} • ${a.date} • ${a.minutes} min`;
}

function estimateReadMinutes(text){
  const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(words / 180));
}

async function fetchGNews(){
  const lang = "pt";
  const country = "br";
  const max = 18;

  // Se tiver busca, usa o Search Endpoint; senão Top Headlines
  let url;
  if (state.query.trim()){
    const q = encodeURIComponent(state.query.trim());
    url = `${GNEWS_BASE}/search?q=${q}&lang=${lang}&country=${country}&max=${max}&apikey=${GNEWS_KEY}`;
  } else {
    const cat = categoryMap[state.category] || "general";
    url = `${GNEWS_BASE}/top-headlines?category=${cat}&lang=${lang}&country=${country}&max=${max}&apikey=${GNEWS_KEY}`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erro API (${res.status})`);
  const data = await res.json();

  // Mapeia pro formato do seu site
  const mapped = (data.articles || []).map((x, idx) => ({
    id: x.url || `${Date.now()}-${idx}`,
    category: state.category === "Todas" ? (x.source?.name ? "Geral" : "Geral") : state.category,
    title: x.title || "Sem título",
    excerpt: x.description || x.content || "Sem descrição.",
    author: x.source?.name || "Fonte",
    minutes: estimateReadMinutes(`${x.title} ${x.description} ${x.content}`),
    date: fmtDate(x.publishedAt) || "",
    trending: idx < 5,
    url: x.url,
    image: x.image
  }));

  state.articles = mapped;
  window.NEWS_DATA.lastUpdate = new Date().toLocaleString("pt-BR");
  window.NEWS_DATA.articles = mapped;
}

function renderHero(article){
  const hero = $("#heroCard");
  hero.classList.remove("skeleton");
  hero.innerHTML = `
    <div class="hero-top">
      <span class="badge">Destaque</span>
      <span class="muted">${escapeHtml(formatKicker(article))}</span>
    </div>
    <h1 class="hero-title">${escapeHtml(article.title)}</h1>
    <p class="hero-desc">${escapeHtml(article.excerpt)}</p>

    <div class="hero-meta">
      <span class="pill">Fonte: ${escapeHtml(article.author)}</span>
      <span class="pill">${escapeHtml(article.date)}</span>
    </div>

    <div class="hero-actions">
      <button class="btn" type="button" data-open="${escapeHtml(article.id)}">Abrir matéria</button>
      <button class="btn secondary" type="button" data-share="${escapeHtml(article.id)}">Compartilhar</button>
    </div>
  `;
}

function renderTrending(list){
  const trending = $("#trendingList");
  trending.innerHTML = "";
  const items = list.slice(0, 5);
  $("#trendingCount").textContent = `${items.length} tópicos`;

  items.forEach((a) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <a href="#" data-open="${escapeHtml(a.id)}">
        <strong>${escapeHtml(a.title)}</strong>
        <div class="muted" style="font-size:12px; margin-top:2px;">${escapeHtml(a.author)} • ${escapeHtml(a.date)}</div>
      </a>
    `;
    trending.appendChild(li);
  });
}

function renderCards(list){
  const cards = $("#cards");
  const empty = $("#emptyState");
  cards.innerHTML = "";

  if (!list.length){
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  list.forEach((a) => {
    const el = document.createElement("article");
    el.className = "card";
    const bg = a.image ? `style="background-image:url('${a.image}'); background-size:cover; background-position:center;"` : "";
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

function applyFilters(){
  // Agora os filtros principais já vêm do endpoint,
  // mas ainda dá pra contar e renderizar aqui.
  const filtered = window.NEWS_DATA.articles.slice();

  $("#sectionTitle").textContent = state.category === "Todas" ? "Últimas" : state.category;
  $("#resultsCount").textContent = `${filtered.length} resultado(s)`;
  $("#lastUpdate").textContent = `Atualizado: ${window.NEWS_DATA.lastUpdate || "-"}`;

  renderCards(filtered);
}

function setActiveChip(category){
  $$(".chip").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.category === category);
  });
}

function openArticle(id){
  const a = window.NEWS_DATA.articles.find(x => x.id === id);
  if (!a?.url) return;
  window.open(a.url, "_blank", "noopener,noreferrer");
}

function shareArticle(id){
  const a = window.NEWS_DATA.articles.find(x => x.id === id);
  if (!a?.url) return;

  if (navigator.share){
    navigator.share({ title: a.title, url: a.url });
  } else {
    navigator.clipboard?.writeText(a.url);
    alert("Link copiado:\n\n" + a.url);
  }
}

function setupEvents(){
  $$(".chip").forEach(btn => {
    btn.addEventListener("click", async () => {
      state.category = btn.dataset.category;
      setActiveChip(state.category);
      await refresh();
      $("#menu").classList.remove("open");
      $("#menuBtn").setAttribute("aria-expanded", "false");
    });
  });

  $("#searchInput").addEventListener("change", async (e) => {
    state.query = e.target.value;
    await refresh();
  });

  document.body.addEventListener("click", (e) => {
    const open = e.target.closest("[data-open]");
    const share = e.target.closest("[data-share]");
    if (open){ e.preventDefault(); openArticle(open.dataset.open); }
    if (share){ e.preventDefault(); shareArticle(share.dataset.share); }

    const footer = e.target.closest("[data-footer-category]");
    if (footer){
      e.preventDefault();
      state.category = footer.dataset.footerCategory;
      setActiveChip(state.category);
      refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  $("#themeBtn").addEventListener("click", () => {
    setTheme(state.theme === "dark" ? "light" : "dark");
  });

  $("#menuBtn").addEventListener("click", () => {
    const menu = $("#menu");
    const isOpen = menu.classList.toggle("open");
    $("#menuBtn").setAttribute("aria-expanded", String(isOpen));
  });

  $("#newsletterForm").addEventListener("submit", (e) => {
    e.preventDefault();
    $("#newsletterMsg").textContent = "Inscrição registrada (exemplo).";
    e.target.reset();
  });
}

async function refresh(){
  $("#heroCard").classList.add("skeleton");
  $("#heroCard").textContent = "Carregando...";
  try{
    await fetchGNews();
    const heroPick = window.NEWS_DATA.articles[0];
    if (heroPick) renderHero(heroPick);
    renderTrending(window.NEWS_DATA.articles.slice(0, 5));
    applyFilters();
  } catch (err){
    $("#heroCard").classList.remove("skeleton");
    $("#heroCard").innerHTML = `<strong>Erro ao carregar notícias:</strong><div class="muted" style="margin-top:6px;">${escapeHtml(err.message)}</div>`;
    $("#cards").innerHTML = "";
    $("#emptyState").classList.remove("hidden");
  }
}

function init(){
  setTheme(state.theme);
  $("#year").textContent = new Date().getFullYear();
  setupEvents();
  refresh();
}

init();
