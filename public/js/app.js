// ============================================================
// PTS - DASHBOARD / PROJECTS
// ============================================================


// ============================================================
// STATE
// ============================================================

let editingProjectId = null;
let availableUsers = [];
let selectedProjectMembers = [];


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


function getUserById(userId) {
    return availableUsers.find(
        user => user.user_id === userId
    ) || null;
}


function getUserOptionText(user) {
    if (!user) {
        return "";
    }

    return user.role
        ? `${user.full_name} — ${user.role}`
        : user.full_name;
}


// ============================================================
// LOAD USERS
// ============================================================

async function loadProjectUsers() {
    try {
        const response = await fetch("/api/users");
        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                "Failed to load users."
            );
        }

        availableUsers = Array.isArray(result.users)
            ? result.users.filter(
                user => user.status === "Active"
            )
            : [];

        populateProjectOwnerSelect();
        refreshAllTeamMemberSelects();

    } catch (error) {
        console.error(
            "Load users error:",
            error
        );

        alert(
            "Unable to load users: " +
            error.message
        );
    }
}


// ============================================================
// PROJECT OWNER SELECT
// ============================================================

function populateProjectOwnerSelect(selectedUserId = "") {
    if (!projectOwner) {
        return;
    }

    const currentValue =
        selectedUserId ||
        projectOwner.value ||
        "";

    projectOwner.innerHTML = `
        <option value="">
            Select project owner
        </option>
    `;

    availableUsers.forEach(user => {
        const option =
            document.createElement("option");

        option.value =
            user.user_id;

        option.textContent =
            getUserOptionText(user);

        projectOwner.appendChild(option);
    });

    if (
        currentValue &&
        availableUsers.some(
            user =>
                user.user_id === currentValue
        )
    ) {
        projectOwner.value =
            currentValue;
    }
}


// ============================================================
// DEVELOPMENT TEAM ROWS
// ============================================================

function createTeamMemberRow(member = null) {
    const row =
        document.createElement("div");

    row.className =
        "team-member-row";

    row.innerHTML = `
        <select class="team-member-user">
            <option value="">
                Select team member
            </option>
        </select>

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

    const userSelect =
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

    populateSingleTeamSelect(
        userSelect,
        member?.user_id || ""
    );

    if (roleInput) {
        roleInput.value =
            member?.member_role || "";
    }

    if (userSelect) {
        userSelect.addEventListener(
            "change",
            () => {
                const user =
                    getUserById(
                        userSelect.value
                    );

                if (
                    user &&
                    roleInput &&
                    !roleInput.value.trim()
                ) {
                    roleInput.value =
                        user.role || "";
                }
            }
        );
    }

    if (removeButton) {
        removeButton.addEventListener(
            "click",
            () => {
                row.remove();

                ensureAtLeastOneTeamRow();
                refreshAllTeamMemberSelects();
            }
        );
    }

    return row;
}


function populateSingleTeamSelect(
    selectElement,
    selectedUserId = ""
) {
    if (!selectElement) {
        return;
    }

    selectElement.innerHTML = `
        <option value="">
            Select team member
        </option>
    `;

    availableUsers.forEach(user => {
        const option =
            document.createElement("option");

        option.value =
            user.user_id;

        option.textContent =
            getUserOptionText(user);

        selectElement.appendChild(
            option
        );
    });

    if (
        selectedUserId &&
        availableUsers.some(
            user =>
                user.user_id === selectedUserId
        )
    ) {
        selectElement.value =
            selectedUserId;
    }
}


function refreshAllTeamMemberSelects() {
    if (!developmentTeamContainer) {
        return;
    }

    developmentTeamContainer
        .querySelectorAll(
            ".team-member-name"
        )
        .forEach(select => {
            const currentValue =
                select.value;

            populateSingleTeamSelect(
                select,
                currentValue
            );
        });
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
    const seenUsers = new Set();

    const rows =
        developmentTeamContainer.querySelectorAll(
            ".team-member-row"
        );

    for (const row of rows) {
        const userSelect =
            row.querySelector(
                ".team-member-name"
            );

        const roleInput =
            row.querySelector(
                ".team-member-role"
            );

        const userId =
            userSelect?.value || "";

        const role =
            roleInput?.value.trim() || "";

        // Ignore completely empty rows.
        if (!userId && !role) {
            continue;
        }

        if (!userId) {
            throw new Error(
                "Please select a user for every development team row."
            );
        }

        if (seenUsers.has(userId)) {
            const duplicateUser =
                getUserById(userId);

            throw new Error(
                `${duplicateUser?.full_name || "This user"} is listed more than once in the development team.`
            );
        }

        seenUsers.add(userId);

        const user =
            getUserById(userId);

        members.push({
            user_id:
                userId,

            full_name:
                user?.full_name || "",

            member_role:
                role ||
                user?.role ||
                "Team Member"
        });
    }

    return members;
}


// ============================================================
// PROJECT MEMBER API
// ============================================================

async function getProjectMembers(projectId) {
    const response = await fetch(
        `/api/projects/${encodeURIComponent(
            projectId
        )}/members`
    );

    const result =
        await response.json();

    if (!response.ok) {
        throw new Error(
            result.error ||
            "Failed to load project members."
        );
    }

    return Array.isArray(result.members)
        ? result.members
        : [];
}


async function addProjectMember(
    projectId,
    userId,
    memberRole
) {
    const response = await fetch(
        `/api/projects/${encodeURIComponent(
            projectId
        )}/members`,
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({
                user_id:
                    userId,

                member_role:
                    memberRole
            })
        }
    );

    const result =
        await response.json();

    if (!response.ok) {
        throw new Error(
            result.error ||
            "Failed to add project member."
        );
    }

    return result.member;
}


async function updateProjectMemberRole(
    memberId,
    memberRole
) {
    const response = await fetch(
        `/api/project-members/${encodeURIComponent(
            memberId
        )}`,
        {
            method: "PUT",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({
                member_role:
                    memberRole
            })
        }
    );

    const result =
        await response.json();

    if (!response.ok) {
        throw new Error(
            result.error ||
            "Failed to update project member."
        );
    }

    return result.member;
}


async function removeProjectMember(
    memberId
) {
    const response = await fetch(
        `/api/project-members/${encodeURIComponent(
            memberId
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
            "Failed to remove project member."
        );
    }
}


