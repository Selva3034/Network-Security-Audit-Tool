/* NSAT frontend logic — talks to the Flask JSON API. */

const api = {
  async post(url, body) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || "Request failed");
    return data;
  },
  async get(url) {
    const r = await fetch(url);
    if (r.status === 401) { location.href = "/"; return null; }
    if (!r.ok) throw new Error("Request failed");
    return r.json();
  },
  async del(url) {
    const r = await fetch(url, { method: "DELETE" });
    return r.json();
  },
};

function levelColor(level) {
  return { Secure: "safe", Low: "safe", Moderate: "warn", High: "danger", Critical: "critical" }[level] || "muted";
}

function msg(el, text, kind) {
  el.innerHTML = `<div class="msg ${kind}">${text}</div>`;
}

/* ------------------------------- login ------------------------------- */
function initLogin() {
  const form = document.getElementById("login-form");
  const out = document.getElementById("login-msg");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button");
    btn.disabled = true; btn.textContent = "Authenticating…";
    try {
      await api.post("/api/login", {
        username: form.username.value.trim(),
        password: form.password.value,
      });
      location.href = "/dashboard.html";
    } catch (err) {
      msg(out, err.message, "error");
      btn.disabled = false; btn.textContent = "Sign in";
    }
  });
}

/* ----------------------------- dashboard ----------------------------- */
async function initDashboard() {
  const s = await api.get("/api/stats");
  if (!s) return;
  document.getElementById("stat-total").textContent = s.total;
  document.getElementById("stat-online").textContent = `${s.online} hosts responded`;
  document.getElementById("stat-ports").textContent = s.open_ports;
  document.getElementById("stat-avg").textContent = s.avg_score;
  document.getElementById("stat-high").textContent = s.high_risk;

  // Bar chart — most exposed services
  new Chart(document.getElementById("chart-services"), {
    type: "bar",
    data: {
      labels: s.top_services.map((x) => x.service),
      datasets: [{ label: "Occurrences", data: s.top_services.map((x) => x.count), backgroundColor: "#17d1b4" }],
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
  });

  // Line chart — risk score trend
  new Chart(document.getElementById("chart-trend"), {
    type: "line",
    data: {
      labels: s.trend.map((_, i) => `#${i + 1}`),
      datasets: [{ label: "Risk score", data: s.trend, borderColor: "#17d1b4", tension: 0.3 }],
    },
    options: { scales: { y: { min: 0, max: 100 } } },
  });

  document.getElementById("recent").innerHTML = s.recent
    .map(
      (r) => `<tr><td class="mono">${r.target}</td><td class="muted">${r.created_at}</td>
      <td>${r.open_ports}</td><td style="color:var(--${levelColor(r.level)})">${r.score} · ${r.level}</td></tr>`
    )
    .join("") || `<tr><td colspan="4" class="muted">No scans yet.</td></tr>`;
}

/* -------------------------------- scan ------------------------------- */
function initScan() {
  const form = document.getElementById("scan-form");
  const out = document.getElementById("scan-msg");
  const loader = document.getElementById("loader");
  const results = document.getElementById("results");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    out.innerHTML = ""; results.innerHTML = "";
    loader.style.display = "flex";
    const btn = form.querySelector("button");
    btn.disabled = true;
    try {
      const r = await api.post("/api/scan", { target: form.target.value.trim() });
      renderResult(results, r);
      msg(out, `Scan complete — ${r.ports.length} open ports, risk ${r.score} (${r.level}).`, "success");
    } catch (err) {
      msg(out, err.message, "error");
    } finally {
      loader.style.display = "none";
      btn.disabled = false;
    }
  });
}

function renderResult(el, r) {
  const color = `var(--${levelColor(r.level)})`;
  el.innerHTML = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <div>
          <div class="mono" style="font-size:18px">${r.target}</div>
          <div class="muted" style="font-size:12px">
            ${r.online ? `Host is online · ${r.hostname} · ${r.latency_ms} ms` : "Host is offline or filtered"}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:34px;font-weight:700;color:${color}">${r.score}</div>
          <div class="muted" style="font-size:11px;text-transform:uppercase">${r.level} risk</div>
        </div>
      </div>
      <div class="bar mt"><div style="width:${r.score}%;background:${color}"></div></div>
    </div>
    ${r.ports.length ? `<div class="card mt"><h3>Open ports (${r.ports.length})</h3>
      <table class="mt"><thead><tr><th>Port</th><th>Service</th><th>Version</th><th>Weight</th></tr></thead>
      <tbody>${r.ports.map((p) => `<tr><td class="mono">${p.port}/${p.protocol}</td><td>${p.service}</td>
        <td class="muted">${p.version}</td><td><span class="badge ${p.weight >= 20 ? "high" : ""}">+${p.weight}</span></td></tr>`).join("")}
      </tbody></table></div>` : ""}
    <div class="card mt"><h3>Recommendations</h3>
      <ul class="mt" style="padding-left:18px;font-size:14px;color:var(--muted)">
        ${r.recommendations.map((t) => `<li style="margin-bottom:6px">${t}</li>`).join("")}
      </ul>
    </div>`;
}

/* ------------------------------ reports ------------------------------ */
async function initReports() {
  const body = document.getElementById("reports-body");
  async function refresh() {
    const rows = await api.get("/api/scans");
    if (!rows) return;
    document.getElementById("report-count").textContent = rows.length;
    body.innerHTML = rows.length
      ? rows
          .map(
            (r) => `<tr>
              <td class="mono">${r.target_ip}</td>
              <td class="muted">${r.created_at}</td>
              <td><span class="badge">${r.is_online ? "online" : "offline"}</span></td>
              <td>${r.open_ports.length}</td>
              <td style="color:var(--${levelColor(r.risk_level)})">${r.risk_score} · ${r.risk_level}</td>
              <td><a href="/api/report/${r.id}"><button class="ghost">Download PDF</button></a></td>
            </tr>`
          )
          .join("")
      : `<tr><td colspan="6" class="muted">No reports yet.</td></tr>`;
  }
  document.getElementById("clear-history").addEventListener("click", async () => {
    await api.del("/api/scans");
    refresh();
  });
  refresh();
}

/* ------------------------------- shared ------------------------------ */
async function initShell() {
  const me = await api.get("/api/me");
  if (me) document.getElementById("who").textContent = me.username;
  const out = document.getElementById("logout");
  if (out) out.addEventListener("click", async () => {
    await api.post("/api/logout");
    location.href = "/";
  });
}
