// ============================================================
// STS - DASHBOARD / PROJECTS
// ============================================================


// ============================================================
// STATE
// ============================================================

let editingProjectId = null;


// ============================================================
// ELEMENTS
// ============================================================

const projectModal =
    document.getElementById(
        "projectModal"
    );

const newProjectBtn =
    document.getElementById(
        "newProjectBtn"
    );

const closeProjectModal =
    document.getElementById(
        "closeProjectModal"
    );

const cancelProjectBtn =
    document.getElementById(
        "cancelProjectBtn"
    );

const projectForm =
    document.getElementById(
        "projectForm"
    );

const projectModalTitle =
    document.getElementById(
        "projectModalTitle"
    );

const projectModalSubtitle =
    document.getElementById(
        "projectModalSubtitle"
    );

const projectSubmitBtn =
    document.getElementById(
        "projectSubmitBtn"
    );


// ============================================================
// HELPERS
// ============================================================

function getProjectElement(id) {

    return document.getElementById(id);

}


function getProjectValue(id) {

    const element =
        getProjectElement(id);

    return element
        ? element.value
        : "";

}


function setProjectValue(
    id,
    value
) {

    const element =
        getProjectElement(id);

    if (element) {

        element.value =
            value ?? "";

    }

}


function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }

    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}


// ============================================================
// STATUS CLASS
// ============================================================

function getProjectStatusClass(status) {

    switch (status) {

        case "Active":
            return "status-active";

        case "Completed":
            return "status-completed";

        case "Not Started":
        case "On Hold":
        default:
            return "status-pending";

    }

}


// ============================================================
// CLOSE ALL ACTION MENUS
// ============================================================

function closeAllProjectActionMenus() {

    document
        .querySelectorAll(
            ".project-action-menu.show"
        )
        .forEach(menu => {

            menu.classList.remove(
                "show",
                "project-action-menu-portal"
            );


            menu.style.left = "";
            menu.style.top = "";
            menu.style.right = "";
            menu.style.bottom = "";
            menu.style.visibility = "";


            const trigger =
                menu._projectActionTrigger;


            const wrapper =
                menu._projectActionWrapper;


            if (trigger) {

                trigger.classList.remove(
                    "active"
                );

                trigger.setAttribute(
                    "aria-expanded",
                    "false"
                );

            }


            /*
                Put the menu back inside its original wrapper
                after closing. When open, it is temporarily moved
                to <body> so table/container overflow cannot clip it.
            */

            if (
                wrapper &&
                menu.parentElement !== wrapper
            ) {

                wrapper.appendChild(
                    menu
                );

            }

        });

}


// ============================================================
// POSITION PROJECT ACTION MENU
// ============================================================

function openProjectActionMenu(
    trigger,
    menu
) {

    if (
        !trigger ||
        !menu
    ) {

        return;

    }


    const triggerRect =
        trigger.getBoundingClientRect();


    /*
        Move the dropdown outside the scrollable table.
        This prevents .table-container from cutting off
        the menu at the top or bottom.
    */

    document.body.appendChild(
        menu
    );


    menu.classList.add(
        "project-action-menu-portal",
        "show"
    );


    menu.style.visibility =
        "hidden";

    menu.style.left =
        "0px";

    menu.style.top =
        "0px";

    menu.style.right =
        "auto";

    menu.style.bottom =
        "auto";


    const menuWidth =
        menu.offsetWidth;

    const menuHeight =
        menu.offsetHeight;


    const viewportPadding =
        10;

    const gap =
        6;


    /*
        Align the menu to the right side of the
        Actions button, but keep it inside the screen.
    */

    let left =
        triggerRect.right -
        menuWidth;


    left =
        Math.max(
            viewportPadding,
            Math.min(
                left,
                window.innerWidth -
                menuWidth -
                viewportPadding
            )
        );


    /*
        Normally open downward.
        If there is not enough room, automatically
        open upward so every action stays visible.
    */

    let top =
        triggerRect.bottom +
        gap;


    if (
        top +
        menuHeight >
        window.innerHeight -
        viewportPadding
    ) {

        top =
            triggerRect.top -
            menuHeight -
            gap;

    }


    /*
        Final viewport safety check.
    */

    top =
        Math.max(
            viewportPadding,
            Math.min(
                top,
                window.innerHeight -
                menuHeight -
                viewportPadding
            )
        );


    menu.style.left =
        `${left}px`;

    menu.style.top =
        `${top}px`;

    menu.style.visibility =
        "visible";


    trigger.classList.add(
        "active"
    );


    trigger.setAttribute(
        "aria-expanded",
        "true"
    );

}


