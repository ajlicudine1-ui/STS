// ============================================================
// DEVT SHARED COMPONENTS + AUTH SESSION
// Faster sidebar rendering: cached profile + cached component HTML
// ============================================================

(function setupDevTAuth() {

    const originalFetch = window.fetch.bind(window);

    const TOKEN_KEY = "devt_access_token";
    const PROFILE_KEY = "devt_profile";

    function getToken() {
        return localStorage.getItem(TOKEN_KEY) || "";
    }

    function getProfile() {
        try {
            return JSON.parse(
                localStorage.getItem(PROFILE_KEY) || "null"
            );
        } catch (_) {
            return null;
        }
    }

    function setSession(token, profile) {

        if (token) {
            localStorage.setItem(
                TOKEN_KEY,
                token
            );
        }

        if (profile) {
            localStorage.setItem(
                PROFILE_KEY,
                JSON.stringify(profile)
            );
        }
    }

    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(PROFILE_KEY);
    }

    window.fetch = async function(input, init = {}) {

        const url =
            typeof input === "string"
                ? input
                : input?.url || "";

        const isApi =
            url.startsWith("/api/") ||
            url.startsWith(
                window.location.origin + "/api/"
            );

        const isLogin =
            url.includes("/api/auth/login");

        if (isApi && !isLogin) {

            const token =
                getToken();

            const headers =
                new Headers(
                    init.headers ||
                    (
                        typeof input !== "string"
                            ? input.headers
                            : undefined
                    ) ||
                    {}
                );

            if (
                token &&
                !headers.has("Authorization")
            ) {
                headers.set(
                    "Authorization",
                    `Bearer ${token}`
                );
            }

            init = {
                ...init,
                headers
            };
        }

        const response =
            await originalFetch(
                input,
                init
            );

        if (
            isApi &&
            !isLogin &&
            response.status === 401
        ) {

            clearSession();

            if (
                window.location.pathname !==
                "/login.html"
            ) {
                window.location.replace(
                    "/login.html"
                );
            }
        }

        return response;
    };

    async function ensureAuthenticated() {

        const token =
            getToken();

        if (!token) {
            window.location.replace(
                "/login.html"
            );
            return null;
        }

        try {

            const response =
                await window.fetch(
                    "/api/auth/me"
                );

            const result =
                await response.json();

            if (
                !response.ok ||
                !result.profile
            ) {
                throw new Error(
                    "Session expired"
                );
            }

            localStorage.setItem(
                PROFILE_KEY,
                JSON.stringify(
                    result.profile
                )
            );

            return result.profile;

        } catch (_) {

            clearSession();

            window.location.replace(
                "/login.html"
            );

            return null;
        }
    }

    async function logout() {

        try {
            await window.fetch(
                "/api/auth/logout",
                {
                    method: "POST"
                }
            );
        } catch (_) {}

        clearSession();

        window.location.replace(
            "/login.html"
        );
    }

    window.DevTAuth = {
        getToken,
        getProfile,
        setSession,
        clearSession,
        ensureAuthenticated,
        logout
    };

})();


// ============================================================
// SHARED COMPONENT CACHE
// ============================================================

const DEVT_SIDEBAR_CACHE_KEY =
    "devt_sidebar_html_v1";

const DEVT_HEADER_CACHE_KEY =
    "devt_header_html_v1";


function configureSidebar(
    sidebarContainer,
    profile
) {

    if (
        !sidebarContainer ||
        !profile
    ) {
        return;
    }

    const urlParams =
        new URLSearchParams(
            window.location.search
        );

    const projectId =
        urlParams.get(
            "project_id"
        );


    // ========================================================
    // TASKS LINK
    // ========================================================

    const tasksLink =
        sidebarContainer.querySelector(
            "#sidebarTasksLink"
        );

    if (tasksLink) {

        // Avoid duplicate listener if cached sidebar is
        // reconfigured after fresh HTML arrives.
        const cleanTasksLink =
            tasksLink.cloneNode(true);

        tasksLink.replaceWith(
            cleanTasksLink
        );

        if (projectId) {

            cleanTasksLink.href =
                `/tasks.html?project_id=${encodeURIComponent(projectId)}`;

        } else {

            cleanTasksLink.href =
                "/?select_project=1";

            cleanTasksLink.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    window.location.href =
                        "/?select_project=1";
                }
            );
        }
    }


    // ========================================================
    // ROLE-SPECIFIC ITEMS
    // ========================================================

    const teamLink =
        sidebarContainer.querySelector(
            "#sidebarDevelopmentTeamLink"
        );

    if (teamLink) {
        teamLink.hidden =
            profile.role !== "admin";
    }


    // ========================================================
    // USER INFO
    // ========================================================

    const userName =
        sidebarContainer.querySelector(
            "#sidebarUserName"
        );

    const userRole =
        sidebarContainer.querySelector(
            "#sidebarUserRole"
        );

    if (userName) {
        userName.textContent =
            profile.full_name ||
            profile.email ||
            "DevT User";
    }

    if (userRole) {
        userRole.textContent =
            profile.role === "admin"
                ? "Administrator"
                : "Development Team";
    }


    // ========================================================
    // LOGOUT
    // ========================================================

    const logoutBtn =
        sidebarContainer.querySelector(
            "#sidebarLogoutBtn"
        );

    if (logoutBtn) {

        const cleanLogoutBtn =
            logoutBtn.cloneNode(true);

        logoutBtn.replaceWith(
            cleanLogoutBtn
        );

        cleanLogoutBtn.addEventListener(
            "click",
            () =>
                window.DevTAuth.logout()
        );
    }


    // ========================================================
    // ACTIVE PAGE
    // ========================================================

    const currentPath =
        window.location.pathname;

    const sidebarLinks =
        sidebarContainer.querySelectorAll(
            ".nav-item"
        );

    sidebarLinks.forEach(link => {

        link.classList.remove(
            "active"
        );

        if (currentPath === "/") {

            if (
                link.id ===
                "sidebarDashboardLink"
            ) {
                link.classList.add(
                    "active"
                );
            }

            return;
        }

        const linkPath =
            new URL(
                link.href,
                window.location.origin
            ).pathname;

        if (
            linkPath === currentPath
        ) {
            link.classList.add(
                "active"
            );
        }
    });
}


