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

const uploadProjectFileBtn =
    document.getElementById("uploadProjectFileBtn");

const uploadProjectFolderBtn =
    document.getElementById("uploadProjectFolderBtn");

const projectFileInput =
    document.getElementById("projectFileInput");

const projectFolderInput =
    document.getElementById("projectFolderInput");

const projectUploadSelectionStatus =
    document.getElementById("projectUploadSelectionStatus");


const repositoryFilesModal =
    document.getElementById("repositoryFilesModal");

const repositoryFilesModalTitle =
    document.getElementById("repositoryFilesModalTitle");

const closeRepositoryFilesModalBtn =
    document.getElementById("closeRepositoryFilesModal");

const repositoryFilesList =
    document.getElementById("repositoryFilesList");

const refreshRepositoryFilesBtn =
    document.getElementById("refreshRepositoryFilesBtn");

const repositoryUploadFilesBtn =
    document.getElementById("repositoryUploadFilesBtn");

const repositoryUploadFolderBtn =
    document.getElementById("repositoryUploadFolderBtn");

const openRepositoryDriveBtn =
    document.getElementById("openRepositoryDriveBtn");

const repositoryUploadProgress =
    document.getElementById("repositoryUploadProgress");

let currentRepositoryProject =
    null;

let pendingProjectFileUploads = [];
let pendingProjectFolderUploads = [];



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
// PROJECT REPOSITORY FILE / FOLDER UPLOAD
// ============================================================

function updateProjectUploadSelectionStatus() {

    if (!projectUploadSelectionStatus) {
        return;
    }

    const fileCount =
        pendingProjectFileUploads.length;

    const folderFileCount =
        pendingProjectFolderUploads.length;

    if (
        fileCount === 0 &&
        folderFileCount === 0
    ) {
        projectUploadSelectionStatus.textContent =
            editingProjectId
                ? "Choose files or folders to upload to Project Repository."
                : "No files or folders selected.";
        return;
    }

    const parts = [];

    if (fileCount > 0) {
        parts.push(
            `${fileCount} file${fileCount === 1 ? "" : "s"} selected`
        );
    }

    if (folderFileCount > 0) {
        parts.push(
            `${folderFileCount} folder file${folderFileCount === 1 ? "" : "s"} selected`
        );
    }

    projectUploadSelectionStatus.textContent =
        parts.join(" • ");
}


function resetPendingProjectUploads() {

    pendingProjectFileUploads = [];
    pendingProjectFolderUploads = [];

    if (projectFileInput) {
        projectFileInput.value = "";
    }

    if (projectFolderInput) {
        projectFolderInput.value = "";
    }

    updateProjectUploadSelectionStatus();
}


async function uploadFileToProjectRepository(
    projectId,
    file,
    relativePath = ""
) {

    if (!projectId) {
        throw new Error(
            "Project ID is required for upload."
        );
    }

    if (!file) {
        throw new Error(
            "A file is required for upload."
        );
    }

    const response =
        await fetch(
            `/api/projects/${encodeURIComponent(projectId)}/repository/upload`,
            {
                method: "POST",

                headers: {
                    // Always use octet-stream so the global express.json()
                    // middleware does not consume JSON files before raw upload.
                    "Content-Type":
                        "application/octet-stream",

                    "X-File-Name":
                        encodeURIComponent(
                            file.name
                        ),

                    "X-File-Mime-Type":
                        encodeURIComponent(
                            file.type ||
                            "application/octet-stream"
                        ),

                    "X-Relative-Path":
                        encodeURIComponent(
                            relativePath ||
                            ""
                        )
                },

                body:
                    file
            }
        );

    const result =
        await response.json();

    if (!response.ok) {
        throw new Error(
            result.error ||
            result.details ||
            `Failed to upload ${file.name}.`
        );
    }

    return result;
}