async function saveNewProjectMembers(
    projectId,
    ownerUserId,
    teamMembers
) {
    if (ownerUserId) {
        await addProjectMember(
            projectId,
            ownerUserId,
            "Project Owner"
        );
    }

    for (const member of teamMembers) {
        // Do not add the owner twice.
        if (
            member.user_id ===
            ownerUserId
        ) {
            continue;
        }

        await addProjectMember(
            projectId,
            member.user_id,
            member.member_role
        );
    }
}


async function syncProjectMembers(
    projectId,
    ownerUserId,
    teamMembers
) {
    const existingMembers =
        await getProjectMembers(
            projectId
        );

    const desiredMembers =
        new Map();

    if (ownerUserId) {
        desiredMembers.set(
            ownerUserId,
            {
                user_id:
                    ownerUserId,

                member_role:
                    "Project Owner"
            }
        );
    }

    teamMembers.forEach(member => {
        if (
            member.user_id ===
            ownerUserId
        ) {
            return;
        }

        desiredMembers.set(
            member.user_id,
            {
                user_id:
                    member.user_id,

                member_role:
                    member.member_role
            }
        );
    });

    const existingByUser =
        new Map();

    existingMembers.forEach(member => {
        existingByUser.set(
            member.user_id,
            member
        );
    });

    // Add new members or update roles.
    for (
        const [
            userId,
            desired
        ]
        of desiredMembers.entries()
    ) {
        const existing =
            existingByUser.get(
                userId
            );

        if (!existing) {
            await addProjectMember(
                projectId,
                userId,
                desired.member_role
            );

            continue;
        }

        if (
            (existing.member_role || "") !==
            (desired.member_role || "")
        ) {
            await updateProjectMemberRole(
                existing.project_member_id,
                desired.member_role
            );
        }
    }

    // Remove members no longer selected.
    for (const existing of existingMembers) {
        if (
            !desiredMembers.has(
                existing.user_id
            )
        ) {
            await removeProjectMember(
                existing.project_member_id
            );
        }
    }
}


// ============================================================
// RESET PROJECT MODAL
// ============================================================

