const api = {
    async request(url, options = {}) {
        const response = await fetch(url, options);

        if (response.status === 401) {
            window.location.href = "/";
            return null;
        }

        const contentType = response.headers.get("content-type") || "";

        const data = contentType.includes("application/json")
            ? await response.json().catch(() => ({}))
            : await response.text();

        if (!response.ok) {
            throw new Error(data.error || "Request failed");
        }

        return data;
    },

    get(url) {
        return this.request(url);
    },

    post(url, body = {}) {
        return this.request(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
    },

    del(url) {
        return this.request(url, {
            method: "DELETE"
        });
    }
};


const NSAT = {

    cache: {
        scans: null,
        stats: null
    },

    esc(value) {
        return String(value ?? "")
            .replace(/[&<>"']/g, char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[char]));
    },

    initials(name) {
        return String(name || "A")
            .slice(0, 2)
            .toUpperCase();
    },

    levelClass(level) {
        return {
            Secure: "secure",
            Low: "low",
            Moderate: "moderate",
            High: "high",
            Critical: "critical"
        }[level] || "moderate";
    },

    invalidate() {
        this.cache.scans = null;
        this.cache.stats = null;
    },

    async scans() {
        if (!this.cache.scans) {
            this.cache.scans = await api.get("/api/scans") || [];
        }

        return this.cache.scans;
    },

    async stats() {
        if (!this.cache.stats) {
            this.cache.stats = await api.get("/api/stats") || {};
        }

        return this.cache.stats;
    },

    toast(title, message = "", type = "info") {

        let stack = document.getElementById("toast-stack");

        if (!stack) {
            stack = document.createElement("div");
            stack.id = "toast-stack";
            stack.className = "toast-stack";
            document.body.appendChild(stack);
        }

        const toast = document.createElement("div");

        toast.className = `toast ${type}`;

        toast.innerHTML = `
            <span class="toast-dot"></span>
            <div>
                <strong>${this.esc(title)}</strong>
                <p>${this.esc(message)}</p>
            </div>
        `;

        stack.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(8px)";

            setTimeout(() => {
                toast.remove();
            }, 220);

        }, 3500);
    },

    sparkline(values = []) {

        const numbers = values
            .map(Number)
            .filter(Number.isFinite);

        if (numbers.length < 2) {
            return `
                <svg viewBox="0 0 100 30">
                    <path
                        d="M0 22 L100 22"
                        fill="none"
                        stroke="#26313e"
                        stroke-width="2"
                    />
                </svg>
            `;
        }

        const min = Math.min(...numbers);
        const max = Math.max(...numbers);
        const range = max - min || 1;

        const points = numbers.map((value, index) => {

            const x =
                (index / (numbers.length - 1)) * 100;

            const y =
                27 - ((value - min) / range) * 22;

            return `${x},${y}`;

        }).join(" ");

        return `
            <svg viewBox="0 0 100 30">
                <polyline
                    points="${points}"
                    fill="none"
                    stroke="#38bdf8"
                    stroke-width="1.7"
                    vector-effect="non-scaling-stroke"
                />
            </svg>
        `;
    }
};


/* ========================================
   SHELL
======================================== */

function buildShell(activePage) {

    const links = [
        ["dashboard.html", "◈", "Dashboard"],
        ["scan.html", "⌁", "Scans"],
        ["targets.html", "⌖", "Targets"],
        ["vulnerabilities.html", "!", "Vulnerabilities"],
        ["reports.html", "▤", "Reports"]
    ];

    return `
        <aside class="sidebar" id="sidebar">

            <div class="brand-row">

                <a class="brand" href="/dashboard.html">
                    <span class="brand-mark">N</span>
                    <span class="brand-copy">
                        NSAT<span>.</span>
                    </span>
                </a>

                <button
                    class="sidebar-toggle"
                    id="sidebar-toggle"
                    title="Collapse sidebar">
                    ‹
                </button>

            </div>


            <nav class="nav">

                <div class="nav-section">
                    Workspace
                </div>

                ${links.map(([href, icon, label]) => `
                    <a
                        href="/${href}"
                        class="${activePage === href ? "active" : ""}">

                        <span class="nav-icon">
                            ${icon}
                        </span>

                        <span class="nav-copy">
                            ${label}
                        </span>

                    </a>
                `).join("")}


                <div class="nav-section">
                    System
                </div>

                <a
                    href="/settings.html"
                    class="${activePage === "settings.html" ? "active" : ""}">

                    <span class="nav-icon">
                        ⚙
                    </span>

                    <span class="nav-copy">
                        Settings
                    </span>

                </a>


                <a
                    href="/about.html"
                    class="${activePage === "about.html" ? "active" : ""}">

                    <span class="nav-icon">
                        i
                    </span>

                    <span class="nav-copy">
                        About
                    </span>

                </a>

            </nav>


            <div class="sidebar-footer">

                <div class="user-card">

                    <div class="avatar" id="avatar">
                        A
                    </div>

                    <div class="user-copy">

                        <div
                            class="user-name"
                            id="sidebar-user">
                            Analyst
                        </div>

                        <div class="user-role">
                            Security analyst
                        </div>

                    </div>

                    <button
                        class="icon-btn"
                        id="logout"
                        title="Sign out">
                        ↗
                    </button>

                </div>

            </div>

        </aside>


        <main class="content">

            <header class="topbar">

                <button
                    class="icon-btn mobile-menu"
                    id="mobile-menu">
                    ☰
                </button>


                <div class="topbar-title">

                    <h1 id="shell-title">
                        NSAT
                    </h1>

                    <p id="shell-subtitle">
                        Network security console
                    </p>

                </div>


                <div class="topbar-tools">

                    <button
                        class="search-trigger"
                        id="global-search">

                        <span>⌕</span>

                        <span>
                            Search targets, CVEs, scans...
                        </span>

                        <span class="search-kbd">
                            Ctrl K
                        </span>

                    </button>


                    <button
                        class="icon-btn"
                        id="refresh-page"
                        title="Refresh">
                        ↻
                    </button>


                    <div class="system-status">

                        <span class="status-dot pulse"></span>

                        System online

                    </div>

                </div>

            </header>


            <div id="page-root"></div>

        </main>


        <div
            class="drawer-backdrop"
            id="drawer-backdrop">
        </div>


        <aside
            class="drawer"
            id="drawer">

            <div class="drawer-head">

                <div>

                    <div class="eyebrow">
                        Details
                    </div>

                    <div
                        class="drawer-title"
                        id="drawer-title">
                        Details
                    </div>

                </div>

                <button
                    class="icon-btn"
                    id="drawer-close">
                    ×
                </button>

            </div>

            <div
                class="drawer-body"
                id="drawer-body">
            </div>

        </aside>


        <div
            class="modal-backdrop"
            id="search-backdrop">
        </div>


        <div
            class="search-modal"
            id="search-modal">

            <input
                class="search-input-lg"
                id="search-input"
                placeholder="Search IPs, services or scan IDs..."
                autocomplete="off">

            <div
                class="search-results"
                id="search-results">
            </div>

        </div>


        <div
            class="toast-stack"
            id="toast-stack">
        </div>
    `;
}


async function initShell(
    activePage,
    title,
    subtitle
) {

    document.body.insertAdjacentHTML(
        "afterbegin",
        `<div class="layout">
            ${buildShell(activePage)}
        </div>`
    );


    document.getElementById(
        "shell-title"
    ).textContent = title;


    document.getElementById(
        "shell-subtitle"
    ).textContent = subtitle;


    const me = await api.get("/api/me");

    if (!me) return;


    document.getElementById(
        "sidebar-user"
    ).textContent = me.username;


    document.getElementById(
        "avatar"
    ).textContent = NSAT.initials(me.username);


    document.getElementById(
        "logout"
    ).onclick = async () => {

        await api.post("/api/logout");

        window.location.href = "/";
    };


    const sidebar =
        document.getElementById("sidebar");


    document.getElementById(
        "sidebar-toggle"
    ).onclick = () => {

        sidebar.classList.toggle("collapsed");
    };


    document.getElementById(
        "mobile-menu"
    ).onclick = () => {

        sidebar.classList.toggle("mobile-open");
    };


    document.getElementById(
        "refresh-page"
    ).onclick = () => {

        location.reload();
    };


    setupSearch();

    setupDrawer();
}


/* ========================================
   DRAWER
======================================== */

function setupDrawer() {

    document.getElementById(
        "drawer-backdrop"
    ).onclick = closeDrawer;


    document.getElementById(
        "drawer-close"
    ).onclick = closeDrawer;
}


function openDrawer(title, html) {

    document.getElementById(
        "drawer-title"
    ).textContent = title;


    document.getElementById(
        "drawer-body"
    ).innerHTML = html;


    document.getElementById(
        "drawer"
    ).classList.add("open");


    document.getElementById(
        "drawer-backdrop"
    ).classList.add("open");


    document.body.classList.add(
        "drawer-open"
    );
}


function closeDrawer() {

    document.getElementById(
        "drawer"
    ).classList.remove("open");


    document.getElementById(
        "drawer-backdrop"
    ).classList.remove("open");


    document.body.classList.remove(
        "drawer-open"
    );
}


/* ========================================
   GLOBAL SEARCH
======================================== */

function setupSearch() {

    const modal =
        document.getElementById("search-modal");

    const backdrop =
        document.getElementById("search-backdrop");

    const input =
        document.getElementById("search-input");


    const openSearch = () => {

        modal.classList.add("open");

        backdrop.classList.add("open");

        input.value = "";

        input.focus();

        renderSearch("");
    };


    const closeSearch = () => {

        modal.classList.remove("open");

        backdrop.classList.remove("open");
    };


    document.getElementById(
        "global-search"
    ).onclick = openSearch;


    backdrop.onclick = closeSearch;


    document.addEventListener(
        "keydown",
        event => {

            if (
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === "k"
            ) {

                event.preventDefault();

                openSearch();
            }


            if (event.key === "Escape") {

                closeSearch();

                closeDrawer();
            }

        }
    );


    input.oninput = event => {

        renderSearch(event.target.value);
    };


    async function renderSearch(query) {

        const scans =
            await NSAT.scans();


        const q =
            query.toLowerCase().trim();


        const results = [];


        scans.forEach(scan => {

            if (
                !q ||
                `${scan.target_ip}
                ${scan.risk_level}
                ${scan.id}`
                    .toLowerCase()
                    .includes(q)
            ) {

                results.push({
                    title: scan.target_ip,
                    sub:
                        `Scan #${scan.id} ·
                         ${scan.risk_level} ·
                         ${scan.created_at}`,
                    url:
                        `/reports.html?scan=${scan.id}`
                });
            }


            (scan.open_ports || [])
                .forEach(port => {

                    const service =
                        port.service || "Unknown";


                    const text =
                        `${service}
                         ${port.port}
                         ${scan.target_ip}`
                            .toLowerCase();


                    if (!q || text.includes(q)) {

                        results.push({
                            title:
                                `${service} · ${port.port}`,
                            sub:
                                `${scan.target_ip} ·
                                 ${port.version || "Version unknown"}`,
                            url:
                                `/vulnerabilities.html?scan=${scan.id}`
                        });
                    }

                });

        });


        const box =
            document.getElementById(
                "search-results"
            );


        if (!results.length) {

            box.innerHTML = `
                <div class="empty">

                    <div class="empty-icon">
                        ⌕
                    </div>

                    <strong>
                        No matches
                    </strong>

                    <p>
                        Try an IP, service or scan ID.
                    </p>

                </div>
            `;

            return;
        }


        box.innerHTML =
            results
                .slice(0, 15)
                .map(item => `
                    <div
                        class="search-result"
                        data-url="${NSAT.esc(item.url)}">

                        <div>

                            <strong>
                                ${NSAT.esc(item.title)}
                            </strong>

                            <span>
                                ${NSAT.esc(item.sub)}
                            </span>

                        </div>

                        <span>
                            →
                        </span>

                    </div>
                `)
                .join("");


        box.querySelectorAll(
            ".search-result"
        ).forEach(item => {

            item.onclick = () => {

                location.href =
                    item.dataset.url;
            };

        });
    }
}


/* ========================================
   LOGIN
======================================== */

function initLogin() {

    const form =
        document.getElementById(
            "login-form"
        );


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const username =
                document.getElementById(
                    "username"
                ).value.trim();


            const password =
                document.getElementById(
                    "password"
                ).value;


            const message =
                document.getElementById(
                    "login-msg"
                );


            try {

                await api.post(
                    "/api/login",
                    {
                        username,
                        password
                    }
                );


                window.location.href =
                    "/dashboard.html";

            } catch (error) {

                message.innerHTML = `
                    <div class="msg error">
                        ${NSAT.esc(error.message)}
                    </div>
                `;

            }

        }
    );
}