async function uploadQueuedProjectContent(
    projectId
) {

    const uploads = [];

    pendingProjectFileUploads.forEach(
        file => {
            uploads.push({
                file,
                relativePath: ""
            });
        }
    );

    pendingProjectFolderUploads.forEach(
        file => {

            const relativeFilePath =
                file.webkitRelativePath ||
                "";

            const parts =
                relativeFilePath
                    .split("/")
                    .filter(Boolean);

            // Keep the selected root folder in Drive.
            // Remove only the filename from the relative path.
            parts.pop();

            uploads.push({
                file,
                relativePath:
                    parts.join("/")
            });
        }
    );

    if (uploads.length === 0) {
        return;
    }

    const total =
        uploads.length;

    for (
        let index = 0;
        index < uploads.length;
        index += 1
    ) {

        const item =
            uploads[index];

        if (projectUploadSelectionStatus) {
            projectUploadSelectionStatus.textContent =
                `Uploading ${index + 1} of ${total}: ${item.file.name}`;
        }

        await uploadFileToProjectRepository(
            projectId,
            item.file,
            item.relativePath
        );
    }

    if (projectUploadSelectionStatus) {
        projectUploadSelectionStatus.textContent =
            `${total} upload${total === 1 ? "" : "s"} completed.`;
    }
}


async function uploadSelectedContentForExistingProject() {

    if (!editingProjectId) {
        return;
    }

    const hasUploads =
        pendingProjectFileUploads.length > 0 ||
        pendingProjectFolderUploads.length > 0;

    if (!hasUploads) {
        return;
    }

    await uploadQueuedProjectContent(
        editingProjectId
    );

    resetPendingProjectUploads();

    if (
        currentRepositoryProject?.project_id ===
        editingProjectId
    ) {
        await loadRepositoryFiles();
    }
}


if (
    uploadProjectFileBtn &&
    projectFileInput
) {

    uploadProjectFileBtn.addEventListener(
        "click",
        () => {
            projectFileInput.click();
        }
    );

    projectFileInput.addEventListener(
        "change",
        async () => {

            pendingProjectFileUploads =
                Array.from(
                    projectFileInput.files ||
                    []
                );

            updateProjectUploadSelectionStatus();

            // For an existing project, upload immediately.
            if (editingProjectId) {

                try {

                    await uploadSelectedContentForExistingProject();

                    alert(
                        "File uploaded to Project Repository successfully!"
                    );

                } catch (error) {

                    console.error(
                        "Project file upload error:",
                        error
                    );

                    alert(
                        "Upload failed: " +
                        error.message
                    );
                }
            }
        }
    );
}


if (
    uploadProjectFolderBtn &&
    projectFolderInput
) {

    uploadProjectFolderBtn.addEventListener(
        "click",
        () => {
            projectFolderInput.click();
        }
    );

    projectFolderInput.addEventListener(
        "change",
        async () => {

            pendingProjectFolderUploads =
                Array.from(
                    projectFolderInput.files ||
                    []
                );

            updateProjectUploadSelectionStatus();

            // For an existing project, upload immediately.
            if (editingProjectId) {

                try {

                    await uploadSelectedContentForExistingProject();

                    alert(
                        "Folder uploaded to Project Repository successfully!"
                    );

                } catch (error) {

                    console.error(
                        "Project folder upload error:",
                        error
                    );

                    alert(
                        "Folder upload failed: " +
                        error.message
                    );
                }
            }
        }
    );
}



// ============================================================
// REPOSITORY FILE VIEWER
// ============================================================