function resetProjectModal() {
    editingProjectId = null;
    selectedProjectMembers = [];

    if (projectForm) {
        projectForm.reset();
    }

    setProjectValue(
        "projectStatus",
        "Not Started"
    );

    populateProjectOwnerSelect("");

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
            try {
                await loadProjectUsers();

                resetProjectModal();

                if (projectModal) {
                    projectModal.classList.add(
                        "show"
                    );
                }

            } catch (error) {
                console.error(
                    "Open project modal error:",
                    error
                );
            }
        }
    );
}


// ============================================================
// OPEN EDIT PROJECT MODAL
// ============================================================

async function openEditProjectModal(
    project
) {
    try {
        await loadProjectUsers();

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

        const members =
            await getProjectMembers(
                project.project_id
            );

        let ownerMember =
            members.find(
                member =>
                    String(
                        member.member_role ||
                        ""
                    ).toLowerCase() ===
                    "project owner"
            );

        // Fallback for older projects that only have project_owner text.
        if (
            !ownerMember &&
            project.project_owner
        ) {
            const matchingUser =
                availableUsers.find(
                    user =>
                        user.full_name ===
                        project.project_owner
                );

            if (matchingUser) {
                ownerMember = {
                    user_id:
                        matchingUser.user_id,

                    users:
                        matchingUser,

                    member_role:
                        "Project Owner"
                };
            }
        }

        populateProjectOwnerSelect(
            ownerMember?.user_id || ""
        );

        clearDevelopmentTeamRows();

        const teamMembers =
            members.filter(
                member =>
                    member.user_id !==
                    ownerMember?.user_id
            );

        selectedProjectMembers =
            teamMembers.map(
                member => ({
                    project_member_id:
                        member.project_member_id,

                    user_id:
                        member.user_id,

                    full_name:
                        member.users?.full_name ||
                        getUserById(
                            member.user_id
                        )?.full_name ||
                        "",

                    member_role:
                        member.member_role ||
                        member.users?.role ||
                        "Team Member"
                })
            );

        if (
            selectedProjectMembers.length ===
            0
        ) {
            addTeamMemberRow();
        } else {
            selectedProjectMembers.forEach(
                member => {
                    addTeamMemberRow(
                        member
                    );
                }
            );
        }

        if (projectModal) {
            projectModal.classList.add(
                "show"
            );
        }

    } catch (error) {
        console.error(
            "Open edit project error:",
            error
        );

        alert(
            "Unable to load project members: " +
            error.message
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

            try {
                const selectedOwnerId =
                    getProjectValue(
                        "projectOwner"
                    );

                const selectedOwner =
                    getUserById(
                        selectedOwnerId
                    );

                const teamMembers =
                    collectDevelopmentTeam();

                if (!selectedOwnerId) {
                    throw new Error(
                        "Please select a project owner."
                    );
                }

                if (
                    teamMembers.some(
                        member =>
                            member.user_id ===
                            selectedOwnerId
                    )
                ) {
                    throw new Error(
                        "The Project Owner does not need to be added again in the Development Team."
                    );
                }

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

                    // Keep the current text column for the dashboard.
                    project_owner:
                        selectedOwner
                            ? selectedOwner.full_name
                            : null,

                    project_status:
                        getProjectValue(
                            "projectStatus"
                        ) ||
                        "Not Started",

                    date_opened:
                        getProjectValue(
                            "dateOpened"
                        ) ||
                        null
                };

                if (
                    !projectData.project_name
                ) {
                    throw new Error(
                        "Project name is required."
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

                const savedProject =
                    result.project;

                const savedProjectId =
                    savedProject?.project_id ||
                    editingProjectId;

                if (!savedProjectId) {
                    throw new Error(
                        "Project was saved, but its Project ID was not returned."
                    );
                }

                if (isEditing) {
                    await syncProjectMembers(
                        savedProjectId,
                        selectedOwnerId,
                        teamMembers
                    );
                } else {
                    await saveNewProjectMembers(
                        savedProjectId,
                        selectedOwnerId,
                        teamMembers
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
    async () => {
        await Promise.all([
            loadDashboard(),
            loadProjectUsers()
        ]);

        ensureAtLeastOneTeamRow();
    }
);