/* ========================================
   DASHBOARD
======================================== */

async function initDashboard() {

    const root =
        document.getElementById(
            "page-root"
        );


    root.innerHTML = `
        <div class="page">

            <div class="page-header">

                <div>

                    <div class="eyebrow">
                        Security console
                    </div>

                    <div class="page-title">
                        Security overview
                    </div>

                    <div class="page-subtitle">
                        Monitor network exposure and audit activity.
                    </div>

                </div>

                <a
                    href="/scan.html"
                    class="btn btn-primary">
                    + New scan
                </a>

            </div>


            <div class="grid grid-4">

                ${statCard(
                    "Total scans",
                    "stat-total",
                    "spark-total",
                    "Recorded security audits"
                )}

                ${statCard(
                    "Active hosts",
                    "stat-online",
                    "spark-online",
                    "Hosts responding during audits"
                )}

                ${statCard(
                    "Open ports",
                    "stat-ports",
                    "spark-ports",
                    "Detected exposed services"
                )}

                ${statCard(
                    "Average risk",
                    "stat-risk",
                    "spark-risk",
                    "Current risk score"
                )}

            </div>


            <div
                class="grid grid-2"
                style="margin-top:16px">

                <section class="card card-pad">

                    <div class="section-title">
                        Risk trend
                    </div>

                    <div class="section-subtitle">
                        Recent assessment scores
                    </div>

                    <div
                        style="height:250px;margin-top:18px">
                        <canvas id="risk-chart"></canvas>
                    </div>

                </section>


                <section class="card card-pad">

                    <div class="section-title">
                        Top exposed services
                    </div>

                    <div class="section-subtitle">
                        Most frequently detected services
                    </div>

                    <div
                        style="height:250px;margin-top:18px">
                        <canvas id="service-chart"></canvas>
                    </div>

                </section>

            </div>


            <section
                class="card card-pad"
                style="margin-top:16px">

                <div class="page-header"
                     style="margin-bottom:15px">

                    <div>

                        <div class="section-title">
                            Recent scans
                        </div>

                        <div class="section-subtitle">
                            Latest network security assessments
                        </div>

                    </div>

                    <input
                        id="recent-filter"
                        class="search-trigger"
                        style="min-width:220px"
                        placeholder="Filter targets...">

                </div>


                <div class="table-wrap">

                    <table class="data-table">

                        <thead>
                            <tr>
                                <th>Target</th>
                                <th>Status</th>
                                <th>Ports</th>
                                <th>Risk</th>
                                <th>Time</th>
                            </tr>
                        </thead>

                        <tbody id="recent-scans">
                        </tbody>

                    </table>

                </div>

            </section>

        </div>
    `;


    const stats =
        await NSAT.stats();


    document.getElementById(
        "stat-total"
    ).textContent =
        stats.total || 0;


    document.getElementById(
        "stat-online"
    ).textContent =
        stats.online || 0;


    document.getElementById(
        "stat-ports"
    ).textContent =
        stats.open_ports || 0;


    document.getElementById(
        "stat-risk"
    ).textContent =
        stats.avg_score || 0;


    document.getElementById(
        "spark-total"
    ).innerHTML =
        NSAT.sparkline(
            stats.trend || []
        );


    document.getElementById(
        "spark-risk"
    ).innerHTML =
        NSAT.sparkline(
            stats.trend || []
        );


    document.getElementById(
        "spark-online"
    ).innerHTML =
        NSAT.sparkline(
            (stats.trend || []).map(
                value => Math.max(
                    0,
                    100 - value
                )
            )
        );


    document.getElementById(
        "spark-ports"
    ).innerHTML =
        NSAT.sparkline(
            stats.trend || []
        );


    if (window.Chart) {

        createCharts(stats);
    }


    renderRecent(
        stats.recent || []
    );
}


