// ============================================================
// DEVT SHARED COMPONENTS + AUTH SESSION
// ============================================================

(function setupDevTAuth() {
    const originalFetch = window.fetch.bind(window);
    const TOKEN_KEY = "devt_access_token";
    const PROFILE_KEY = "devt_profile";

    function getToken() { return localStorage.getItem(TOKEN_KEY) || ""; }
    function getProfile() {
        try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null"); }
        catch (_) { return null; }
    }
    function setSession(token, profile) {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        if (profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    }
    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(PROFILE_KEY);
    }

    window.fetch = async function(input, init = {}) {
        const url = typeof input === "string" ? input : input?.url || "";
        const isApi = url.startsWith("/api/") || url.startsWith(window.location.origin + "/api/");
        const isLogin = url.includes("/api/auth/login");

        if (isApi && !isLogin) {
            const token = getToken();
            const headers = new Headers(init.headers || (typeof input !== "string" ? input.headers : undefined) || {});
            if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
            init = { ...init, headers };
        }

        const response = await originalFetch(input, init);
        if (isApi && !isLogin && response.status === 401) {
            clearSession();
            if (window.location.pathname !== "/login.html") window.location.replace("/login.html");
        }
        return response;
    };

    async function ensureAuthenticated() {
        const token = getToken();
        if (!token) {
            window.location.replace("/login.html");
            return null;
        }
        try {
            const response = await window.fetch("/api/auth/me");
            const result = await response.json();
            if (!response.ok || !result.profile) throw new Error("Session expired");
            localStorage.setItem(PROFILE_KEY, JSON.stringify(result.profile));
            return result.profile;
        } catch (_) {
            clearSession();
            window.location.replace("/login.html");
            return null;
        }
    }

    async function logout() {
        try { await window.fetch("/api/auth/logout", { method: "POST" }); } catch (_) {}
        clearSession();
        window.location.replace("/login.html");
    }

    window.DevTAuth = { getToken, getProfile, setSession, clearSession, ensureAuthenticated, logout };
})();

document.addEventListener("DOMContentLoaded", async () => {
    const profile = await window.DevTAuth.ensureAuthenticated();
    if (!profile) return;

    const sidebarContainer = document.getElementById("sidebar-container");
    const headerContainer = document.getElementById("header-container");

    if (sidebarContainer) {
        const response = await fetch("/components/sidebar.html");
        sidebarContainer.innerHTML = await response.text();

        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get("project_id");
        const tasksLink = sidebarContainer.querySelector("#sidebarTasksLink");

        if (tasksLink) {
            if (projectId) {
                tasksLink.href = `/tasks.html?project_id=${encodeURIComponent(projectId)}`;
            } else {
                tasksLink.href = "/?select_project=1";
                tasksLink.addEventListener("click", event => {
                    event.preventDefault();
                    window.location.href = "/?select_project=1";
                });
            }
        }

        const teamLink = sidebarContainer.querySelector("#sidebarDevelopmentTeamLink");
        if (teamLink && profile.role !== "admin") teamLink.hidden = true;

        const userName = sidebarContainer.querySelector("#sidebarUserName");
        const userRole = sidebarContainer.querySelector("#sidebarUserRole");
        if (userName) userName.textContent = profile.full_name || profile.email || "DevT User";
        if (userRole) userRole.textContent = profile.role === "admin" ? "Administrator" : "Development Team";

        const logoutBtn = sidebarContainer.querySelector("#sidebarLogoutBtn");
        if (logoutBtn) logoutBtn.addEventListener("click", () => window.DevTAuth.logout());

        const currentPath = window.location.pathname;
        const sidebarLinks = sidebarContainer.querySelectorAll(".nav-item");
        sidebarLinks.forEach(link => {
            link.classList.remove("active");
            if (currentPath === "/") {
                if (link.id === "sidebarDashboardLink") link.classList.add("active");
                return;
            }
            const linkPath = new URL(link.href, window.location.origin).pathname;
            if (linkPath === currentPath) link.classList.add("active");
        });
    }

    if (headerContainer) {
        const response = await fetch("/components/header.html");
        headerContainer.innerHTML = await response.text();
    }
});
