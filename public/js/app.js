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

        const memberName =
            nameInput?.value.trim() || "";

        if (!memberName) {
            continue;
        }

        members.push({
            member_name:
                memberName
        });
    }

    return members;
}

// ============================================================
// PROJECT REPOSITORY FILE / FOLDER UPLOAD
// ============================================================

function getProjectQueuedUploads() {

    const items = [];

    pendingProjectFileUploads.forEach(
        (file, index) => {
            items.push({
                type:
                    "file",

                index:
                    index,

                file:
                    file,

                displayName:
                    file.name,

                displayPath:
                    file.name
            });
        }
    );

    pendingProjectFolderUploads.forEach(
        (file, index) => {

            const path =
                file.webkitRelativePath ||
                file.name;

            items.push({
                type:
                    "folder",

                index:
                    index,

                file:
                    file,

                displayName:
                    file.name,

                displayPath:
                    path
            });
        }
    );

    return items;
}


function updateProjectUploadSelectionStatus() {

    if (!projectUploadSelectionStatus) {
        return;
    }

    const items =
        getProjectQueuedUploads();

    if (items.length === 0) {

        projectUploadSelectionStatus.innerHTML = `
            <div class="project-upload-empty">
                ${
                    editingProjectId
                        ? "Choose files or folders to upload to Project Repository."
                        : "No files or folders selected."
                }
            </div>
        `;

        return;
    }

    const attachmentHtml =
        items.map(item => {

            const sizeText =
                formatRepositoryFileSize(
                    item.file?.size
                );

            const typeLabel =
                item.type === "folder"
                    ? "Folder item"
                    : "File";

            return `
                <div
                    class="project-upload-attachment"
                    data-upload-type="${escapeHtml(item.type)}"
                    data-upload-index="${item.index}"
                >
                    <div class="project-upload-attachment-icon">
                        ${item.type === "folder" ? "📁" : "📄"}
                    </div>

                    <div class="project-upload-attachment-info">
                        <div class="project-upload-attachment-name">
                            ${escapeHtml(item.displayName || "Unnamed file")}
                        </div>

                        <div class="project-upload-attachment-meta">
                            <span>
                                ${escapeHtml(typeLabel)}
                            </span>

                            ${
                                sizeText
                                    ? `
                                        <span>
                                            ${escapeHtml(sizeText)}
                                        </span>
                                    `
                                    : ""
                            }

                            ${
                                item.displayPath &&
                                item.displayPath !== item.displayName
                                    ? `
                                        <span class="project-upload-attachment-path">
                                            ${escapeHtml(item.displayPath)}
                                        </span>
                                    `
                                    : ""
                            }
                        </div>
                    </div>

                    <button
                        type="button"
                        class="project-upload-remove"
                        data-remove-upload-type="${escapeHtml(item.type)}"
                        data-remove-upload-index="${item.index}"
                        aria-label="Remove ${escapeHtml(item.displayName || "file")}"
                        title="Remove"
                    >
                        &times;
                    </button>
                </div>
            `;
        }).join("");

    projectUploadSelectionStatus.innerHTML = `
        <div class="project-upload-summary">
            ${items.length}
            attachment${items.length === 1 ? "" : "s"} selected
        </div>

        <div class="project-upload-attachments">
            ${attachmentHtml}
        </div>
    `;

    projectUploadSelectionStatus
        .querySelectorAll(
            ".project-upload-remove"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();
                    event.stopPropagation();

                    const type =
                        button.dataset.removeUploadType;

                    const index =
                        Number.parseInt(
                            button.dataset.removeUploadIndex,
                            10
                        );

                    if (
                        !Number.isInteger(index) ||
                        index < 0
                    ) {
                        return;
                    }

                    if (type === "folder") {

                        pendingProjectFolderUploads.splice(
                            index,
                            1
                        );

                    } else {

                        pendingProjectFileUploads.splice(
                            index,
                            1
                        );
                    }

                    updateProjectUploadSelectionStatus();
                }
            );
        });
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


function makeQueuedFileKey(
    file,
    relativePath = ""
) {

    return [
        relativePath || "",
        file?.name || "",
        file?.size ?? "",
        file?.lastModified ?? ""
    ].join("::");
}


