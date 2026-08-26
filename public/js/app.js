// ============================================================
// PTS - DASHBOARD / PROJECTS
// ============================================================


// ============================================================
// STATE
// ============================================================

let editingProjectId = null;


// ============================================================
// ELEMENTS
// ============================================================

const projectModal = document.getElementById("projectModal");
const newProjectBtn = document.getElementById("newProjectBtn");
const closeProjectModalBtn = document.getElementById("closeProjectModal");
const cancelProjectBtn = document.getElementById("cancelProjectBtn");

const projectForm = document.getElementById("projectForm");
const projectModalTitle = document.getElementById("projectModalTitle");
const projectModalSubtitle = document.getElementById("projectModalSubtitle");
const projectSubmitBtn = document.getElementById("projectSubmitBtn");

const projectOwner = document.getElementById("projectOwner");
const developmentTeamContainer = document.getElementById("developmentTeamContainer");
const addTeamMemberBtn = document.getElementById("addTeamMemberBtn");


// ============================================================
// HELPERS
// ============================================================

function getProjectElement(id) {
    return document.getElementById(id);
}


function getProjectValue(id) {
    const element = getProjectElement(id);
    return element ? element.value : "";
}


function setProjectValue(id, value) {
    const element = getProjectElement(id);

    if (element) {
        element.value = value ?? "";
    }
}


function escapeHtml(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


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
// DEVELOPMENT TEAM - FREE TEXT INPUT
// ============================================================

function createTeamMemberRow(member = null) {

    const row =
        document.createElement("div");

    row.className =
        "team-member-row";

    row.innerHTML = `
        <input
            type="text"
            class="team-member-name"
            placeholder="Enter team member name"
        >

        <input
            type="text"
            class="team-member-role"
            placeholder="Role e.g. Backend Developer"
        >

        <button
            type="button"
            class="remove-team-member-btn"
            aria-label="Remove team member"
        >
            &times;
        </button>
    `;

    const nameInput =
        row.querySelector(
            ".team-member-name"
        );

    const roleInput =
        row.querySelector(
            ".team-member-role"
        );

    const removeButton =
        row.querySelector(
            ".remove-team-member-btn"
        );

    if (nameInput) {
        nameInput.value =
            member?.member_name ||
            member?.name ||
            "";
    }

    if (roleInput) {
        roleInput.value =
            member?.member_role ||
            member?.role ||
            "";
    }

    if (removeButton) {
        removeButton.addEventListener(
            "click",
            () => {

                row.remove();

                ensureAtLeastOneTeamRow();

            }
        );
    }

    return row;
}


function clearDevelopmentTeamRows() {

    if (!developmentTeamContainer) {
        return;
    }

    developmentTeamContainer.innerHTML =
        "";
}


function ensureAtLeastOneTeamRow() {

    if (!developmentTeamContainer) {
        return;
    }

    const rows =
        developmentTeamContainer.querySelectorAll(
            ".team-member-row"
        );

    if (rows.length === 0) {

        developmentTeamContainer.appendChild(
            createTeamMemberRow()
        );
    }
}


function addTeamMemberRow(member = null) {

    if (!developmentTeamContainer) {
        return;
    }

    developmentTeamContainer.appendChild(
        createTeamMemberRow(member)
    );
}


if (addTeamMemberBtn) {

    addTeamMemberBtn.addEventListener(
        "click",
        () => {

            addTeamMemberRow();

        }
    );
}


// ============================================================
// COLLECT DEVELOPMENT TEAM
// ============================================================

function collectDevelopmentTeam() {

    if (!developmentTeamContainer) {
        return [];
    }

    const members = [];

    const rows =
        developmentTeamContainer.querySelectorAll(
            ".team-member-row"
        );

    for (const row of rows) {

        const nameInput =
            row.querySelector(
                ".team-member-name"
            );

        const roleInput =
            row.querySelector(
                ".team-member-role"
            );

        const memberName =
            nameInput?.value.trim() || "";

        const memberRole =
            roleInput?.value.trim() || "";

        // Ignore a completely blank row.
        if (!memberName && !memberRole) {
            continue;
        }

        if (!memberName) {
            throw new Error(
                "Please enter the name of each development team member."
            );
        }

        members.push({
            member_name:
                memberName,

            member_role:
                memberRole
        });
    }

    return members;
}


// ============================================================
// VERSION GUIDE DROPDOWN
// ============================================================

const versionGuideToggle =
    document.getElementById("versionGuideToggle");

const versionGuideDropdown =
    document.getElementById("versionGuideDropdown");


if (versionGuideToggle && versionGuideDropdown) {

    versionGuideToggle.addEventListener("click", () => {

        versionGuideDropdown.classList.toggle("show");

        versionGuideToggle.classList.toggle("active");

    });

}


// ============================================================
// DEVELOPMENT TEAM STORAGE
// ============================================================
//
// IMPORTANT:
// The current database/server project_members setup was designed
// around user_id values from the users table. These fields are now
// free-text inputs, so this function only prepares the team data.
//
// To persist the Development Team, the backend/project_members table
// must accept member_name + member_role instead of requiring user_id.
// ============================================================

// ============================================================
// RESET PROJECT MODAL
// ============================================================

function resetProjectModal() {
    editingProjectId = null;

    if (projectForm) {
        projectForm.reset();
    }

    setProjectValue(
        "projectId",
        ""
    );

    setProjectValue(
        "projectStatus",
        "Not Started"
    );

    clearDevelopmentTeamRows();
    addTeamMemberRow();

    if (projectModalTitle) {
        projectModalTitle.textContent =
            "New Project";
    }

    if (projectModalSubtitle) {
        projectModalSubtitle.textContent =
            "Create a new project in PTS.";
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
        async () => {

            // Reset all modal fields first
            resetProjectModal();

            // Open modal
            if (projectModal) {
                projectModal.classList.add("show");
            }

            // Get and display the next Project ID
            await loadNextProjectId();
        }
    );
}



// ============================================================
// LOAD PROJECT MEMBERS FOR EDIT
// ============================================================

async function loadExistingProjectMembers(projectId) {

    try {

        const response = await fetch(
            `/api/projects/${encodeURIComponent(projectId)}/members`
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                "Failed to load development team."
            );
        }

        return Array.isArray(result.members)
            ? result.members
            : [];

    } catch (error) {

        console.error(
            "Load project members error:",
            error
        );

        return [];
    }
}