function statCard(
    label,
    id,
    spark,
    meta
) {

    return `
        <div class="card stat-card">

            <div class="stat-top">

                <div class="stat-label">
                    ${label}
                </div>

                <div class="stat-icon">
                    ◈
                </div>

            </div>

            <div
                class="stat-value"
                id="${id}">
                0
            </div>

            <div class="stat-meta">
                ${meta}
            </div>

            <div
                class="sparkline"
                id="${spark}">
            </div>

        </div>
    `;
}


function createCharts(stats) {

    const chartOptions = {

        responsive: true,

        maintainAspectRatio: false,

        plugins: {
            legend: {
                display: false
            }
        },

        scales: {

            x: {
                grid: {
                    display: false
                },

                ticks: {
                    color: "#657284"
                }
            },

            y: {
                grid: {
                    color:
                        "rgba(148,163,184,.07)"
                },

                ticks: {
                    color: "#657284"
                }
            }

        }

    };


    new Chart(
        document.getElementById(
            "risk-chart"
        ),
        {
            type: "line",

            data: {

                labels:
                    (stats.trend || [])
                        .map(
                            (_, index) =>
                                `#${index + 1}`
                        ),

                datasets: [
                    {
                        data:
                            stats.trend || [],

                        borderColor:
                            "#38bdf8",

                        backgroundColor:
                            "rgba(56,189,248,.08)",

                        fill: true,

                        tension: 0.35,

                        pointRadius: 3
                    }
                ]

            },

            options: {
                ...chartOptions,

                scales: {
                    ...chartOptions.scales,

                    y: {
                        ...chartOptions.scales.y,
                        min: 0,
                        max: 100
                    }
                }
            }
        }
    );


    new Chart(
        document.getElementById(
            "service-chart"
        ),
        {
            type: "bar",

            data: {

                labels:
                    (stats.top_services || [])
                        .map(
                            item =>
                                item.service
                        ),

                datasets: [
                    {
                        data:
                            (stats.top_services || [])
                                .map(
                                    item =>
                                        item.count
                                ),

                        backgroundColor:
                            "#38bdf8",

                        borderRadius: 5
                    }
                ]

            },

            options: chartOptions
        }
    );
}


