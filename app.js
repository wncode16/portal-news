const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const state = {
  category: "Todas",
  query: "",
  theme: localStorage.getItem("pn_theme") || "dark",
};

function setTheme(theme){
  state.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("pn_theme", theme);
  $("#themeBtn").textContent = theme === "dark" ? "🌙" : "☀️";
}

function formatKicker(a){
  return `${a.category} • ${a.date} • ${a.minutes} min`;
}

function renderHero(article){
  const hero = $("#heroCard");
  hero.classList.remove("skeleton");
  hero.innerHTML = `
    <div class="hero-top">
      <span class="badge">Destaque</span>
      <span class="muted">${formatKicker(article)}</span>
    </div>
    <h1 class="hero-title">${escapeHtml(article.title)}</h1>
    <p class="hero-desc">${escapeHtml(article.excerpt)}</p>

    <div class="hero-meta">
      <span class="pill">Por ${escapeHtml(article.author)}</span>
      <span class="pill">ID: ${escapeHtml(article.id)}</span>
    </div>

    <div class="hero-actions">
      <button class="btn" type="button" data-open="${article.id}">Ler agora</button>
      <button class="btn secondary" type="button" data-share="${article.id}">Compartilhar</button>
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
      <a href="#" data-open="${a.id}">
        <strong>${escapeHtml(a.title)}</strong>
        <div class="muted" style="font-size:12px; margin-top:2px;">${escapeHtml(a.category)} • ${escapeHtml(a.date)}</div>
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
    el.innerHTML = `
      <div class="thumb">
        <span class="kicker"><span class="dot"></span>${escapeHtml(formatKicker(a))}</span>
      </div>
      <div class="body">
        <h3>${escapeHtml(a.title)}</h3>
        <p>${escapeHtml(a.excerpt)}</p>

        <div class="bottom">
          <span>Por ${escapeHtml(a.author)}</span>
          <a class="read" href="#" data-open="${a.id}">Ler →</a>
        </div>
      </div>
    `;
    cards.appendChild(el);
  });
}

function applyFilters(){
  const { articles } = window.NEWS_DATA;
  const q = state.query.trim().toLowerCase();

  let filtered = articles.slice();

  if (state.category !== "Todas"){
    filtered = filtered.filter(a => a.category === state.category);
  }

  if (q){
    filtered = filtered.filter(a => {
      const hay = `${a.title} ${a.excerpt} ${a.category} ${a.author}`.toLowerCase();
      return hay.includes(q);
    });
  }

  // Ordena por "trending" primeiro e depois por data (texto) como fallback
  filtered.sort((a,b) => Number(b.trending) - Number(a.trending));

  $("#sectionTitle").textContent = state.category === "Todas" ? "Últimas" : state.category;
  $("#resultsCount").textContent = `${filtered.length} resultado(s)`;
  $("#lastUpdate").textContent = `Atualizado: ${window.NEWS_DATA.lastUpdate}`;

  renderCards(filtered);
}

function setActiveChip(category){
  $$(".chip").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.category === category);
  });
}

function openArticle(id){
  const a = window.NEWS_DATA.articles.find(x => x.id === id);
  if (!a) return;

  const text = `${a.title}\n\n${a.excerpt}\n\nCategoria: ${a.category}\nData: ${a.date}\nAutor: ${a.author}\nLeitura: ${a.minutes} min\n\n(Conteúdo completo não incluído — exemplo de site estático.)`;
  alert(text);
}

function shareArticle(id){
  const a = window.NEWS_DATA.articles.find(x => x.id === id);
  if (!a) return;

  const shareText = `Portal News: ${a.title}`;
  if (navigator.share){
    navigator.share({ title: "Portal News", text: shareText });
  } else {
    navigator.clipboard?.writeText(shareText);
    alert("Texto copiado para compartilhar:\n\n" + shareText);
  }
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setupEvents(){
  // Categoria (chips)
  $$(".chip").forEach(btn => {
    btn.addEventListener("click", () => {
      state.category = btn.dataset.category;
      setActiveChip(state.category);
      applyFilters();

      // fecha menu no mobile
      $("#menu").classList.remove("open");
      $("#menuBtn").setAttribute("aria-expanded", "false");
    });
  });

  // Busca
  $("#searchInput").addEventListener("input", (e) => {
    state.query = e.target.value;
    applyFilters();
  });

  // Delegação de clique para abrir/compartilhar
  document.body.addEventListener("click", (e) => {
    const open = e.target.closest("[data-open]");
    const share = e.target.closest("[data-share]");
    if (open){
      e.preventDefault();
      openArticle(open.dataset.open);
    }
    if (share){
      e.preventDefault();
      shareArticle(share.dataset.share);
    }

    const footer = e.target.closest("[data-footer-category]");
    if (footer){
      e.preventDefault();
      state.category = footer.dataset.footerCategory;
      setActiveChip(state.category);
      applyFilters();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  // Tema
  $("#themeBtn").addEventListener("click", () => {
    setTheme(state.theme === "dark" ? "light" : "dark");
  });

  // Menu mobile
  $("#menuBtn").addEventListener("click", () => {
    const menu = $("#menu");
    const isOpen = menu.classList.toggle("open");
    $("#menuBtn").setAttribute("aria-expanded", String(isOpen));
  });

  // Newsletter (exemplo)
  $("#newsletterForm").addEventListener("submit", (e) => {
    e.preventDefault();
    $("#newsletterMsg").textContent = "Inscrição registrada (exemplo). Integre com um serviço real depois.";
    e.target.reset();
  });
}

function init(){
  setTheme(state.theme);
  $("#year").textContent = new Date().getFullYear();

  const { articles, lastUpdate } = window.NEWS_DATA;
  $("#lastUpdate").textContent = `Atualizado: ${lastUpdate}`;

  const heroPick = articles.find(a => a.trending) || articles[0];
  renderHero(heroPick);

  const trending = articles.filter(a => a.trending);
  renderTrending(trending);

  setupEvents();
  applyFilters();
}

init();