// ============================================================

// CREATE PROJECT ACTION MENU
// ============================================================

function createProjectActionMenu(project) {

    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "project-action-wrapper";


    wrapper.innerHTML = `

        <button
            type="button"
            class="project-action-trigger"
            aria-expanded="false"
        >

            <span>
                Actions
            </span>

            <span class="project-action-arrow">
                ▾
            </span>

        </button>


        <div class="project-action-menu">

            <!-- VIEW TASKS -->
            <button
                type="button"
                class="project-action-item view-project-tasks"
            >

                <span class="project-action-icon">
                    ☷
                </span>

                <span>
                    View Tasks
                </span>

            </button>


            <!-- OPEN SYSTEM -->
            <button
                type="button"
                class="project-action-item open-project-system"
            >

                <span class="project-action-icon">
                    ↗
                </span>

                <span>
                    Open System
                </span>

            </button>


            <!-- EDIT -->
            <button
                type="button"
                class="project-action-item edit-project-action"
            >

                <span class="project-action-icon">
                    ✎
                </span>

                <span>
                    Edit
                </span>

            </button>


            <div class="project-action-divider"></div>


            <!-- DELETE -->
            <button
                type="button"
                class="project-action-item delete-project-action"
            >

                <span class="project-action-icon">
                    🗑
                </span>

                <span>
                    Delete
                </span>

            </button>

        </div>
    `;


    const trigger =
        wrapper.querySelector(
            ".project-action-trigger"
        );

    const menu =
        wrapper.querySelector(
            ".project-action-menu"
        );


    /*
        Keep references so the dropdown can temporarily
        move to <body> without losing its original wrapper.
    */

    if (menu) {

        menu._projectActionWrapper =
            wrapper;

        menu._projectActionTrigger =
            trigger;

    }


    // --------------------------------------------------------
    // TOGGLE MENU
    // --------------------------------------------------------

    if (
        trigger &&
        menu
    ) {

        trigger.addEventListener(
            "click",
            event => {

                event.stopPropagation();


                const wasOpen =
                    menu.classList.contains(
                        "show"
                    );


                closeAllProjectActionMenus();


                if (!wasOpen) {

                    openProjectActionMenu(
                        trigger,
                        menu
                    );

                }

            }
        );

    }


    // --------------------------------------------------------
    // VIEW TASKS
    // --------------------------------------------------------

    const viewTasksAction =
        wrapper.querySelector(
            ".view-project-tasks"
        );


    if (viewTasksAction) {

        viewTasksAction.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                closeAllProjectActionMenus();


                window.location.href =
                    `/tasks.html?project_id=${encodeURIComponent(
                        project.project_id
                    )}`;

            }
        );

    }


    // --------------------------------------------------------
    // OPEN SYSTEM
    // --------------------------------------------------------

    const openSystemAction =
        wrapper.querySelector(
            ".open-project-system"
        );


    if (openSystemAction) {

        openSystemAction.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                closeAllProjectActionMenus();


                if (!project.system_url_link) {

                    alert(
                        "No System URL has been added for this project."
                    );

                    return;

                }


                try {

                    const url =
                        new URL(
                            project.system_url_link
                        );


                    if (
                        url.protocol !== "http:" &&
                        url.protocol !== "https:"
                    ) {

                        throw new Error(
                            "Invalid URL."
                        );

                    }


                    window.open(
                        url.href,
                        "_blank",
                        "noopener,noreferrer"
                    );

                } catch (error) {

                    alert(
                        "The System URL is invalid."
                    );

                }

            }
        );

    }


    // --------------------------------------------------------
    // EDIT
    // --------------------------------------------------------

    const editAction =
        wrapper.querySelector(
            ".edit-project-action"
        );


    if (editAction) {

        editAction.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                closeAllProjectActionMenus();

                openEditProjectModal(
                    project
                );

            }
        );

    }


    // --------------------------------------------------------
    // DELETE
    // --------------------------------------------------------

    const deleteAction =
        wrapper.querySelector(
            ".delete-project-action"
        );


    if (deleteAction) {

        deleteAction.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                closeAllProjectActionMenus();

                deleteProject(
                    project
                );

            }
        );

    }


    return wrapper;

}