function formatRepositoryFileSize(bytes) {

    if (
        bytes === null ||
        bytes === undefined ||
        Number.isNaN(Number(bytes))
    ) {
        return "";
    }

    const size =
        Number(bytes);

    if (size < 1024) {
        return `${size} B`;
    }

    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`;
    }

    if (size < 1024 * 1024 * 1024) {
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}


function renderRepositoryFiles(items) {

    if (!repositoryFilesList) {
        return;
    }

    const files =
        Array.isArray(items)
            ? items
            : [];

    if (files.length === 0) {

        repositoryFilesList.innerHTML = `
            <div class="repository-empty">
                No uploaded files or folders yet.
            </div>
        `;

        return;
    }

    repositoryFilesList.innerHTML =
        files.map(item => {

            const depth =
                Math.max(
                    0,
                    String(
                        item.relative_path ||
                        item.name ||
                        ""
                    ).split("/").length - 1
                );

            const icon =
                item.is_folder
                    ? "📁"
                    : "📄";

            const sizeText =
                item.is_folder
                    ? ""
                    : formatRepositoryFileSize(
                        item.size
                    );

            const modified =
                item.modified_time
                    ? new Date(
                        item.modified_time
                    ).toLocaleString()
                    : "";

            const safeUrl =
                item.url
                    ? escapeHtml(item.url)
                    : "";

            return `
                <div
                    class="repository-file-row"
                    style="--repository-depth:${depth}"
                >
                    <div class="repository-file-main">
                        <span class="repository-file-icon">
                            ${icon}
                        </span>

                        <div class="repository-file-info">
                            <div class="repository-file-name">
                                ${escapeHtml(item.name || "-")}
                            </div>

                            <div class="repository-file-path">
                                ${escapeHtml(item.relative_path || item.name || "")}
                            </div>
                        </div>
                    </div>

                    <div class="repository-file-meta">
                        <span>
                            ${escapeHtml(sizeText)}
                        </span>

                        <span>
                            ${escapeHtml(modified)}
                        </span>

                        ${
                            safeUrl
                                ? `
                                    <a
                                        class="repository-file-open"
                                        href="${safeUrl}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Open
                                    </a>
                                `
                                : ""
                        }
                    </div>
                </div>
            `;
        }).join("");
}


async function loadRepositoryFiles() {

    if (
        !currentRepositoryProject?.project_id
    ) {
        return;
    }

    if (repositoryFilesList) {
        repositoryFilesList.innerHTML = `
            <div class="repository-empty">
                Loading repository files...
            </div>
        `;
    }

    try {

        const response =
            await fetch(
                `/api/projects/${encodeURIComponent(
                    currentRepositoryProject.project_id
                )}/repository/files`
            );

        const result =
            await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                result.details ||
                "Failed to load repository files."
            );
        }

        currentRepositoryProject = {
            ...currentRepositoryProject,
            ...result.project
        };

        renderRepositoryFiles(
            result.items
        );

    } catch (error) {

        console.error(
            "Load repository files error:",
            error
        );

        if (repositoryFilesList) {
            repositoryFilesList.innerHTML = `
                <div class="repository-empty repository-error">
                    ${escapeHtml(error.message)}
                </div>
            `;
        }
    }
}


async function openRepositoryFilesModal(
    project
) {

    currentRepositoryProject =
        project;

    editingProjectId =
        project.project_id;

    resetPendingProjectUploads();

    if (repositoryFilesModalTitle) {
        repositoryFilesModalTitle.textContent =
            `${project.project_id} - Project Repository`;
    }

    if (repositoryUploadProgress) {
        repositoryUploadProgress.textContent =
            "";
    }

    if (repositoryFilesModal) {
        repositoryFilesModal.classList.add(
            "show"
        );
    }

    await loadRepositoryFiles();
}


function closeRepositoryFilesModal() {

    if (repositoryFilesModal) {
        repositoryFilesModal.classList.remove(
            "show"
        );
    }

    currentRepositoryProject =
        null;

    if (repositoryUploadProgress) {
        repositoryUploadProgress.textContent =
            "";
    }

    // Do not clear editingProjectId here when the main project
    // edit modal may still need it.
}


if (closeRepositoryFilesModalBtn) {
    closeRepositoryFilesModalBtn.addEventListener(
        "click",
        closeRepositoryFilesModal
    );
}


if (repositoryFilesModal) {
    repositoryFilesModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                repositoryFilesModal
            ) {
                closeRepositoryFilesModal();
            }
        }
    );
}


if (refreshRepositoryFilesBtn) {
    refreshRepositoryFilesBtn.addEventListener(
        "click",
        loadRepositoryFiles
    );
}


if (repositoryUploadFilesBtn) {
    repositoryUploadFilesBtn.addEventListener(
        "click",
        () => {

            if (
                !currentRepositoryProject?.project_id
            ) {
                return;
            }

            editingProjectId =
                currentRepositoryProject.project_id;

            if (projectFileInput) {
                projectFileInput.click();
            }
        }
    );
}


if (repositoryUploadFolderBtn) {
    repositoryUploadFolderBtn.addEventListener(
        "click",
        () => {

            if (
                !currentRepositoryProject?.project_id
            ) {
                return;
            }

            editingProjectId =
                currentRepositoryProject.project_id;

            if (projectFolderInput) {
                projectFolderInput.click();
            }
        }
    );
}


if (openRepositoryDriveBtn) {
    openRepositoryDriveBtn.addEventListener(
        "click",
        () => {

            const url =
                currentRepositoryProject?.repository_folder_url ||
                currentRepositoryProject?.project_url;

            if (!url) {
                alert(
                    "Project Repository URL is not available."
                );
                return;
            }

            window.open(
                url,
                "_blank",
                "noopener,noreferrer"
            );
        }
    );
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
        setProjectValue("projectVersion", "v1.0");
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

            resetProjectModal();

            // Default version for a newly created project
            setProjectValue("projectVersion", "v1.0");

            // Generate next Project ID
            await loadNextProjectId();

            if (projectModal) {
                projectModal.classList.add("show");
            }

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

    updateProjectUploadSelectionStatus();


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
                class="project-action-item view-repository-files-action"
            >
                <span class="project-action-icon">
                    ☰
                </span>

                <span>
                    Repository Files
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
                    Project Repository
                </span>
            </button>

            <button
                type="button"
                class="project-action-item upload-project-file-action"
            >
                <span class="project-action-icon">
                    ↑
                </span>

                <span>
                    Upload File
                </span>
            </button>

            <button
                type="button"
                class="project-action-item upload-project-folder-action"
            >
                <span class="project-action-icon">
                    ▣
                </span>

                <span>
                    Upload Folder
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

    const viewRepositoryFilesAction =
        wrapper.querySelector(
            ".view-repository-files-action"
        );

    if (viewRepositoryFilesAction) {
        viewRepositoryFilesAction.addEventListener(
            "click",
            async event => {
                event.stopPropagation();

                closeAllProjectActionMenus();

                await openRepositoryFilesModal(
                    project
                );
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

                const repositoryUrl =
                    project.repository_folder_url ||
                    project.drive_folder_url ||
                    project.project_url;

                if (!repositoryUrl) {
                    alert(
                        "No Project Repository folder is available for this project."
                    );

                    return;
                }

                try {
                    const url =
                        new URL(
                            repositoryUrl
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
                        "The Project Repository link is invalid."
                    );
                }
            }
        );
    }

    const uploadFileAction =
        wrapper.querySelector(
            ".upload-project-file-action"
        );

    if (uploadFileAction) {
        uploadFileAction.addEventListener(
            "click",
            event => {
                event.stopPropagation();
                closeAllProjectActionMenus();

                editingProjectId =
                    project.project_id;

                resetPendingProjectUploads();

                if (projectFileInput) {
                    projectFileInput.click();
                }
            }
        );
    }


    const uploadFolderAction =
        wrapper.querySelector(
            ".upload-project-folder-action"
        );

    if (uploadFolderAction) {
        uploadFolderAction.addEventListener(
            "click",
            event => {
                event.stopPropagation();
                closeAllProjectActionMenus();

                editingProjectId =
                    project.project_id;

                resetPendingProjectUploads();

                if (projectFolderInput) {
                    projectFolderInput.click();
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
        const response = await fetch("/api/dashboard");
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to load dashboard data.");
        }

        const totalProjects = document.getElementById("totalProjects");
        const activeProjects = document.getElementById("activeProjects");
        const completedProjects = document.getElementById("completedProjects");
        const totalTasks = document.getElementById("totalTasks");

        if (totalProjects) totalProjects.textContent = data.totalProjects ?? 0;
        if (activeProjects) activeProjects.textContent = data.activeProjects ?? 0;
        if (completedProjects) completedProjects.textContent = data.completedProjects ?? 0;
        if (totalTasks) totalTasks.textContent = data.totalTasks ?? 0;

        const table = document.getElementById("projectsTable");
        if (!table) return;

        table.innerHTML = "";
        const projects = Array.isArray(data.projects) ? data.projects : [];

        if (projects.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="7">No projects found.</td>
                </tr>
            `;
            return;
        }

        projects.forEach(project => {
            const row = document.createElement("tr");
            const statusClass = getProjectStatusClass(project.project_status);

            const team = Array.isArray(project.development_team)
                ? project.development_team
                : [];

            const teamText = team.length
                ? team.map(member => {
                    const name = member.member_name || "";
                    const role = member.member_role || "";
                    return role ? `${name} (${role})` : name;
                }).filter(Boolean).join(", ")
                : "-";

            // IMPORTANT: this cell order must exactly match index.html <thead>.
            row.innerHTML = `
                <td>${escapeHtml(project.project_id || "-")}</td>
                <td>${escapeHtml(project.project_name || "-")}</td>
                <td>${escapeHtml(teamText)}</td>
                <td>${escapeHtml(project.version || "-")}</td>
                <td>
                    <span class="status ${statusClass}">
                        ${escapeHtml(project.project_status || "Not Started")}
                    </span>
                </td>
                <td>${escapeHtml(project.date_opened || "-")}</td>
                <td class="project-actions"></td>
            `;

            const actionsCell = row.querySelector(".project-actions");
            if (actionsCell) {
                actionsCell.appendChild(createProjectActionMenu(project));
            }

            table.appendChild(row);
        });

    } catch (error) {
        console.error("Dashboard error:", error);
    }
}