function appendUniqueQueuedFiles(
    targetArray,
    newFiles,
    useRelativePath = false
) {

    const existingKeys =
        new Set(
            targetArray.map(file => {

                const relativePath =
                    useRelativePath
                        ? (
                            file.webkitRelativePath ||
                            file.name ||
                            ""
                        )
                        : "";

                return makeQueuedFileKey(
                    file,
                    relativePath
                );
            })
        );

    Array.from(newFiles || [])
        .forEach(file => {

            const relativePath =
                useRelativePath
                    ? (
                        file.webkitRelativePath ||
                        file.name ||
                        ""
                    )
                    : "";

            const key =
                makeQueuedFileKey(
                    file,
                    relativePath
                );

            if (!existingKeys.has(key)) {

                targetArray.push(file);
                existingKeys.add(key);
            }
        });
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

        if (repositoryUploadProgress) {

            repositoryUploadProgress.textContent =
                `Uploading ${index + 1} of ${total}: ${item.file.name}`;

        } else if (projectUploadSelectionStatus) {

            const summary =
                projectUploadSelectionStatus.querySelector(
                    ".project-upload-summary"
                );

            if (summary) {
                summary.textContent =
                    `Uploading ${index + 1} of ${total}: ${item.file.name}`;
            }
        }

        await uploadFileToProjectRepository(
            projectId,
            item.file,
            item.relativePath
        );
    }

    if (repositoryUploadProgress) {
        repositoryUploadProgress.textContent =
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


if (projectFileInput) {

    projectFileInput.addEventListener(
        "change",
        async () => {

            const selectedFiles =
                Array.from(
                    projectFileInput.files ||
                    []
                );

            if (
                !editingProjectId ||
                selectedFiles.length === 0
            ) {
                projectFileInput.value = "";
                return;
            }

            try {

                pendingProjectFileUploads = [];
                pendingProjectFolderUploads = [];

                appendUniqueQueuedFiles(
                    pendingProjectFileUploads,
                    selectedFiles,
                    false
                );

                projectFileInput.value = "";

                await uploadSelectedContentForExistingProject();

                alert(
                    `${selectedFiles.length} file${selectedFiles.length === 1 ? "" : "s"} uploaded successfully!`
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

                projectFileInput.value = "";
            }
        }
    );
}


if (projectFolderInput) {

    projectFolderInput.addEventListener(
        "change",
        async () => {

            const selectedFolderFiles =
                Array.from(
                    projectFolderInput.files ||
                    []
                );

            if (
                !editingProjectId ||
                selectedFolderFiles.length === 0
            ) {
                projectFolderInput.value = "";
                return;
            }

            try {

                pendingProjectFileUploads = [];
                pendingProjectFolderUploads = [];

                appendUniqueQueuedFiles(
                    pendingProjectFolderUploads,
                    selectedFolderFiles,
                    true
                );

                projectFolderInput.value = "";

                await uploadSelectedContentForExistingProject();

                alert(
                    `Folder uploaded successfully (${selectedFolderFiles.length} file${selectedFolderFiles.length === 1 ? "" : "s"}).`
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

                projectFolderInput.value = "";
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


const expandedProjectRepositoryFolders = new Set();

function normalizeProjectRepositoryPath(value) {
    return String(value || "")
        .replace(/\\/g, "/")
        .replace(/^\/+|\/+$/g, "");
}

function renderRepositoryFiles(items) {

    if (!repositoryFilesList) {
        return;
    }

    const files = Array.isArray(items) ? items : [];

    if (files.length === 0) {
        repositoryFilesList.innerHTML = `
            <div class="repository-empty">
                No uploaded files or folders yet.
            </div>
        `;
        return;
    }

    function isRepositoryItemVisible(path) {

        const parts =
            normalizeProjectRepositoryPath(path)
                .split("/")
                .filter(Boolean);

        if (parts.length <= 1) {
            return true;
        }

        let ancestor = "";

        for (
            let index = 0;
            index < parts.length - 1;
            index += 1
        ) {
            ancestor = ancestor
                ? `${ancestor}/${parts[index]}`
                : parts[index];

            if (
                !expandedProjectRepositoryFolders.has(
                    ancestor
                )
            ) {
                return false;
            }
        }

        return true;
    }

    repositoryFilesList.innerHTML = files
        .map(item => {

            const path =
                normalizeProjectRepositoryPath(
                    item.relative_path ||
                    item.name ||
                    ""
                );

            const depth = Math.max(
                0,
                path.split("/").filter(Boolean).length - 1
            );

            const isFolder =
                Boolean(item.is_folder);

            const isExpanded =
                isFolder &&
                expandedProjectRepositoryFolders.has(path);

            const isVisible =
                isRepositoryItemVisible(path);

            const icon = isFolder
                ? (isExpanded ? "📂" : "📁")
                : "📄";

            const sizeText = isFolder
                ? ""
                : formatRepositoryFileSize(item.size);

            const modified = item.modified_time
                ? new Date(item.modified_time).toLocaleString()
                : "";

            const safeUrl = item.url
                ? escapeHtml(item.url)
                : "";

            const actionTitle = isFolder
                ? (isExpanded ? "Collapse folder" : "Expand folder")
                : (safeUrl ? "Open file in Google Drive" : "");

            return `
                <div
                    class="repository-file-row${isFolder ? " repository-folder-row" : " repository-clickable-file"}"
                    data-repository-path="${escapeHtml(path)}"
                    data-repository-folder="${isFolder ? "true" : "false"}"
                    data-repository-url="${safeUrl}"
                    role="button"
                    tabindex="0"
                    title="${escapeHtml(actionTitle)}"
                    style="--repository-depth:${depth};cursor:pointer;${isVisible ? "" : "display:none !important;"}"
                    ${isVisible ? "" : "hidden"}
                >
                    <div class="repository-file-main">

                        <span class="repository-folder-chevron">
                            ${isFolder ? (isExpanded ? "▾" : "▸") : ""}
                        </span>

                        <span class="repository-file-icon">
                            ${icon}
                        </span>

                        <div class="repository-file-info">

                            <div class="repository-file-name">
                                ${escapeHtml(item.name || "-")}
                            </div>

                            <div class="repository-file-path">
                                ${escapeHtml(path)}
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

                    </div>
                </div>
            `;
        })
        .join("");

    function activateRepositoryRow(row) {

        const path =
            normalizeProjectRepositoryPath(
                row.dataset.repositoryPath ||
                ""
            );

        const isFolder =
            row.dataset.repositoryFolder === "true";

        const url =
            row.dataset.repositoryUrl || "";

        if (isFolder) {

            if (!path) {
                return;
            }

            if (
                expandedProjectRepositoryFolders.has(
                    path
                )
            ) {

                expandedProjectRepositoryFolders.delete(
                    path
                );

                Array.from(
                    expandedProjectRepositoryFolders
                ).forEach(expandedPath => {

                    if (
                        expandedPath.startsWith(
                            `${path}/`
                        )
                    ) {
                        expandedProjectRepositoryFolders.delete(
                            expandedPath
                        );
                    }
                });

            } else {

                expandedProjectRepositoryFolders.add(
                    path
                );
            }

            renderRepositoryFiles(files);
            return;
        }

        if (url) {
            window.open(
                url,
                "_blank",
                "noopener,noreferrer"
            );
        }
    }

    repositoryFilesList
        .querySelectorAll(
            ".repository-file-row"
        )
        .forEach(row => {

            row.addEventListener(
                "click",
                () => {
                    activateRepositoryRow(row);
                }
            );

            row.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key === "Enter" ||
                        event.key === " "
                    ) {
                        event.preventDefault();
                        activateRepositoryRow(row);
                    }
                }
            );
        });
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

    expandedProjectRepositoryFolders.clear();

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
// must accept member_name values without requiring user_id.
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
                    member.member_name || ""
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

function showUploadOptionsInActionMenu(
    menu,
    project
) {

    if (!menu) {
        return;
    }

    if (!menu._originalActionHtml) {
        menu._originalActionHtml =
            menu.innerHTML;
    }

    menu.innerHTML = `
        <button
            type="button"
            class="upload-menu-close back-to-project-actions"
            title="Back"
            aria-label="Back"
        >
            ×
        </button>

        <button
            type="button"
            class="project-action-item choose-project-files"
        >
            <span class="project-action-icon">
                📄
            </span>

            <span>
                Upload Files
            </span>
        </button>

        <button
            type="button"
            class="project-action-item choose-project-folder"
        >
            <span class="project-action-icon">
                📁
            </span>

            <span>
                Upload Folder
            </span>
        </button>
    `;


    const backButton =
        menu.querySelector(
            ".back-to-project-actions"
        );

    const chooseFiles =
        menu.querySelector(
            ".choose-project-files"
        );

    const chooseFolder =
        menu.querySelector(
            ".choose-project-folder"
        );


    if (backButton) {

        backButton.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                restoreProjectActionMenu(
                    menu,
                    project
                );
            }
        );
    }


    if (chooseFiles) {

        chooseFiles.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                editingProjectId =
                    project.project_id;

                currentRepositoryProject =
                    project;

                if (projectFileInput) {

                    projectFileInput.value =
                        "";

                    projectFileInput.click();
                }

                closeAllProjectActionMenus();
            }
        );
    }


    if (chooseFolder) {

        chooseFolder.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                editingProjectId =
                    project.project_id;

                currentRepositoryProject =
                    project;

                if (projectFolderInput) {

                    projectFolderInput.value =
                        "";

                    projectFolderInput.click();
                }

                closeAllProjectActionMenus();
            }
        );
    }
}