// ============================================================
// CLOSE ACTION MENU WHEN CLICKING PAGE
// ============================================================

document.addEventListener(
    "click",
    () => {

        closeAllProjectActionMenus();

    }
);


/*
    If the page/table scrolls or the browser is resized,
    close the floating menu so it can never remain detached
    from its Actions button.
*/

window.addEventListener(
    "resize",
    closeAllProjectActionMenus
);


window.addEventListener(
    "scroll",
    closeAllProjectActionMenus,
    true
);


// ============================================================
// DASHBOARD
// ============================================================

async function loadDashboard() {

    try {

        const response =
            await fetch(
                "/api/dashboard"
            );


        if (!response.ok) {

            throw new Error(
                "Failed to load dashboard data."
            );

        }


        const data =
            await response.json();


        // ----------------------------------------------------
        // STATISTICS
        // ----------------------------------------------------

        document
            .getElementById(
                "totalProjects"
            )
            .textContent =
                data.totalProjects ?? 0;


        document
            .getElementById(
                "activeProjects"
            )
            .textContent =
                data.activeProjects ?? 0;


        document
            .getElementById(
                "completedProjects"
            )
            .textContent =
                data.completedProjects ?? 0;


        document
            .getElementById(
                "totalTasks"
            )
            .textContent =
                data.totalTasks ?? 0;


        // ----------------------------------------------------
        // PROJECT TABLE
        // ----------------------------------------------------

        const table =
            document.getElementById(
                "projectsTable"
            );


        table.innerHTML =
            "";


        const projects =
            Array.isArray(
                data.projects
            )
                ? data.projects
                : [];


        if (
            projects.length === 0
        ) {

            table.innerHTML = `
                <tr>

                    <td colspan="5">
                        No projects found.
                    </td>

                </tr>
            `;

            return;

        }


        projects.forEach(
            project => {

                const row =
                    document.createElement(
                        "tr"
                    );


                const statusClass =
                    getProjectStatusClass(
                        project.project_status
                    );


                row.innerHTML = `

                    <!-- PROJECT NAME -->

                    <td>
                        ${escapeHtml(
                            project.project_name ||
                            "-"
                        )}
                    </td>


                    <!-- OWNER -->

                    <td>
                        ${escapeHtml(
                            project.project_owner ||
                            "-"
                        )}
                    </td>


                    <!-- STATUS -->

                    <td>

                        <span
                            class="status ${statusClass}"
                        >
                            ${escapeHtml(
                                project.project_status ||
                                "Not Started"
                            )}
                        </span>

                    </td>


                    <!-- DATE OPENED -->

                    <td>
                        ${escapeHtml(
                            project.date_opened ||
                            "-"
                        )}
                    </td>


                    <!-- ACTIONS -->

                    <td class="project-actions"></td>
                `;


                // ------------------------------------------------
                // ADD ACTION MENU
                // ------------------------------------------------

                const actionsCell =
                    row.querySelector(
                        ".project-actions"
                    );


                if (actionsCell) {

                    actionsCell.appendChild(
                        createProjectActionMenu(
                            project
                        )
                    );

                }


                table.appendChild(
                    row
                );

            }
        );

    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );

    }

}


// ============================================================
// RESET PROJECT MODAL
// ============================================================

function resetProjectModal() {

    editingProjectId = null;


    if (projectForm) {

        projectForm.reset();

    }


    setProjectValue(
        "projectStatus",
        "Not Started"
    );


    if (projectModalTitle) {

        projectModalTitle.textContent =
            "New Project";

    }


    if (projectModalSubtitle) {

        projectModalSubtitle.textContent =
            "Create a new project in STS.";

    }


    if (projectSubmitBtn) {

        projectSubmitBtn.textContent =
            "Create Project";

    }

}


// ============================================================
// OPEN NEW PROJECT MODAL
// ============================================================