function renderRecent(rows) {

    const body =
        document.getElementById(
            "recent-scans"
        );


    const draw = filter => {

        const query =
            filter
                .toLowerCase()
                .trim();


        const data =
            rows.filter(row =>
                String(
                    row.target || ""
                )
                    .toLowerCase()
                    .includes(query)
            );


        if (!data.length) {

            body.innerHTML = `
                <tr>
                    <td colspan="5">
                        <div class="empty">
                            <div class="empty-icon">
                                ◈
                            </div>

                            <strong>
                                No scans found
                            </strong>

                            <p>
                                Run a security scan to populate this table.
                            </p>
                        </div>
                    </td>
                </tr>
            `;

            return;
        }


        body.innerHTML =
            data.map(row => `

                <tr
                    class="clickable"
                    onclick="
                        location.href =
                        '/reports.html?scan=${row.id || ""}'
                    ">

                    <td class="mono">
                        ${NSAT.esc(
                            row.target
                        )}
                    </td>

                    <td>

                        <span class="status-badge">

                            <span class="status-dot blue">
                            </span>

                            Audited

                        </span>

                    </td>

                    <td>
                        ${row.open_ports || 0}
                    </td>

                    <td>

                        <span
                            class="
                                severity
                                ${NSAT.levelClass(
                                    row.level
                                )}
                            ">

                            ${NSAT.esc(
                                row.level
                            )}

                            ·

                            ${row.score}

                        </span>

                    </td>

                    <td class="muted">
                        ${NSAT.esc(
                            row.created_at
                        )}
                    </td>

                </tr>

            `).join("");
    };


    draw("");


    document.getElementById(
        "recent-filter"
    ).oninput = event => {

        draw(
            event.target.value
        );
    };
}


/* ========================================
   SCAN
======================================== */

let progressTimer = null;


function initScan() {

    const root =
        document.getElementById(
            "page-root"
        );


    root.innerHTML = `

        <div class="page">

            <div class="page-header">

                <div>

                    <div class="eyebrow">
                        Scanner
                    </div>

                    <div class="page-title">
                        New security scan
                    </div>

                    <div class="page-subtitle">
                        Discover hosts, enumerate services and assess exposure.
                    </div>

                </div>

            </div>


            <div class="grid grid-2">

                <section class="card card-pad">

                    <form id="scan-form">

                        <div class="field">

                            <label>
                                Target IPv4 address
                            </label>

                            <input
                                id="target"
                                name="target"
                                class="mono"
                                value="127.0.0.1"
                                maxlength="15"
                                required
                                placeholder="192.168.1.10">

                            <div class="field-help">
                                Only scan systems you own or are explicitly authorised to test.
                            </div>

                        </div>


                        <div class="field">

                            <label>
                                Scan mode
                            </label>

                            <div
                                class="segmented"
                                style="width:100%">

                                <button
                                    type="button"
                                    class="scan-mode active"
                                    data-mode="quick">

                                    Quick scan

                                </button>

                                <button
                                    type="button"
                                    class="scan-mode"
                                    data-mode="full">

                                    Full audit

                                </button>

                            </div>

                        </div>


                        <div class="field">

                            <label>
                                Scan options
                            </label>


                            <div class="toggle-row">

                                <div class="toggle-copy">

                                    <strong>
                                        Stealth mode
                                    </strong>

                                    <span>
                                        UI ready for backend integration.
                                    </span>

                                </div>


                                <label class="switch">

                                    <input
                                        id="opt-stealth"
                                        type="checkbox">

                                    <span class="switch-track">
                                    </span>

                                </label>

                            </div>


                            <div class="toggle-row">

                                <div class="toggle-copy">

                                    <strong>
                                        Ping sweep
                                    </strong>

                                    <span>
                                        Discover responsive hosts.
                                    </span>

                                </div>


                                <label class="switch">

                                    <input
                                        id="opt-ping"
                                        type="checkbox"
                                        checked>

                                    <span class="switch-track">
                                    </span>

                                </label>

                            </div>


                            <div class="toggle-row">

                                <div class="toggle-copy">

                                    <strong>
                                        OS detection
                                    </strong>

                                    <span>
                                        Ready for backend integration.
                                    </span>

                                </div>


                                <label class="switch">

                                    <input
                                        id="opt-os"
                                        type="checkbox"
                                        checked>

                                    <span class="switch-track">
                                    </span>

                                </label>

                            </div>

                        </div>


                        <div class="actions mt">

                            <button
                                class="btn btn-primary"
                                id="start-scan"
                                type="submit">

                                Start security scan

                            </button>


                            <a
                                class="btn btn-ghost"
                                href="/dashboard.html">

                                Cancel

                            </a>

                        </div>

                    </form>


                    <div id="scan-msg"></div>


                    <div class="mt">

                        <div class="section-title">
                            Current engine
                        </div>

                        <div class="module-list mt">

                            <div class="module-item">
                                <span class="module-dot"></span>
                                Scapy host discovery
                            </div>

                            <div class="module-item">
                                <span class="module-dot"></span>
                                Nmap service enumeration
                            </div>

                            <div class="module-item">
                                <span class="module-dot"></span>
                                Weighted risk assessment
                            </div>

                        </div>

                    </div>

                </section>


                <section
                    class="card card-pad"
                    id="progress-wrap"
                    hidden>

                    <div class="progress-head">

                        <div>

                            <div class="section-title">
                                Scan in progress
                            </div>

                            <div
                                class="section-subtitle mono"
                                id="progress-target">
                                —
                            </div>

                        </div>


                        <div
                            class="progress-percent"
                            id="progress-percent">

                            0%

                        </div>

                    </div>


                    <div class="progress-line">

                        <div class="progress-seg active"></div>
                        <div class="progress-seg"></div>
                        <div class="progress-seg"></div>
                        <div class="progress-seg"></div>

                    </div>


                    <div class="progress-steps">

                        <div class="progress-step active">
                            <span class="step-dot"></span>
                            Discovery
                        </div>

                        <div class="progress-step">
                            <span class="step-dot"></span>
                            Port scan
                        </div>

                        <div class="progress-step">
                            <span class="step-dot"></span>
                            Service ID
                        </div>

                        <div class="progress-step">
                            <span class="step-dot"></span>
                            CVE correlation
                        </div>

                    </div>


                    <div class="msg info mt">

                        CVE correlation is prepared in the UI.
                        Backend integration will be added later.

                    </div>


                    <div
                        class="muted small mt"
                        id="progress-note">

                        Waiting for scanner response...

                    </div>

                </section>


                <section
                    id="results"
                    class="grid"
                    style="grid-column:1/-1">

                </section>

            </div>

        </div>
    `;


    document
        .querySelectorAll(".scan-mode")
        .forEach(button => {

            button.onclick = () => {

                document
                    .querySelectorAll(".scan-mode")
                    .forEach(item =>
                        item.classList.remove(
                            "active"
                        )
                    );

                button.classList.add(
                    "active"
                );
            };

        });


    document.getElementById(
        "scan-form"
    ).onsubmit = runScan;
}