// ============================================================
// OPEN EDIT PROJECT MODAL
// ============================================================

async function openEditProjectModal(
    project
) {

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
        "projectId",
        project.project_id
    );


    setProjectValue(
        "projectName",
        project.project_name
    );


    setProjectValue(
        "projectVersion",
        project.version
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
            ? String(project.date_opened).substring(0, 10)
            : ""
    );


    clearDevelopmentTeamRows();

    const members =
        await loadExistingProjectMembers(
            project.project_id
        );

    if (members.length > 0) {

        members.forEach(member => {
            addTeamMemberRow({
                member_name:
                    member.member_name || "",
                member_role:
                    member.member_role || ""
            });
        });

    } else {
        addTeamMemberRow();
    }


    if (projectModal) {
        projectModal.classList.add(
            "show"
        );
    }
}


// ============================================================
// CLOSE PROJECT MODAL
// ============================================================

function closeModal() {
    if (!projectModal) {
        return;
    }

    projectModal.classList.remove(
        "show"
    );

    resetProjectModal();
}


if (closeProjectModalBtn) {
    closeProjectModalBtn.addEventListener(
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

            if (
                wrapper &&
                menu.parentElement !==
                wrapper
            ) {
                wrapper.appendChild(menu);
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
    if (!trigger || !menu) {
        return;
    }

    const triggerRect =
        trigger.getBoundingClientRect();

    document.body.appendChild(menu);

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

    let left =
        triggerRect.right -
        menuWidth;

    left = Math.max(
        viewportPadding,
        Math.min(
            left,
            window.innerWidth -
            menuWidth -
            viewportPadding
        )
    );

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

    top = Math.max(
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

function createProjectActionMenu(
    project
) {
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

            <button
                type="button"
                class="project-action-item open-project-system"
            >
                <span class="project-action-icon">
                    ↗
                </span>

                <span>
                    Open Link
                </span>
            </button>

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

    if (menu) {
        menu._projectActionWrapper =
            wrapper;

        menu._projectActionTrigger =
            trigger;
    }

    if (trigger && menu) {
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

                if (
                    !project.system_url_link
                ) {
                    alert(
                        "No project link has been added for this project."
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
                        "The project link is invalid."
                    );
                }
            }
        );
    }

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

                deleteProject(project);
            }
        );
    }

    return wrapper;
}


document.addEventListener(
    "click",
    () => {
        closeAllProjectActionMenus();
    }
);


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
// LOAD DASHBOARD
// ============================================================