// ============================================================
// LOAD + CACHE COMPONENT
// ============================================================

async function refreshCachedComponent({
    url,
    container,
    cacheKey,
    onRender = null
}) {

    try {

        const response =
            await fetch(
                url,
                {
                    cache: "force-cache"
                }
            );

        if (!response.ok) {
            return;
        }

        const html =
            await response.text();

        if (!html) {
            return;
        }

        localStorage.setItem(
            cacheKey,
            html
        );

        // Only replace if the component is actually different.
        // This prevents the visible flash/flicker.
        if (
            container.innerHTML.trim() !==
            html.trim()
        ) {
            container.innerHTML =
                html;

            if (onRender) {
                onRender();
            }
        }

    } catch (_) {
        // Keep cached component if network refresh fails.
    }
}


// ============================================================
// PAGE INITIALIZATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const sidebarContainer =
            document.getElementById(
                "sidebar-container"
            );

        const headerContainer =
            document.getElementById(
                "header-container"
            );

        const token =
            window.DevTAuth.getToken();

        const cachedProfile =
            window.DevTAuth.getProfile();


        // ====================================================
        // NO TOKEN -> LOGIN IMMEDIATELY
        // ====================================================

        if (!token) {

            window.location.replace(
                "/login.html"
            );

            return;
        }


        // ====================================================
        // SHOW SIDEBAR IMMEDIATELY FROM CACHE
        // Do NOT wait for /api/auth/me first.
        // ====================================================

        if (sidebarContainer) {

            const cachedSidebar =
                localStorage.getItem(
                    DEVT_SIDEBAR_CACHE_KEY
                );

            if (cachedSidebar) {

                sidebarContainer.innerHTML =
                    cachedSidebar;

                if (cachedProfile) {
                    configureSidebar(
                        sidebarContainer,
                        cachedProfile
                    );
                }
            }

            // Fetch sidebar immediately/in parallel.
            // First visit may not have cache yet.
            if (!cachedSidebar) {

                try {

                    const response =
                        await fetch(
                            "/components/sidebar.html",
                            {
                                cache:
                                    "force-cache"
                            }
                        );

                    if (response.ok) {

                        const html =
                            await response.text();

                        localStorage.setItem(
                            DEVT_SIDEBAR_CACHE_KEY,
                            html
                        );

                        sidebarContainer.innerHTML =
                            html;

                        if (cachedProfile) {
                            configureSidebar(
                                sidebarContainer,
                                cachedProfile
                            );
                        }
                    }

                } catch (_) {}
            }
        }


        // ====================================================
        // SHOW HEADER FROM CACHE IMMEDIATELY
        // ====================================================

        if (headerContainer) {

            const cachedHeader =
                localStorage.getItem(
                    DEVT_HEADER_CACHE_KEY
                );

            if (cachedHeader) {
                headerContainer.innerHTML =
                    cachedHeader;
            }
        }


        // ====================================================
        // AUTH VALIDATION + COMPONENT REFRESH IN PARALLEL
        // ====================================================

        const authPromise =
            window.DevTAuth.ensureAuthenticated();

        const sidebarRefreshPromise =
            sidebarContainer
                ? refreshCachedComponent({
                    url:
                        "/components/sidebar.html",

                    container:
                        sidebarContainer,

                    cacheKey:
                        DEVT_SIDEBAR_CACHE_KEY,

                    onRender:
                        () => {

                            const profile =
                                window.DevTAuth.getProfile() ||
                                cachedProfile;

                            if (profile) {
                                configureSidebar(
                                    sidebarContainer,
                                    profile
                                );
                            }
                        }
                })
                : Promise.resolve();

        const headerRefreshPromise =
            headerContainer
                ? refreshCachedComponent({
                    url:
                        "/components/header.html",

                    container:
                        headerContainer,

                    cacheKey:
                        DEVT_HEADER_CACHE_KEY
                })
                : Promise.resolve();


        const profile =
            await authPromise;

        if (!profile) {
            return;
        }


        // Reconfigure with fresh profile returned by the server.
        if (
            sidebarContainer &&
            sidebarContainer.innerHTML.trim()
        ) {
            configureSidebar(
                sidebarContainer,
                profile
            );
        }


        // Let background component refreshes finish without
        // blocking the visible page/sidebar.
        await Promise.allSettled([
            sidebarRefreshPromise,
            headerRefreshPromise
        ]);
    }
);