async function runScan(event) {

    event.preventDefault();


    const form =
        document.getElementById(
            "scan-form"
        );


    const button =
        document.getElementById(
            "start-scan"
        );


    const progress =
        document.getElementById(
            "progress-wrap"
        );


    const results =
        document.getElementById(
            "results"
        );


    const message =
        document.getElementById(
            "scan-msg"
        );


    const target =
        document.getElementById(
            "target"
        ).value.trim();


    if (!target) {
        return;
    }


    button.disabled = true;

    results.innerHTML = "";

    message.innerHTML = "";

    progress.hidden = false;


    startProgress(target);


    try {

        const response =
            await api.post(
                "/api/scan",
                {
                    target,

                    scan_mode:
                        document.querySelector(
                            ".scan-mode.active"
                        )?.dataset.mode ||
                        "quick",

                    options: {

                        stealth:
                            document.getElementById(
                                "opt-stealth"
                            ).checked,

                        ping_sweep:
                            document.getElementById(
                                "opt-ping"
                            ).checked,

                        os_detection:
                            document.getElementById(
                                "opt-os"
                            ).checked

                    }
                }
            );


        finishProgress();


        renderScanResult(
            results,
            response
        );


        NSAT.invalidate();


        NSAT.toast(
            "Scan completed",
            `${target} · Risk ${response.score}`,
            "success"
        );


        message.innerHTML = `
            <div class="msg success">
                Scan completed successfully.
            </div>
        `;

    } catch (error) {

        stopProgress();


        message.innerHTML = `
            <div class="msg error">
                ${NSAT.esc(
                    error.message
                )}
            </div>
        `;


        NSAT.toast(
            "Scan failed",
            error.message,
            "error"
        );

    } finally {

        button.disabled = false;
    }
}


function startProgress(target) {

    document.getElementById(
        "progress-target"
    ).textContent = target;


    let progress = 0;


    const stages = [
        "Discovering host...",
        "Enumerating ports...",
        "Identifying services...",
        "Preparing vulnerability correlation..."
    ];


    const steps =
        document.querySelectorAll(
            ".progress-step"
        );


    const segments =
        document.querySelectorAll(
            ".progress-seg"
        );


    clearInterval(
        progressTimer
    );


    progressTimer =
        setInterval(() => {

            progress =
                Math.min(
                    88,
                    progress +
                    Math.floor(
                        Math.random() * 8
                    ) + 4
                );


            const stage =
                Math.min(
                    3,
                    Math.floor(
                        progress / 24
                    )
                );


            document.getElementById(
                "progress-percent"
            ).textContent =
                `${progress}%`;


            steps.forEach(
                (step, index) => {

                    step.classList.toggle(
                        "active",
                        index === stage
                    );

                    step.classList.toggle(
                        "done",
                        index < stage
                    );

                }
            );


            segments.forEach(
                (segment, index) => {

                    segment.classList.toggle(
                        "active",
                        index === stage
                    );

                    segment.classList.toggle(
                        "done",
                        index < stage
                    );

                }
            );


            document.getElementById(
                "progress-note"
            ).textContent =
                stages[stage];

        }, 650);
}


function finishProgress() {

    clearInterval(
        progressTimer
    );


    document.getElementById(
        "progress-percent"
    ).textContent =
        "100%";


    document
        .querySelectorAll(
            ".progress-seg"
        )
        .forEach(segment => {

            segment.classList.remove(
                "active"
            );

            segment.classList.add(
                "done"
            );

        });


    document
        .querySelectorAll(
            ".progress-step"
        )
        .forEach(step => {

            step.classList.remove(
                "active"
            );

            step.classList.add(
                "done"
            );

        });


    document.getElementById(
        "progress-note"
    ).textContent =
        "Scan completed.";
}


function stopProgress() {

    clearInterval(
        progressTimer
    );
}


function renderScanResult(
    container,
    result
) {

    const level =
        NSAT.levelClass(
            result.level
        );


    const ports =
        result.ports || [];


    container.innerHTML = `

        <section class="card card-pad">

            <div class="page-header">

                <div>

                    <div class="eyebrow">
                        Scan result
                    </div>

                    <div class="page-title"
                         style="font-size:21px">

                        ${NSAT.esc(
                            result.target
                        )}

                    </div>

                    <div class="page-subtitle">

                        ${
                            result.online
                            ? `Host online ·
                               ${NSAT.esc(
                                   result.hostname ||
                                   "Hostname unavailable"
                               )}`
                            : "Host did not respond to discovery probes."
                        }

                    </div>

                </div>


                <span
                    class="severity ${level}">

                    ${NSAT.esc(
                        result.level
                    )}
                    risk

                </span>

            </div>


            <div class="grid grid-3">

                <div>

                    <div class="stat-label">
                        Risk score
                    </div>

                    <div
                        class="stat-value">

                        ${result.score}

                    </div>

                    <div class="risk-track">

                        <div
                            class="risk-fill"
                            style="
                                width:${result.score}%;
                                background:var(--${
                                    level === "critical"
                                    ? "red"
                                    : level === "high"
                                    ? "orange"
                                    : level === "moderate"
                                    ? "yellow"
                                    : "green"
                                })
                            ">
                        </div>

                    </div>

                </div>


                <div>

                    <div class="stat-label">
                        Open ports
                    </div>

                    <div class="stat-value">
                        ${ports.length}
                    </div>

                    <div class="stat-meta">
                        Detected services
                    </div>

                </div>


                <div>

                    <div class="stat-label">
                        Duration
                    </div>

                    <div class="stat-value">
                        ${
                            (
                                Number(
                                    result.duration_ms ||
                                    0
                                ) / 1000
                            ).toFixed(1)
                        }s
                    </div>

                    <div class="stat-meta">
                        End-to-end scan
                    </div>

                </div>

            </div>


            <div class="mt">

                <div class="section-title">
                    Open services
                </div>

                <div
                    class="table-wrap mt">

                    <table class="data-table">

                        <thead>

                            <tr>
                                <th>Port</th>
                                <th>Service</th>
                                <th>Product</th>
                                <th>Version</th>
                            </tr>

                        </thead>

                        <tbody>

                            ${
                                ports.length
                                ? ports.map(port => `
                                    <tr>

                                        <td class="mono">
                                            ${NSAT.esc(
                                                port.port
                                            )}
                                        </td>

                                        <td>
                                            ${NSAT.esc(
                                                port.service ||
                                                "Unknown"
                                            )}
                                        </td>

                                        <td>
                                            ${NSAT.esc(
                                                port.product ||
                                                "—"
                                            )}
                                        </td>

                                        <td class="mono">
                                            ${NSAT.esc(
                                                port.version ||
                                                "—"
                                            )}
                                        </td>

                                    </tr>
                                `).join("")
                                : `
                                    <tr>
                                        <td colspan="4">
                                            <div class="empty">
                                                No open ports detected.
                                            </div>
                                        </td>
                                    </tr>
                                `
                            }

                        </tbody>

                    </table>

                </div>

            </div>

        </section>
    `;
}