if (newProjectBtn) {

    newProjectBtn.addEventListener(
        "click",
        () => {

            resetProjectModal();

            projectModal.classList.add(
                "show"
            );

        }
    );

}


// ============================================================
// OPEN EDIT PROJECT MODAL
// ============================================================

function openEditProjectModal(project) {

    editingProjectId =
        project.project_id;


    if (projectModalTitle) {

        projectModalTitle.textContent =
            "Edit Project";

    }


    if (projectModalSubtitle) {

        projectModalSubtitle.textContent =
            "Update the information for this project.";

    }


    if (projectSubmitBtn) {

        projectSubmitBtn.textContent =
            "Update Project";

    }


    setProjectValue(
        "projectName",
        project.project_name
    );


    setProjectValue(
        "projectLink",
        project.system_url_link
    );


    setProjectValue(
        "projectOwner",
        project.project_owner
    );


    setProjectValue(
        "projectStatus",
        project.project_status
    );


    setProjectValue(
        "dateOpened",
        project.date_opened
            ? String(
                project.date_opened
            ).substring(
                0,
                10
            )
            : ""
    );


    


    projectModal.classList.add(
        "show"
    );

}


// ============================================================
// CLOSE PROJECT MODAL
// ============================================================

function closeModal() {

    projectModal.classList.remove(
        "show"
    );

    resetProjectModal();

}


if (closeProjectModal) {

    closeProjectModal.addEventListener(
        "click",
        closeModal
    );

}


if (cancelProjectBtn) {

    cancelProjectBtn.addEventListener(
        "click",
        closeModal
    );

}


if (projectModal) {

    projectModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                projectModal
            ) {

                closeModal();

            }

        }
    );

}


// ============================================================
// CREATE / UPDATE PROJECT
// ============================================================

if (projectForm) {

    projectForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const projectData = {

                project_name:
                    getProjectValue(
                        "projectName"
                    ).trim(),

                system_url_link:
                    getProjectValue(
                        "projectLink"
                    ).trim() ||
                    null,

                project_owner:
                    getProjectValue(
                        "projectOwner"
                    ).trim() ||
                    null,

                project_status:
                    getProjectValue(
                        "projectStatus"
                    ) ||
                    "Not Started",

                date_opened:
                    getProjectValue(
                        "dateOpened"
                    ) ||
                    null,
            };


            if (
                !projectData.project_name
            ) {

                alert(
                    "Project name is required."
                );

                return;

            }


            const isEditing =
                editingProjectId !== null;


            let url;
            let method;


            if (isEditing) {

                url =
                    `/api/projects/${encodeURIComponent(
                        editingProjectId
                    )}`;

                method =
                    "PUT";

            } else {

                url =
                    "/api/projects";

                method =
                    "POST";

            }


            try {

                const response =
                    await fetch(
                        url,
                        {
                            method:
                                method,

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify(
                                    projectData
                                )

                        }
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        result.error ||
                        (
                            isEditing
                                ? "Failed to update project."
                                : "Failed to create project."
                        )
                    );

                }


                alert(
                    isEditing
                        ? "Project updated successfully!"
                        : "Project created successfully!"
                );


                closeModal();


                await loadDashboard();

            } catch (error) {

                console.error(
                    "Project save error:",
                    error
                );


                alert(
                    "Error: " +
                    error.message
                );

            }

        }
    );

}


// ============================================================
// DELETE PROJECT
// ============================================================

async function deleteProject(project) {

    if (
        !project ||
        !project.project_id
    ) {

        return;

    }


    const confirmed =
        confirm(
            `Are you sure you want to delete "${project.project_name || "this project"}"?`
        );


    if (!confirmed) {

        return;

    }


    try {

        const response =
            await fetch(
                `/api/projects/${encodeURIComponent(
                    project.project_id
                )}`,
                {
                    method:
                        "DELETE"
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.error ||
                "Failed to delete project."
            );

        }


        alert(
            "Project deleted successfully!"
        );


        await loadDashboard();

    } catch (error) {

        console.error(
            "Delete project error:",
            error
        );


        alert(
            "Error: " +
            error.message
        );

    }

}


// ============================================================
// INITIAL LOAD
// ============================================================

loadDashboard();