// ============================================================
// CREATE / UPDATE PROJECT
// ============================================================

let isSavingProject = false;


async function saveProject() {

    if (isSavingProject) {
        return;
    }


    console.log("SAVE PROJECT STARTED");


    try {

        isSavingProject = true;


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

            development_team:
                developmentTeam
        };


        /*
            These fields still exist in the database, but they are
            optional in the newest modal. Only send them when the
            corresponding input exists.
        */

        const projectOwnerElement =
            getProjectElement(
                "projectOwner"
            );


        if (projectOwnerElement) {

            projectData.project_owner =
                projectOwnerElement.value.trim() ||
                null;
        }


        console.log(
            "PROJECT PAYLOAD:",
            projectData
        );


        if (!projectData.project_name) {

            throw new Error(
                "System/Application Name is required."
            );
        }


        const isEditing =
            editingProjectId !== null;


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


        console.log(
            "PROJECT REQUEST:",
            method,
            url
        );


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


        console.log(
            "PROJECT RAW RESPONSE:",
            response.status,
            responseText
        );


        let result = {};


        if (responseText) {

            try {

                result =
                    JSON.parse(
                        responseText
                    );

            } catch (error) {

                throw new Error(
                    `Server returned an invalid response (${response.status}): ${responseText}`
                );
            }
        }


        if (!response.ok) {

            throw new Error(
                result.error ||
                result.details ||
                result.membersError ||
                `Server returned ${response.status}.`
            );
        }


        const savedProjectId =
            result.project?.project_id ||
            editingProjectId;

        if (
            !isEditing &&
            savedProjectId &&
            (
                pendingProjectFileUploads.length > 0 ||
                pendingProjectFolderUploads.length > 0
            )
        ) {

            if (projectSubmitBtn) {
                projectSubmitBtn.textContent =
                    "Uploading Repository...";
            }

            await uploadQueuedProjectContent(
                savedProjectId
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
            "SAVE PROJECT ERROR:",
            error
        );


        alert(
            "Error creating project: " +
            error.message
        );


    } finally {

        isSavingProject = false;


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


// ============================================================
// FORM SUBMIT
// ============================================================

if (projectForm) {

    projectForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            await saveProject();

        }
    );
}


// ============================================================
// DIRECT CREATE / UPDATE BUTTON CLICK
// ============================================================
//
// This also makes the button work if a future HTML edit
// accidentally places it outside the <form> element.
// ============================================================

if (projectSubmitBtn) {

    projectSubmitBtn.addEventListener(
        "click",
        async event => {

            event.preventDefault();

            await saveProject();

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
// INITIAL LOAD
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadDashboard();

        ensureAtLeastOneTeamRow();

        updateProjectUploadSelectionStatus();

    }
);