async function loadDashboard() {
    try {
        const response =
            await fetch(
                "/api/dashboard"
            );

        const data =
            await response.json();

        if (!response.ok) {
            throw new Error(
                data.error ||
                "Failed to load dashboard data."
            );
        }

        const totalProjects =
            document.getElementById(
                "totalProjects"
            );

        const activeProjects =
            document.getElementById(
                "activeProjects"
            );

        const completedProjects =
            document.getElementById(
                "completedProjects"
            );

        const totalTasks =
            document.getElementById(
                "totalTasks"
            );

        if (totalProjects) {
            totalProjects.textContent =
                data.totalProjects ?? 0;
        }

        if (activeProjects) {
            activeProjects.textContent =
                data.activeProjects ?? 0;
        }

        if (completedProjects) {
            completedProjects.textContent =
                data.completedProjects ?? 0;
        }

        if (totalTasks) {
            totalTasks.textContent =
                data.totalTasks ?? 0;
        }

        const table =
            document.getElementById(
                "projectsTable"
            );

        if (!table) {
            return;
        }

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

        projects.forEach(project => {
            const row =
                document.createElement(
                    "tr"
                );

            const statusClass =
                getProjectStatusClass(
                    project.project_status
                );

            row.innerHTML = `
                <td>
                    ${escapeHtml(
                        project.project_name ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        project.project_owner ||
                        "-"
                    )}
                </td>

                <td>
                    <span class="status ${statusClass}">
                        ${escapeHtml(
                            project.project_status ||
                            "Not Started"
                        )}
                    </span>
                </td>

                <td>
                    ${escapeHtml(
                        project.date_opened ||
                        "-"
                    )}
                </td>

                <td class="project-actions"></td>
            `;

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

            table.appendChild(row);
        });

    } catch (error) {
        console.error(
            "Dashboard error:",
            error
        );
    }
}


// ============================================================
// CREATE / UPDATE PROJECT
// ============================================================

if (projectForm) {

    projectForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            console.log("PROJECT FORM SUBMITTED");

            try {

                const developmentTeam =
                    collectDevelopmentTeam();


                const projectData = {

                    project_name:
                        getProjectValue(
                            "projectName"
                        ).trim(),

                    version:
                        getProjectValue(
                            "projectVersion"
                        ).trim() ||
                        null,

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

                    /*
                        Prepared for backend support.
                        Your current server may ignore this until
                        development_team storage is added.
                    */
                    development_team:
                        developmentTeam
                };


                if (!projectData.project_name) {

                    throw new Error(
                        "System/Application Name is required."
                    );
                }


                const isEditing =
                    editingProjectId !==
                    null;


                const url =
                    isEditing
                        ? `/api/projects/${encodeURIComponent(
                            editingProjectId
                        )}`
                        : "/api/projects";


                const method =
                    isEditing
                        ? "PUT"
                        : "POST";


                if (projectSubmitBtn) {

                    projectSubmitBtn.disabled =
                        true;

                    projectSubmitBtn.textContent =
                        isEditing
                            ? "Updating..."
                            : "Creating...";
                }


                const response =
                    await fetch(
                        url,
                        {
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


                const responseText =
                    await response.text();

                let result = {};

                try {
                    result = responseText
                        ? JSON.parse(responseText)
                        : {};
                } catch (parseError) {
                    throw new Error(
                        responseText ||
                        `Server returned ${response.status}.`
                    );
                }

                console.log(
                    "PROJECT SERVER RESPONSE:",
                    result
                );


                if (!response.ok) {

                    throw new Error(
                        result.error ||
                        result.membersError ||
                        result.details ||
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


            } finally {

                if (projectSubmitBtn) {

                    projectSubmitBtn.disabled =
                        false;

                    projectSubmitBtn.textContent =
                        editingProjectId
                            ? "Update Project"
                            : "Create Project";
                }
            }
        }
    );
}

// ============================================================
// LOAD NEXT PROJECT ID
// ============================================================

async function loadNextProjectId() {

    const projectIdInput =
        document.getElementById("projectId");

    if (!projectIdInput) {
        return;
    }

    projectIdInput.value = "Loading...";

    try {

        const response = await fetch(
            "/api/projects-next-id"
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                "Failed to generate project ID."
            );
        }

        projectIdInput.value =
            result.project_id;

    } catch (error) {

        console.error(
            "Load next project ID error:",
            error
        );

        projectIdInput.value = "";

        alert(
            "Unable to generate Project ID: " +
            error.message
        );
    }
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
                    method: "DELETE"
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

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadDashboard();

        ensureAtLeastOneTeamRow();

    }
);
