// ============================================================
// DEVT SHARED COMPONENTS + AUTH SESSION
// Faster sidebar rendering: cached profile + cached component HTML
// ============================================================

(function setupDevTAuth() {

    const originalFetch = window.fetch.bind(window);

    const TOKEN_KEY = "devt_access_token";
    const REFRESH_TOKEN_KEY = "devt_refresh_token";
    const PROFILE_KEY = "devt_profile";

    // Authentication is tab-scoped. Remove old shared auth values left by
    // previous localStorage-based versions so Admin/User roles cannot leak
    // between browser tabs.
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(PROFILE_KEY);

    function getToken() {
        return sessionStorage.getItem(TOKEN_KEY) || "";
    }

    function getProfile() {
        try {
            return JSON.parse(
                sessionStorage.getItem(PROFILE_KEY) || "null"
            );
        } catch (_) {
            return null;
        }
    }

    function getRefreshToken() {
        return sessionStorage.getItem(
            REFRESH_TOKEN_KEY
        ) || "";
    }

    function setSession(
        token,
        refreshToken,
        profile
    ) {

        if (token) {
            sessionStorage.setItem(
                TOKEN_KEY,
                token
            );
        }

        if (refreshToken) {
            sessionStorage.setItem(
                REFRESH_TOKEN_KEY,
                refreshToken
            );
        }

        if (profile) {
            sessionStorage.setItem(
                PROFILE_KEY,
                JSON.stringify(profile)
            );
        }
    }

    function clearSession() {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);
        sessionStorage.removeItem(PROFILE_KEY);
    }


    // Only one refresh request should run at a time. If several API
    // requests receive 401 together, they all wait for this same refresh.
    let refreshPromise =
        null;


    async function refreshSession() {

        if (refreshPromise) {
            return refreshPromise;
        }

        refreshPromise =
            (async () => {

                const refreshToken =
                    getRefreshToken();

                if (!refreshToken) {
                    return false;
                }

                try {

                    const response =
                        await originalFetch(
                            "/api/auth/refresh",
                            {
                                method:
                                    "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({
                                        refresh_token:
                                            refreshToken
                                    })
                            }
                        );

                    const responseText =
                        await response.text();

                    let result = {};

                    try {
                        result =
                            responseText
                                ? JSON.parse(
                                    responseText
                                )
                                : {};
                    } catch (_) {
                        return false;
                    }

                    if (
                        !response.ok ||
                        !result.access_token ||
                        !result.refresh_token
                    ) {
                        return false;
                    }

                    setSession(
                        result.access_token,
                        result.refresh_token,
                        result.profile ||
                        getProfile()
                    );

                    return true;

                } catch (_) {

                    return false;

                }

            })();

        try {

            return await refreshPromise;

        } finally {

            refreshPromise =
                null;

        }
    }


    function redirectToLogin() {

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
            url.includes(
                "/api/auth/login"
            );

        const isRefresh =
            url.includes(
                "/api/auth/refresh"
            );

        const shouldAttachAuth =
            isApi &&
            !isLogin &&
            !isRefresh;


        let requestInit = {
            ...init
        };


        if (shouldAttachAuth) {

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

            if (token) {

                // Always use the newest token from sessionStorage.
                // This prevents a caller's stale Authorization header
                // from surviving after a successful refresh.
                headers.set(
                    "Authorization",
                    `Bearer ${token}`
                );

            }

            requestInit = {
                ...requestInit,
                headers
            };

        }


        let response =
            await originalFetch(
                input,
                requestInit
            );


        if (
            shouldAttachAuth &&
            response.status === 401
        ) {

            const refreshed =
                await refreshSession();

            if (refreshed) {

                const retryHeaders =
                    new Headers(
                        requestInit.headers ||
                        (
                            typeof input !== "string"
                                ? input.headers
                                : undefined
                        ) ||
                        {}
                    );

                retryHeaders.set(
                    "Authorization",
                    `Bearer ${getToken()}`
                );

                response =
                    await originalFetch(
                        input,
                        {
                            ...requestInit,
                            headers:
                                retryHeaders
                        }
                    );

            }

        }


        if (
            shouldAttachAuth &&
            response.status === 401
        ) {

            redirectToLogin();

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

            sessionStorage.setItem(
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
        getRefreshToken,
        getProfile,
        setSession,
        clearSession,
        refreshSession,
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

        const isAdmin =
            profile.role === "admin";

        // `hidden` can be visually overridden by `.nav-item { display:flex; }`
        // in some stylesheet combinations, so enforce visibility explicitly.
        teamLink.hidden =
            !isAdmin;

        teamLink.style.display =
            isAdmin
                ? ""
                : "none";

        teamLink.setAttribute(
            "aria-hidden",
            isAdmin
                ? "false"
                : "true"
        );
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