/* ========================================
   GENERIC PLACEHOLDER PAGES
======================================== */

async function initTargets() {

    const scans =
        await NSAT.scans();


    const root =
        document.getElementById(
            "page-root"
        );


    const unique =
        new Map();


    scans.forEach(scan => {

        if (!unique.has(scan.target_ip)) {

            unique.set(
                scan.target_ip,
                scan
            );
        }

    });


    root.innerHTML = `

        <div class="page">

            <div class="page-header">

                <div>

                    <div class="eyebrow">
                        Asset inventory
                    </div>

                    <div class="page-title">
                        Targets
                    </div>

                    <div class="page-subtitle">
                        Hosts discovered during previous security audits.
                    </div>

                </div>

                <a
                    href="/scan.html"
                    class="btn btn-primary">

                    + Add scan target

                </a>

            </div>


            <section class="card card-pad">

                <div class="field">

                    <input
                        id="target-search"
                        placeholder="Search IP addresses...">

                </div>


                <div
                    class="table-wrap mt">

                    <table class="data-table">

                        <thead>
                            <tr>
                                <th>IP address</th>
                                <th>Last status</th>
                                <th>Risk</th>
                                <th>Open ports</th>
                                <th>Last scan</th>
                            </tr>
                        </thead>

                        <tbody id="targets-body">
                        </tbody>

                    </table>

                </div>

            </section>

        </div>
    `;


    const rows =
        [...unique.values()];


    const draw =
        filter => {

            const query =
                filter
                    .toLowerCase()
                    .trim();


            const data =
                rows.filter(
                    row =>
                        row.target_ip
                            .toLowerCase()
                            .includes(query)
                );


            document.getElementById(
                "targets-body"
            ).innerHTML = data.length
                ? data.map(row => `

                    <tr class="clickable">

                        <td class="mono">
                            ${NSAT.esc(
                                row.target_ip
                            )}
                        </td>

                        <td>
                            <span class="status-badge">
                                <span
                                    class="status-dot ${
                                        row.is_online
                                        ? ""
                                        : "red"
                                    }">
                                </span>

                                ${
                                    row.is_online
                                    ? "Online"
                                    : "Offline"
                                }

                            </span>
                        </td>

                        <td>
                            <span
                                class="severity ${
                                    NSAT.levelClass(
                                        row.risk_level
                                    )
                                }">

                                ${NSAT.esc(
                                    row.risk_level
                                )}

                            </span>
                        </td>

                        <td>
                            ${
                                row.open_ports?.length ||
                                0
                            }
                        </td>

                        <td class="muted">
                            ${NSAT.esc(
                                row.created_at
                            )}
                        </td>

                    </tr>

                `).join("")
                : `
                    <tr>
                        <td colspan="5">
                            <div class="empty">
                                <div class="empty-icon">
                                    ⌖
                                </div>

                                <strong>
                                    No targets found
                                </strong>

                                <p>
                                    Run a scan to create target inventory.
                                </p>
                            </div>
                        </td>
                    </tr>
                `;
        };


    draw("");


    document.getElementById(
        "target-search"
    ).oninput = event => {

        draw(
            event.target.value
        );
    };
}


/* ========================================
   VULNERABILITIES
======================================== */

