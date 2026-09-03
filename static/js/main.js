// ── Helpers ──────────────────────────────────────────────
const $ = id => document.getElementById(id);

function formatRupiah(n) {
  return "Rp " + n.toLocaleString("id-ID");
}

function scoreClass(s) {
  if (s >= 0.4) return "score-high";
  if (s >= 0.15) return "score-mid";
  return "score-low";
}

// ── Render product card ───────────────────────────────────
function renderCard(item, showRekomBtn = true) {
  const cls = scoreClass(item.score);
  const desc = item.deskripsi
    ? `<p class="product-desc">${item.deskripsi}</p>`
    : "";
  const rekBtn = showRekomBtn
    ? `<button class="btn-rekomendasi" onclick="fetchRekomendasi('${item.nama_produk.replace(/'/g, "\\'")}')">Produk serupa</button>`
    : `<span></span>`;

  return `
    <div class="product-card">
      <div class="card-top">
        <span class="product-name">${item.nama_produk}</span>
        <span class="score-badge ${cls}" data-score="${item.score}" title="Skor relevansi: ${item.score}">
          ${item.score.toFixed(3)}
        </span>
      </div>
      <div class="product-kategori">${item.kategori}</div>
      ${desc}
      <div class="card-bottom">
        <span class="product-price">${formatRupiah(item.harga)}</span>
        ${rekBtn}
      </div>
    </div>
  `;
}

// ── Search ────────────────────────────────────────────────
async function doSearch() {
  const query = $("searchInput").value.trim();
  const kategori = $("kategoriFilter") ? $("kategoriFilter").value : "";

  if (!query) return;

  // show loading
  $("resultsSection").classList.remove("hidden");
  $("emptyState").classList.add("hidden");
  $("rekomendasiSection").classList.add("hidden");
  $("resultsLabel").textContent = "Mencari...";
  $("resultsMeta").textContent = "";
  $("resultsGrid").innerHTML = `
    <div class="product-card"><div class="loading-shimmer"></div><div class="loading-shimmer" style="width:60%"></div></div>
    <div class="product-card"><div class="loading-shimmer"></div><div class="loading-shimmer" style="width:60%"></div></div>
    <div class="product-card"><div class="loading-shimmer"></div><div class="loading-shimmer" style="width:60%"></div></div>
  `;

  const params = new URLSearchParams({ q: query, kategori });
  const res = await fetch(`/search?${params}`);
  const data = await res.json();

  if (data.results.length === 0) {
    $("resultsSection").classList.add("hidden");
    $("emptyState").classList.remove("hidden");
    return;
  }

  $("resultsLabel").textContent = `Hasil untuk "${data.query}"`;
  $("resultsMeta").textContent = `${data.total} produk ditemukan`;
  $("resultsGrid").innerHTML = data.results.map(r => renderCard(r)).join("");
}

// ── Rekomendasi ───────────────────────────────────────────
async function fetchRekomendasi(namaProduk) {
  $("rekomendasiSection").classList.remove("hidden");
  $("rekomendasiLabel").textContent = `Memuat rekomendasi...`;
  $("rekomendasiGrid").innerHTML = `
    <div class="product-card"><div class="loading-shimmer"></div><div class="loading-shimmer" style="width:60%"></div></div>
    <div class="product-card"><div class="loading-shimmer"></div><div class="loading-shimmer" style="width:60%"></div></div>
  `;

  // Scroll to rekomendasi
  $("rekomendasiSection").scrollIntoView({ behavior: "smooth", block: "start" });

  const params = new URLSearchParams({ nama: namaProduk });
  const res = await fetch(`/rekomendasi?${params}`);
  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    $("rekomendasiLabel").textContent = `Tidak ada rekomendasi untuk "${namaProduk}"`;
    $("rekomendasiGrid").innerHTML = "";
    return;
  }

  $("rekomendasiLabel").textContent = `Produk serupa dengan "${data.referensi}"`;
  $("rekomendasiGrid").innerHTML = data.results.map(r => renderCard(r, false)).join("");
}

// ── Event Listeners ───────────────────────────────────────
$("searchBtn").addEventListener("click", doSearch);

$("searchInput").addEventListener("keydown", e => {
  if (e.key === "Enter") doSearch();
});

// ── Score badge tooltip ───────────────────────────────────
const tooltip = $("tooltip");

document.addEventListener("mouseover", e => {
  const badge = e.target.closest(".score-badge");
  if (!badge) return;
  const score = badge.dataset.score;
  tooltip.textContent = `Skor relevansi TF-IDF: ${score}`;
  tooltip.classList.remove("hidden");
});

document.addEventListener("mousemove", e => {
  tooltip.style.left = e.clientX + 14 + "px";
  tooltip.style.top = e.clientY - 28 + "px";
});

document.addEventListener("mouseout", e => {
  if (!e.target.closest(".score-badge")) return;
  tooltip.classList.add("hidden");
});