function restoreProjectActionMenu(
    menu,
    project
) {

    if (
        !menu ||
        !menu._originalActionHtml
    ) {
        return;
    }

    menu.innerHTML =
        menu._originalActionHtml;

    bindProjectActionMenuItems(
        menu,
        project
    );
}


// ============================================================
// BIND PROJECT ACTION MENU ITEMS
// ============================================================

function bindProjectActionMenuItems(
    menu,
    project
) {

    if (!menu) {
        return;
    }


    const viewTasksAction =
        menu.querySelector(
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
        menu.querySelector(
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


    const uploadProjectContentAction =
        menu.querySelector(
            ".upload-project-content-action"
        );

    if (uploadProjectContentAction) {

        uploadProjectContentAction.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                editingProjectId =
                    project.project_id;

                currentRepositoryProject =
                    project;

                // Replace the current Actions dropdown contents
                // without moving or closing the dropdown.
                showUploadOptionsInActionMenu(
                    menu,
                    project
                );
            }
        );
    }


    const editAction =
        menu.querySelector(
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
                     Project Repository
                </span>
            </button>

            <button
                type="button"
                class="project-action-item upload-project-content-action"
            >
                <span class="project-action-icon">
                    ↑
                </span>

                <span>
                    Upload Files / Folder
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

        menu._originalActionHtml =
            menu.innerHTML;
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

                    restoreProjectActionMenu(
                        menu,
                        project
                    );

                    openProjectActionMenu(
                        trigger,
                        menu
                    );
                }
            }
        );
    }


    bindProjectActionMenuItems(
        menu,
        project
    );


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
                ? team
                    .map(member => member.member_name || "")
                    .filter(Boolean)
                    .join(", ")
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