async function initVulnerabilities() {

    const scans =
        await NSAT.scans();


    const findings = [];


    scans.forEach(scan => {

        (scan.open_ports || [])
            .forEach(port => {

                let severity =
                    "Low";


                if (
                    [
                        21,
                        23,
                        445,
                        3389
                    ].includes(
                        Number(port.port)
                    )
                ) {

                    severity =
                        "High";

                } else if (
                    [
                        80,
                        8080,
                        3306,
                        5432
                    ].includes(
                        Number(port.port)
                    )
                ) {

                    severity =
                        "Moderate";
                }


                findings.push({

                    id:
                        `${scan.id}-${port.port}`,

                    target:
                        scan.target_ip,

                    port:
                        port.port,

                    service:
                        port.service ||
                        "Unknown",

                    version:
                        port.version ||
                        "Unknown",

                    severity

                });

            });

    });


    const root =
        document.getElementById(
            "page-root"
        );


    root.innerHTML = `

        <div class="page">

            <div class="page-header">

                <div>

                    <div class="eyebrow">
                        Security findings
                    </div>

                    <div class="page-title">
                        Vulnerabilities
                    </div>

                    <div class="page-subtitle">
                        Potential exposure findings from observed services.
                    </div>

                </div>

            </div>


            <section class="card card-pad">

                <div class="actions">

                    <button
                        class="btn btn-ghost vuln-filter active"
                        data-filter="all">
                        All
                    </button>

                    <button
                        class="btn btn-ghost vuln-filter"
                        data-filter="Critical">
                        Critical
                    </button>

                    <button
                        class="btn btn-ghost vuln-filter"
                        data-filter="High">
                        High
                    </button>

                    <button
                        class="btn btn-ghost vuln-filter"
                        data-filter="Moderate">
                        Medium
                    </button>

                    <button
                        class="btn btn-ghost vuln-filter"
                        data-filter="Low">
                        Low
                    </button>

                </div>


                <div class="field">

                    <input
                        id="vuln-search"
                        placeholder="Search IP, service or port...">

                </div>


                <div
                    class="table-wrap mt">

                    <table class="data-table">

                        <thead>

                            <tr>
                                <th>Severity</th>
                                <th>Finding</th>
                                <th>Host</th>
                                <th>Port</th>
                                <th>Version</th>
                            </tr>

                        </thead>

                        <tbody
                            id="vuln-body">
                        </tbody>

                    </table>

                </div>

            </section>

        </div>
    `;


    let currentFilter =
        "all";


    function draw() {

        const query =
            document.getElementById(
                "vuln-search"
            ).value
                .toLowerCase()
                .trim();


        const filtered =
            findings.filter(item => {

                const matchesSeverity =
                    currentFilter === "all" ||
                    item.severity ===
                        currentFilter;


                const text =
                    `${item.target}
                     ${item.service}
                     ${item.port}
                     ${item.version}`
                        .toLowerCase();


                return (
                    matchesSeverity &&
                    text.includes(query)
                );

            });


        document.getElementById(
            "vuln-body"
        ).innerHTML = filtered.length
            ? filtered.map(item => `

                <tr
                    class="clickable"
                    data-finding="${NSAT.esc(
                        JSON.stringify(item)
                    )}">

                    <td>

                        <span
                            class="severity ${
                                NSAT.levelClass(
                                    item.severity
                                )
                            }">

                            ${item.severity}

                        </span>

                    </td>

                    <td>
                        ${NSAT.esc(
                            item.service
                        )}
                        exposure
                    </td>

                    <td class="mono">
                        ${NSAT.esc(
                            item.target
                        )}
                    </td>

                    <td class="mono">
                        ${NSAT.esc(
                            item.port
                        )}
                    </td>

                    <td>
                        ${NSAT.esc(
                            item.version
                        )}
                    </td>

                </tr>

            `).join("")
            : `
                <tr>
                    <td colspan="5">
                        <div class="empty">
                            <div class="empty-icon">
                                ✓
                            </div>

                            <strong>
                                No findings
                            </strong>

                            <p>
                                No matching findings were found.
                            </p>
                        </div>
                    </td>
                </tr>
            `;


        document
            .querySelectorAll(
                "#vuln-body tr[data-finding]"
            )
            .forEach(row => {

                row.onclick = () => {

                    const item =
                        JSON.parse(
                            row.dataset.finding
                        );


                    openDrawer(
                        item.service,
                        `
                            <span
                                class="severity ${
                                    NSAT.levelClass(
                                        item.severity
                                    )
                                }">

                                ${item.severity}

                            </span>

                            <div class="mt">

                                <div class="stat-label">
                                    Affected host
                                </div>

                                <div class="mono">
                                    ${NSAT.esc(
                                        item.target
                                    )}
                                </div>

                            </div>


                            <div class="mt">

                                <div class="stat-label">
                                    Port
                                </div>

                                <div class="mono">
                                    ${NSAT.esc(
                                        item.port
                                    )}
                                </div>

                            </div>


                            <div class="mt">

                                <div class="stat-label">
                                    Service
                                </div>

                                <div>
                                    ${NSAT.esc(
                                        item.service
                                    )}
                                </div>

                            </div>


                            <div class="mt">

                                <div class="stat-label">
                                    Remediation
                                </div>

                                <p class="muted">
                                    Review whether this service
                                    is required and restrict
                                    network exposure where
                                    possible.
                                </p>

                            </div>


                            <div class="mt">

                                <div class="section-title">
                                    Evidence
                                </div>

                                <div class="code-block mt">

                                    ${NSAT.esc(
                                        `${item.port}/tcp open ${item.service} ${item.version}`
                                    )}

                                    <button
                                        class="copy-code"
                                        onclick="
                                            navigator.clipboard.writeText(
                                                '${NSAT.esc(
                                                    `${item.port}/tcp open ${item.service} ${item.version}`
                                                )}'
                                            );
                                            this.textContent='Copied';
                                        ">

                                        Copy

                                    </button>

                                </div>

                            </div>
                        `
                    );

                };

            });

    }


    document
        .querySelectorAll(
            ".vuln-filter"
        )
        .forEach(button => {

            button.onclick = () => {

                currentFilter =
                    button.dataset.filter;


                document
                    .querySelectorAll(
                        ".vuln-filter"
                    )
                    .forEach(
                        item =>
                            item.classList.remove(
                                "active"
                            )
                    );


                button.classList.add(
                    "active"
                );


                draw();

            };

        });


    document.getElementById(
        "vuln-search"
    ).oninput = draw;


    draw();
}


/* ========================================
   REPORTS
======================================== */

