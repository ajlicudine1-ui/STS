document.addEventListener("DOMContentLoaded", async () => {

    const sidebarContainer =
        document.getElementById("sidebar-container");

    const headerContainer =
        document.getElementById("header-container");

    // ============================================================
    // LOAD SIDEBAR
    // ============================================================

    if (sidebarContainer) {
        const response =
            await fetch("/components/sidebar.html");

        sidebarContainer.innerHTML =
            await response.text();

        // ========================================================
        // GET CURRENT PROJECT ID
        // ========================================================

        const urlParams =
            new URLSearchParams(window.location.search);

        const projectId =
            urlParams.get("project_id");

        // ========================================================
        // TASKS LINK
        // ========================================================

        const tasksLink =
            sidebarContainer.querySelector(
                "#sidebarTasksLink"
            );

        if (tasksLink) {
            if (projectId) {
                tasksLink.href =
                    `/tasks.html?project_id=${encodeURIComponent(projectId)}`;
            } else {
                tasksLink.href =
                    "/?select_project=1";

                tasksLink.addEventListener(
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
        // ACTIVE PAGE
        // ========================================================

        const currentPath =
            window.location.pathname;

        const sidebarLinks =
            sidebarContainer.querySelectorAll(
                ".nav-item"
            );

        sidebarLinks.forEach(link => {
            link.classList.remove("active");

            // On the Projects page, ONLY Projects is active.
            // This prevents both Projects and Tasks becoming active
            // when Tasks redirects to /?select_project=1.
            if (currentPath === "/") {
                if (link.id === "sidebarDashboardLink") {
                    link.classList.add("active");
                }
                return;
            }

            const linkPath =
                new URL(
                    link.href,
                    window.location.origin
                ).pathname;

            if (linkPath === currentPath) {
                link.classList.add("active");
            }
        });
    }

    // ============================================================
    // LOAD HEADER
    // ============================================================

    if (headerContainer) {
        const response =
            await fetch("/components/header.html");

        headerContainer.innerHTML =
            await response.text();
    }
});