// ============================================================
// SELECT PROJECT FOCUS MODE
// ============================================================

function initializeSelectProjectMode() {
    const params = new URLSearchParams(window.location.search);

    if (params.get("select_project") !== "1") {
        return;
    }

    const waitForProjects = setInterval(() => {
        const tableBody = document.getElementById("projectsTable");
        const firstAction = document.querySelector(".project-action-trigger");

        if (!tableBody || !firstAction) {
            return;
        }

        const tableContainer = tableBody.closest(".table-container");

        if (!tableContainer) {
            return;
        }

        clearInterval(waitForProjects);

        document.body.classList.add("select-project-mode");
        tableContainer.classList.add("select-project-focus-table");

        tableContainer.scrollIntoView({
            behavior: "auto",
            block: "center"
        });

        if (!document.querySelector(".select-project-message")) {
            const message = document.createElement("div");
            message.className = "select-project-message";
            message.innerHTML = `
                <div class="select-project-message-icon">☷</div>

                <div class="select-project-message-text">
                    <strong>Select a project first</strong>
                    <span>Choose the project you want, then click <b>Actions</b> → <b>View Tasks</b>.</span>
                </div>

                <button
                    type="button"
                    class="select-project-message-close"
                    aria-label="Close"
                    title="Close"
                >×</button>
            `;

            document.body.appendChild(message);

            const closeButton = message.querySelector(".select-project-message-close");

            if (closeButton) {
                closeButton.addEventListener("click", () => {
                    document.body.classList.remove("select-project-mode");
                    tableContainer.classList.remove("select-project-focus-table");
                    message.remove();

                    const cleanUrl = new URL(window.location.href);
                    cleanUrl.searchParams.delete("select_project");
                    window.history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.search);
                });
            }
        }
    }, 100);

    setTimeout(() => {
        clearInterval(waitForProjects);
    }, 10000);
}

document.addEventListener(
    "DOMContentLoaded",
    initializeSelectProjectMode
);