async function initReports() {

    const scans =
        await NSAT.scans();


    const root =
        document.getElementById(
            "page-root"
        );


    root.innerHTML = `

        <div class="page">

            <div class="page-header">

                <div>

                    <div class="eyebrow">
                        Audit history
                    </div>

                    <div class="page-title">
                        Reports
                    </div>

                    <div class="page-subtitle">
                        Review and export security assessments.
                    </div>

                </div>

            </div>


            <section class="card card-pad">

                <div class="field">

                    <input
                        id="report-search"
                        placeholder="Search reports by IP...">

                </div>


                <div
                    class="table-wrap mt">

                    <table class="data-table">

                        <thead>

                            <tr>
                                <th>Scan</th>
                                <th>Target</th>
                                <th>Risk</th>
                                <th>Ports</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>

                        </thead>

                        <tbody id="reports-body">
                        </tbody>

                    </table>

                </div>

            </section>

        </div>
    `;


    const body =
        document.getElementById(
            "reports-body"
        );


    const draw =
        filter => {

            const query =
                filter
                    .toLowerCase()
                    .trim();


            const data =
                scans.filter(
                    scan =>
                        scan.target_ip
                            .toLowerCase()
                            .includes(query)
                );


            body.innerHTML =
                data.length
                ? data.map(scan => `

                    <tr>

                        <td class="mono">
                            #${scan.id}
                        </td>

                        <td class="mono">
                            ${NSAT.esc(
                                scan.target_ip
                            )}
                        </td>

                        <td>

                            <span
                                class="severity ${
                                    NSAT.levelClass(
                                        scan.risk_level
                                    )
                                }">

                                ${NSAT.esc(
                                    scan.risk_level
                                )}

                            </span>

                        </td>

                        <td>
                            ${
                                scan.open_ports?.length ||
                                0
                            }
                        </td>

                        <td class="muted">
                            ${NSAT.esc(
                                scan.created_at
                            )}
                        </td>

                        <td>

                            <div class="actions">

                                <button
                                    class="btn btn-ghost report-view"
                                    data-id="${scan.id}">
                                    View
                                </button>

                                <button
                                    class="btn btn-primary report-pdf"
                                    data-id="${scan.id}">
                                    PDF
                                </button>

                            </div>

                        </td>

                    </tr>

                `).join("")
                : `
                    <tr>
                        <td colspan="6">
                            <div class="empty">
                                <strong>
                                    No reports found
                                </strong>
                            </div>
                        </td>
                    </tr>
                `;
        };


    draw("");


    document.getElementById(
        "report-search"
    ).oninput = event => {

        draw(
            event.target.value
        );
    };


    body.onclick = event => {

        const view =
            event.target.closest(
                ".report-view"
            );


        const pdf =
            event.target.closest(
                ".report-pdf"
            );


        if (view) {

            const scan =
                scans.find(
                    item =>
                        item.id ==
                        view.dataset.id
                );


            if (scan) {

                openDrawer(
                    `Scan #${scan.id}`,
                    `
                        <div class="stat-label">
                            Target
                        </div>

                        <div class="mono">
                            ${NSAT.esc(
                                scan.target_ip
                            )}
                        </div>


                        <div class="mt">

                            <span
                                class="severity ${
                                    NSAT.levelClass(
                                        scan.risk_level
                                    )
                                }">

                                ${scan.risk_level}

                            </span>

                        </div>


                        <div class="mt">

                            <div class="stat-label">
                                Risk score
                            </div>

                            <div class="stat-value">
                                ${scan.risk_score}
                            </div>

                        </div>


                        <div class="mt">

                            <div class="section-title">
                                Open ports
                            </div>

                            <div class="code-block mt">

                                ${NSAT.esc(
                                    (scan.open_ports || [])
                                        .map(
                                            port =>
                                                `${port.port}/tcp ${port.service || "unknown"} ${port.version || ""}`
                                        )
                                        .join("\n") ||
                                    "No open ports"
                                )}

                            </div>

                        </div>
                    `
                );

            }

        }


        if (pdf) {

            window.open(
                `/api/report/${pdf.dataset.id}`,
                "_blank"
            );


            NSAT.toast(
                "Report export",
                "PDF report opened.",
                "success"
            );
        }

    };
}


/* ========================================
   SETTINGS
======================================== */

function initSettings() {

    document.getElementById(
        "page-root"
    ).innerHTML = `

        <div class="page">

            <div class="page-header">

                <div>

                    <div class="eyebrow">
                        Preferences
                    </div>

                    <div class="page-title">
                        Settings
                    </div>

                    <div class="page-subtitle">
                        Configure your NSAT workspace.
                    </div>

                </div>

            </div>


            <div class="grid grid-2">

                <section class="card card-pad">

                    <div class="section-title">
                        Interface
                    </div>

                    <div class="toggle-row">

                        <div class="toggle-copy">

                            <strong>
                                Animations
                            </strong>

                            <span>
                                Enable interface motion.
                            </span>

                        </div>

                        <label class="switch">

                            <input
                                id="animations-toggle"
                                type="checkbox"
                                checked>

                            <span class="switch-track">
                            </span>

                        </label>

                    </div>


                    <div class="toggle-row">

                        <div class="toggle-copy">

                            <strong>
                                Compact tables
                            </strong>

                            <span>
                                Use denser security tables.
                            </span>

                        </div>

                        <label class="switch">

                            <input
                                id="compact-toggle"
                                type="checkbox">

                            <span class="switch-track">
                            </span>

                        </label>

                    </div>

                </section>


                <section class="card card-pad">

                    <div class="section-title">
                        About this version
                    </div>

                    <p class="muted">
                        NSAT Frontend 2.0 provides a
                        professional security-console
                        interface while keeping the
                        existing Flask APIs intact.
                    </p>

                    <div class="msg info">
                        Backend capabilities such as
                        CVE correlation, advanced scan
                        modes and OS detection will be
                        connected in the next phase.
                    </div>

                </section>

            </div>

        </div>
    `;


    const animationToggle =
        document.getElementById(
            "animations-toggle"
        );


    animationToggle.onchange =
        () => {

            document.documentElement
                .style.setProperty(
                    "--motion",
                    animationToggle.checked
                        ? "1"
                        : "0"
                );
        };
}


/* ========================================
   ABOUT
======================================== */

function initAbout() {

    document.getElementById(
        "page-root"
    ).innerHTML = `

        <div class="page">

            <div class="page-header">

                <div>

                    <div class="eyebrow">
                        Platform
                    </div>

                    <div class="page-title">
                        About NSAT
                    </div>

                    <div class="page-subtitle">
                        Network Security Audit Tool
                    </div>

                </div>

            </div>


            <div class="grid grid-3">

                <section class="card card-pad">

                    <div class="eyebrow">
                        Discovery
                    </div>

                    <h2>
                        Host discovery
                    </h2>

                    <p class="muted">
                        Discover whether an authorised
                        target responds to network probes.
                    </p>

                </section>


                <section class="card card-pad">

                    <div class="eyebrow">
                        Enumeration
                    </div>

                    <h2>
                        Service scanning
                    </h2>

                    <p class="muted">
                        Identify exposed ports and
                        detected services using Nmap.
                    </p>

                </section>


                <section class="card card-pad">

                    <div class="eyebrow">
                        Assessment
                    </div>

                    <h2>
                        Risk scoring
                    </h2>

                    <p class="muted">
                        Apply an explainable weighted
                        risk model to detected services.
                    </p>

                </section>

            </div>

        </div>
    `;
}


/* ========================================
   INITIALIZE PAGE
======================================== */

window.NSAT = NSAT;
window.initShell = initShell;
window.initLogin = initLogin;
window.initDashboard = initDashboard;
window.initScan = initScan;
window.initTargets = initTargets;
window.initVulnerabilities = initVulnerabilities;
window.initReports = initReports;
window.initSettings = initSettings;
window.initAbout = initAbout;
window.openDrawer = openDrawer;
window.closeDrawer = closeDrawer;