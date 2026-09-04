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

// Admin-only control: keep hidden until /api/dashboard confirms the viewer is admin.
if (newProjectBtn) {
    newProjectBtn.hidden = true;
    newProjectBtn.style.display = "none";
}
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

const uploadDestinationModal =
    document.getElementById("uploadDestinationModal");

const closeUploadDestinationModalBtn =
    document.getElementById("closeUploadDestinationModal");

const cancelUploadDestinationBtn =
    document.getElementById("cancelUploadDestinationBtn");

const continueUploadDestinationBtn =
    document.getElementById("continueUploadDestinationBtn");

let pendingUploadType = null;
let selectedProjectUploadDestination = "repository";

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
// DEPLOYMENT CHECKLIST ELEMENTS
// ============================================================

const deploymentChecklistModal =
    document.getElementById(
        "deploymentChecklistModal"
    );

const closeDeploymentChecklistModalBtn =
    document.getElementById(
        "closeDeploymentChecklistModal"
    );

const closeDeploymentChecklistFooterBtn =
    document.getElementById(
        "closeDeploymentChecklistFooterBtn"
    );

const deploymentChecklistProjectName =
    document.getElementById(
        "deploymentChecklistProjectName"
    );

const deploymentReadinessCount =
    document.getElementById(
        "deploymentReadinessCount"
    );

const deploymentProgressBar =
    document.getElementById(
        "deploymentProgressBar"
    );

const deploymentChecklistLoading =
    document.getElementById(
        "deploymentChecklistLoading"
    );

const deploymentChecklistError =
    document.getElementById(
        "deploymentChecklistError"
    );

const deploymentDocumentList =
    document.getElementById(
        "deploymentDocumentList"
    );

const deploymentOverallStatus =
    document.getElementById(
        "deploymentOverallStatus"
    );

// ============================================================
// DEPLOYMENT REVIEW MODAL
// ============================================================

const deploymentReviewModal =
    document.getElementById(
        "deploymentReviewModal"
    );

const deploymentReviewTitle =
    document.getElementById(
        "deploymentReviewTitle"
    );

const deploymentReviewDocumentName =
    document.getElementById(
        "deploymentReviewDocumentName"
    );

const deploymentReviewFileName =
    document.getElementById(
        "deploymentReviewFileName"
    );

const deploymentReviewViewFileBtn =
    document.getElementById(
        "deploymentReviewViewFileBtn"
    );

const deploymentReviewRemarks =
    document.getElementById(
        "deploymentReviewRemarks"
    );

const deploymentReviewError =
    document.getElementById(
        "deploymentReviewError"
    );

const closeDeploymentReviewModalBtn =
    document.getElementById(
        "closeDeploymentReviewModal"
    );

const cancelDeploymentReviewBtn =
    document.getElementById(
        "cancelDeploymentReviewBtn"
    );

const submitDeploymentReviewBtn =
    document.getElementById(
        "submitDeploymentReviewBtn"
    );


let currentDeploymentReviewDocument =
    null;



const deploymentDocumentFileInput =
    document.getElementById(
        "deploymentDocumentFileInput"
    );


let currentDeploymentChecklistProject =
    null;

let pendingDeploymentDocumentType =
    null;
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


function getLocalDateInputValue(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
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

        case "Deployed":
            return "status-deployed";

        case "Not Started":
        case "On Hold":
        default:
            return "status-pending";
    }
}


// ============================================================
// DEVELOPMENT TEAM - ACCOUNT SELECTOR
// ============================================================

let developmentTeamAccounts = [];
let isAdminViewer = false;

async function loadDevelopmentTeamAccounts() {
    if (!isAdminViewer) {
        developmentTeamAccounts = [];
        return;
    }

    try {
        const response = await fetch("/api/development-team");
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load development team accounts.");
        developmentTeamAccounts = Array.isArray(result.members)
            ? result.members.filter(member => member.is_active !== false)
            : [];
        refreshTeamAccountSelects();
    } catch (error) {
        console.error("Load development team accounts error:", error);
        developmentTeamAccounts = [];
    }
}

function buildTeamAccountOptions(selectedUserId = "", legacyName = "") {
    const selected = String(selectedUserId || "");
    const options = ['<option value="">Select development team member</option>'];

    if (!selected && legacyName) {
        options.push(`<option value="" selected disabled>${escapeHtml(legacyName)} (legacy name - create/link an account)</option>`);
    }

    for (const member of developmentTeamAccounts) {
        const value = String(member.user_id || "");
        const isSelected = value && value === selected ? " selected" : "";
        options.push(`<option value="${escapeHtml(value)}"${isSelected}>${escapeHtml(member.full_name || member.email || "Unnamed member")}</option>`);
    }
    return options.join("");
}

function refreshTeamAccountSelects() {
    if (!developmentTeamContainer) return;

    const selects =
        Array.from(
            developmentTeamContainer.querySelectorAll(
                ".team-member-account"
            )
        );

    const selectedIds =
        new Set(
            selects
                .map(select =>
                    String(select.value || "").trim()
                )
                .filter(Boolean)
        );

    selects.forEach(select => {

        const current =
            String(
                select.value ||
                select.dataset.selectedUserId ||
                ""
            ).trim();

        const legacyName =
            select.dataset.legacyName || "";

        select.innerHTML =
            buildTeamAccountOptions(
                current,
                legacyName
            );

        if (current) {
            select.value = current;
        }

        Array.from(select.options)
            .forEach(option => {

                const optionValue =
                    String(
                        option.value || ""
                    ).trim();

                if (!optionValue) {
                    return;
                }

                // Completely hide accounts that are already
                // selected in another Development Team row.
                if (
                    optionValue !== current &&
                    selectedIds.has(optionValue)
                ) {
                    option.remove();
                }
            });
    });
}

function createTeamMemberRow(member = null) {
    const row = document.createElement("div");
    row.className = "team-member-row";

    const selectedUserId = member?.user_id || "";
    const legacyName = member?.member_name || member?.name || "";

    row.innerHTML = `
        <select class="team-member-account" data-selected-user-id="${escapeHtml(selectedUserId)}" data-legacy-name="${escapeHtml(legacyName)}">
            ${buildTeamAccountOptions(selectedUserId, legacyName)}
        </select>
        <button type="button" class="remove-team-member-btn" aria-label="Remove team member">&times;</button>
    `;

    const accountSelect =
        row.querySelector(
            ".team-member-account"
        );

    if (accountSelect) {
        accountSelect.addEventListener(
            "change",
            () => {

                accountSelect.dataset.selectedUserId =
                    accountSelect.value || "";

                refreshTeamAccountSelects();
            }
        );
    }

    const removeButton =
        row.querySelector(
            ".remove-team-member-btn"
        );

    if (removeButton) {
        removeButton.addEventListener(
            "click",
            () => {

                row.remove();

                ensureAtLeastOneTeamRow();

                refreshTeamAccountSelects();
            }
        );
    }

    return row;
}

function clearDevelopmentTeamRows() {
    if (developmentTeamContainer) developmentTeamContainer.innerHTML = "";
}

function ensureAtLeastOneTeamRow() {
    if (!developmentTeamContainer || !isAdminViewer) return;
    if (developmentTeamContainer.querySelectorAll(".team-member-row").length === 0) {
        developmentTeamContainer.appendChild(createTeamMemberRow());
    }
}

function addTeamMemberRow(member = null) {
    if (!developmentTeamContainer) return;

    developmentTeamContainer.appendChild(
        createTeamMemberRow(member)
    );

    refreshTeamAccountSelects();
}

if (addTeamMemberBtn) {
    addTeamMemberBtn.addEventListener("click", () => addTeamMemberRow());
}

function collectDevelopmentTeam() {
    if (!developmentTeamContainer) return [];
    const members = [];
    const used = new Set();

    for (const row of developmentTeamContainer.querySelectorAll(".team-member-row")) {
        const select = row.querySelector(".team-member-account");
        const userId = select?.value || "";
        if (!userId || used.has(userId)) continue;

        const account = developmentTeamAccounts.find(member => member.user_id === userId);
        if (!account) continue;
        used.add(userId);
        members.push({
            user_id: userId,
            member_name: account.full_name || account.email
        });
    }
    return members;
}

function openUploadDestinationModal(uploadType) {

    pendingUploadType =
        uploadType;

    selectedProjectUploadDestination =
        "repository";

    const repositoryOption =
        document.querySelector(
            'input[name="uploadDestination"][value="repository"]'
        );

    if (repositoryOption) {
        repositoryOption.checked = true;
    }

    if (uploadDestinationModal) {
        uploadDestinationModal.classList.add(
            "show"
        );
    }
}


function closeUploadDestinationModal() {

    if (uploadDestinationModal) {
        uploadDestinationModal.classList.remove(
            "show"
        );
    }

    pendingUploadType =
        null;
}


if (closeUploadDestinationModalBtn) {

    closeUploadDestinationModalBtn.addEventListener(
        "click",
        closeUploadDestinationModal
    );
}


if (cancelUploadDestinationBtn) {

    cancelUploadDestinationBtn.addEventListener(
        "click",
        closeUploadDestinationModal
    );
}


if (uploadDestinationModal) {

    uploadDestinationModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                uploadDestinationModal
            ) {
                closeUploadDestinationModal();
            }
        }
    );
}


if (continueUploadDestinationBtn) {

    continueUploadDestinationBtn.addEventListener(
        "click",
        () => {

            const selectedOption =
                document.querySelector(
                    'input[name="uploadDestination"]:checked'
                );

            selectedProjectUploadDestination =
                selectedOption?.value ||
                "repository";

            const uploadType =
                pendingUploadType;

            closeUploadDestinationModal();

            if (
                uploadType === "file" &&
                projectFileInput
            ) {

                projectFileInput.value =
                    "";

                projectFileInput.click();

            } else if (
                uploadType === "folder" &&
                projectFolderInput
            ) {

                projectFolderInput.value =
                    "";

                projectFolderInput.click();
            }
        }
    );
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
                        ),

                    "X-Upload-Destination":
                        selectedProjectUploadDestination
                                    },

                                    body:
                                        file
            }
                    );

    // Vercel/proxies may return a plain-text or HTML error (for example when
    // a request is too large), so do not assume every response is JSON.
    const responseText = await response.text();
    let result = {};

    if (responseText) {
        try {
            result = JSON.parse(responseText);
        } catch (_) {
            result = { error: responseText };
        }
    }

    if (!response.ok) {
        let message =
            result.error ||
            result.details ||
            `Failed to upload ${file.name}.`;

        // Give a useful message when the hosting platform rejects the request
        // before Express can return the normal JSON error body.
        if (response.status === 413 || /request entity too large|payload too large|body exceeded|request.*large/i.test(String(message))) {
            message = `File "${file.name}" is too large for the deployment upload limit.`;
        }

        throw new Error(message);
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
                                ${escapeHtml(
                                    path.replace(/∕/g, " / ")
                                )}
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
                currentRepositoryProject?.drive_folder_url;

            if (!url) {
                alert(
                    "Project Google Drive folder URL is not available."
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

        setProjectValue(
            "projectVersion",
            "v1.0"
        );
    }

    const today =
        getLocalDateInputValue();

    setProjectValue(
        "dateOpened",
        today
    );

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
                user_id:
                    member.user_id || "",

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
// DEPLOYMENT CHECKLIST
// ============================================================

function closeDeploymentChecklistModal() {

    if (!deploymentChecklistModal) {
        return;
    }

    deploymentChecklistModal.classList.remove(
        "show"
    );
}


function getDeploymentStatusClass(status) {

    switch (status) {

        case "Approved":
            return "deployment-status-approved";

        case "Pending Review":
            return "deployment-status-pending";

        case "Needs Revision":
            return "deployment-status-revision";

        case "Missing":
        default:
            return "deployment-status-missing";
    }
}


function getDeploymentStatusIcon(status) {

    switch (status) {

        case "Approved":
            return "✓";

        case "Pending Review":
            return "●";

        case "Needs Revision":
            return "!";

        case "Missing":
        default:
            return "—";
    }
}


function renderDeploymentChecklist(data) {

    if (
        !deploymentDocumentList ||
        !data
    ) {
        return;
    }

    const summary =
        data.summary || {};

    const documents =
        Array.isArray(data.documents)
            ? data.documents
            : [];


    if (deploymentChecklistProjectName) {

        deploymentChecklistProjectName.textContent =
            `${data.project?.project_id || ""} — ${data.project?.project_name || ""}`;
    }


    const approved =
        Number(
            summary.approved || 0
        );

    const total =
        Number(
            summary.total || 8
        );


    if (deploymentReadinessCount) {

        deploymentReadinessCount.textContent =
            `${approved} / ${total} Approved`;
    }


    const progress =
        total > 0
            ? Math.round(
                (approved / total) *
                100
            )
            : 0;


    if (deploymentProgressBar) {

        deploymentProgressBar.style.width =
            `${progress}%`;
    }


    deploymentDocumentList.innerHTML =
        "";


    documents.forEach(
        (
            deploymentDocument,
            index
        ) => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "deployment-document-row";


            const number =
                document.createElement(
                    "div"
                );

            number.className =
                "deployment-document-number";

            number.textContent =
                String(index + 1);


            const information =
                document.createElement(
                    "div"
                );

            information.className =
                "deployment-document-info";


            const name =
                document.createElement(
                    "div"
                );

            name.className =
                "deployment-document-name";

            name.textContent =
                deploymentDocument.document_type ||
                "Required Document";


            information.appendChild(
                name
            );


            const status =
                document.createElement(
                    "span"
                );

            status.className =
                `deployment-document-status ${getDeploymentStatusClass(
                    deploymentDocument.status
                )}`;

            status.textContent =
                `${getDeploymentStatusIcon(
                    deploymentDocument.status
                )} ${deploymentDocument.status || "Missing"}`;


            const actions =
                document.createElement(
                    "div"
                );

            actions.className =
                "deployment-document-actions";


            const primaryAction =
                document.createElement(
                    "button"
                );

            primaryAction.type =
                "button";

            primaryAction.className =
                "deployment-document-action";


            if (
                deploymentDocument.status ===
                "Missing"
            ) {

                primaryAction.textContent =
                    "Upload";

                primaryAction.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();

                        pendingDeploymentDocumentType =
                            deploymentDocument.document_type;

                        if (deploymentDocumentFileInput) {

                            deploymentDocumentFileInput.value =
                                "";

                            deploymentDocumentFileInput.click();
                        }
                    }
                );

            } else if (
                deploymentDocument.status ===
                "Needs Revision" &&
                !isAdminViewer
            ) {

                primaryAction.textContent =
                    "Resubmit";

                primaryAction.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();

                        pendingDeploymentDocumentType =
                            deploymentDocument.document_type;

                        if (deploymentDocumentFileInput) {

                            deploymentDocumentFileInput.value =
                                "";

                            deploymentDocumentFileInput.click();
                        }
                    }
                );

            } else {

                primaryAction.textContent =
                    "View";

                primaryAction.disabled =
                    !deploymentDocument.drive_file_url;

                if (
                    deploymentDocument.drive_file_url
                ) {

                    primaryAction.addEventListener(
                        "click",
                        event => {

                            event.stopPropagation();

                            window.open(
                                deploymentDocument.drive_file_url,
                                "_blank",
                                "noopener,noreferrer"
                            );
                        }
                    );
                }
            }


            actions.appendChild(
                primaryAction
            );


            if (
                isAdminViewer &&
                deploymentDocument.status !==
                "Missing"
            ) {

                const reviewAction =
                    document.createElement(
                        "button"
                    );

                reviewAction.type =
                    "button";

                reviewAction.className =
                    "deployment-document-action deployment-review-action";

                reviewAction.textContent =
                    deploymentDocument.status ===
                    "Pending Review"
                        ? "Review"
                        : "Edit Review";

                reviewAction.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();

                        openDeploymentReviewModal(
                            deploymentDocument
                        );
                    }
                );

                actions.appendChild(
                    reviewAction
                );
            }


            row.appendChild(
                number
            );

            row.appendChild(
                information
            );

            row.appendChild(
                status
            );

            row.appendChild(
                actions
            );


            deploymentDocumentList.appendChild(
                row
            );
        }
    );


    if (deploymentOverallStatus) {

        if (
            summary.ready_for_deployment ===
            true
        ) {

            deploymentOverallStatus.textContent =
                "READY FOR DEPLOYMENT";

            deploymentOverallStatus.classList.remove(
                "deployment-not-ready"
            );

            deploymentOverallStatus.classList.add(
                "deployment-ready"
            );

        } else {

            deploymentOverallStatus.textContent =
                "NOT READY FOR DEPLOYMENT";

            deploymentOverallStatus.classList.remove(
                "deployment-ready"
            );

            deploymentOverallStatus.classList.add(
                "deployment-not-ready"
            );
        }
    }
}

async function openDeploymentChecklist(
    project
) {

    if (
        !deploymentChecklistModal ||
        !project
    ) {
        return;
    }

    currentDeploymentChecklistProject =
        project;


    deploymentChecklistModal.classList.add(
        "show"
    );


    if (deploymentChecklistProjectName) {

        deploymentChecklistProjectName.textContent =
            `${project.project_id} — ${project.project_name}`;
    }


    if (deploymentChecklistLoading) {

        deploymentChecklistLoading.hidden =
            false;
    }


    if (deploymentChecklistError) {

        deploymentChecklistError.hidden =
            true;

        deploymentChecklistError.textContent =
            "";
    }


    if (deploymentDocumentList) {

        deploymentDocumentList.innerHTML =
            "";
    }


    try {

        const response =
            await fetch(
                `/api/projects/${encodeURIComponent(
                    project.project_id
                )}/deployment-checklist`
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.error ||
                "Unable to load deployment checklist."
            );
        }


        renderDeploymentChecklist(
            data
        );


    } catch (error) {

        console.error(
            "DEPLOYMENT CHECKLIST ERROR:",
            error
        );


        if (deploymentChecklistError) {

            deploymentChecklistError.textContent =
                error.message ||
                "Unable to load deployment checklist.";

            deploymentChecklistError.hidden =
                false;
        }

    } finally {

        if (deploymentChecklistLoading) {

            deploymentChecklistLoading.hidden =
                true;
        }
    }
}

// ============================================================
// UPLOAD DEPLOYMENT DOCUMENT
// ============================================================

async function uploadDeploymentDocument(
    projectId,
    documentType,
    file
) {

    if (
        !projectId ||
        !documentType ||
        !file
    ) {

        throw new Error(
            "Deployment upload information is incomplete."
        );
    }


    const response =
        await fetch(
            `/api/projects/${encodeURIComponent(
                projectId
            )}/deployment-checklist/upload`,
            {
                method:
                    "POST",

                headers: {

                    "Content-Type":
                        "application/octet-stream",

                    "X-Document-Type":
                        encodeURIComponent(
                            documentType
                        ),

                    "X-File-Name":
                        encodeURIComponent(
                            file.name
                        ),

                    "X-File-Mime-Type":
                        encodeURIComponent(
                            file.type ||
                            "application/octet-stream"
                        )
                },

                body:
                    file
            }
        );


    const responseText =
        await response.text();


    let result = {};


    if (responseText) {

        try {

            result =
                JSON.parse(
                    responseText
                );

        } catch (_) {

            result = {
                error:
                    responseText
            };
        }
    }


    if (!response.ok) {

        throw new Error(
            result.error ||
            result.details ||
            "Unable to upload deployment document."
        );
    }


    return result;
}


// ============================================================
// DEPLOYMENT DOCUMENT FILE INPUT
// ============================================================

if (deploymentDocumentFileInput) {

    deploymentDocumentFileInput.addEventListener(
        "change",
        async () => {

            const file =
                deploymentDocumentFileInput
                    .files?.[0];


            if (
                !file ||
                !pendingDeploymentDocumentType ||
                !currentDeploymentChecklistProject
                    ?.project_id
            ) {

                deploymentDocumentFileInput.value =
                    "";

                return;
            }


            const documentType =
                pendingDeploymentDocumentType;


            try {

                deploymentDocumentFileInput.disabled =
                    true;


                if (deploymentChecklistLoading) {

                    deploymentChecklistLoading.textContent =
                        `Uploading ${file.name}...`;

                    deploymentChecklistLoading.hidden =
                        false;
                }


                await uploadDeploymentDocument(

                    currentDeploymentChecklistProject
                        .project_id,

                    documentType,

                    file
                );


                pendingDeploymentDocumentType =
                    null;


                deploymentDocumentFileInput.value =
                    "";


                await openDeploymentChecklist(
                    currentDeploymentChecklistProject
                );


            } catch (error) {

                console.error(
                    "DEPLOYMENT DOCUMENT UPLOAD ERROR:",
                    error
                );


                alert(
                    "Upload failed: " +
                    error.message
                );


            } finally {

                deploymentDocumentFileInput.disabled =
                    false;


                deploymentDocumentFileInput.value =
                    "";


                if (deploymentChecklistLoading) {

                    deploymentChecklistLoading.textContent =
                        "Loading deployment checklist...";

                    deploymentChecklistLoading.hidden =
                        true;
                }
            }
        }
    );
}


// ============================================================
// DEPLOYMENT DOCUMENT REVIEW
// ============================================================

function closeDeploymentReviewModal() {

    if (!deploymentReviewModal) {
        return;
    }

    deploymentReviewModal.classList.remove(
        "show"
    );

    currentDeploymentReviewDocument =
        null;
}


function openDeploymentReviewModal(
    deploymentDocument
) {

    if (
        !deploymentReviewModal ||
        !deploymentDocument
    ) {
        return;
    }


    currentDeploymentReviewDocument =
        deploymentDocument;


    const isExistingReview =
        deploymentDocument.status ===
            "Approved" ||
        deploymentDocument.status ===
            "Needs Revision";


    if (deploymentReviewTitle) {

        deploymentReviewTitle.textContent =
            isExistingReview
                ? "Edit Deployment Review"
                : "Review Deployment Document";
    }


    if (deploymentReviewDocumentName) {

        deploymentReviewDocumentName.textContent =
            deploymentDocument.document_type ||
            "Document";
    }


    if (deploymentReviewFileName) {

        deploymentReviewFileName.textContent =
            deploymentDocument.file_name ||
            "Uploaded file";
    }


    if (deploymentReviewRemarks) {

        deploymentReviewRemarks.value =
            deploymentDocument.review_remarks ||
            "";
    }


    document
        .querySelectorAll(
            'input[name="deploymentReviewDecision"]'
        )
        .forEach(radio => {

            radio.checked =
                radio.value ===
                deploymentDocument.status;
        });


    if (deploymentReviewViewFileBtn) {

        deploymentReviewViewFileBtn.disabled =
            !deploymentDocument.drive_file_url;

        deploymentReviewViewFileBtn.onclick =
            () => {

                if (
                    deploymentDocument
                        .drive_file_url
                ) {

                    window.open(
                        deploymentDocument
                            .drive_file_url,
                        "_blank",
                        "noopener,noreferrer"
                    );
                }
            };
    }


    if (deploymentReviewError) {

        deploymentReviewError.hidden =
            true;

        deploymentReviewError.textContent =
            "";
    }


    if (submitDeploymentReviewBtn) {

        submitDeploymentReviewBtn.textContent =
            isExistingReview
                ? "Update Review"
                : "Submit Review";
    }


    deploymentReviewModal.classList.add(
        "show"
    );
}

// ============================================================
// SUBMIT DEPLOYMENT REVIEW
// ============================================================

async function submitDeploymentReview() {

    if (
        !currentDeploymentReviewDocument ||
        !currentDeploymentChecklistProject
            ?.project_id
    ) {
        return;
    }


    const selectedDecision =
        document.querySelector(
            'input[name="deploymentReviewDecision"]:checked'
        );


    if (!selectedDecision) {

        if (deploymentReviewError) {
            deploymentReviewError.textContent =
                "Please select a review decision.";

            deploymentReviewError.hidden =
                false;
        }

        return;
    }


    const status =
        selectedDecision.value;


    const remarks =
        deploymentReviewRemarks
            ?.value
            ?.trim() ||
        "";


    if (
        status ===
            "Needs Revision" &&
        !remarks
    ) {

        if (deploymentReviewError) {
            deploymentReviewError.textContent =
                "Please enter remarks or findings for the required revision.";

            deploymentReviewError.hidden =
                false;
        }

        return;
    }


    try {

        if (deploymentReviewError) {
            deploymentReviewError.hidden =
                true;

            deploymentReviewError.textContent =
                "";
        }


        if (submitDeploymentReviewBtn) {
            submitDeploymentReviewBtn.disabled =
                true;

            submitDeploymentReviewBtn.textContent =
                "Saving...";
        }


        const response =
            await fetch(
                `/api/projects/${encodeURIComponent(
                    currentDeploymentChecklistProject
                        .project_id
                )}/deployment-checklist/${encodeURIComponent(
                    currentDeploymentReviewDocument
                        .deployment_document_id
                )}/review`,
                {
                    method:
                        "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            status:
                                status,

                            review_remarks:
                                remarks
                        })
                }
            );


        const responseText =
            await response.text();

        let result = {};

        if (responseText) {
            try {
                result =
                    JSON.parse(
                        responseText
                    );
            } catch (_) {
                result = {
                    error:
                        responseText
                };
            }
        }


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.error ||
                result.details ||
                "Unable to save review."
            );
        }


        closeDeploymentReviewModal();


        await openDeploymentChecklist(
            currentDeploymentChecklistProject
        );


    } catch (error) {

        if (deploymentReviewError) {
            deploymentReviewError.textContent =
                error.message ||
                "Unable to save review.";

            deploymentReviewError.hidden =
                false;
        }


    } finally {

        if (submitDeploymentReviewBtn) {
            submitDeploymentReviewBtn.disabled =
                false;

            submitDeploymentReviewBtn.textContent =
                currentDeploymentReviewDocument &&
                (
                    currentDeploymentReviewDocument.status ===
                        "Approved" ||
                    currentDeploymentReviewDocument.status ===
                        "Needs Revision"
                )
                    ? "Update Review"
                    : "Submit Review";
        }
    }
}


if (submitDeploymentReviewBtn) {

    submitDeploymentReviewBtn.addEventListener(
        "click",
        submitDeploymentReview
    );
}


if (closeDeploymentReviewModalBtn) {

    closeDeploymentReviewModalBtn.addEventListener(
        "click",
        closeDeploymentReviewModal
    );
}


if (cancelDeploymentReviewBtn) {

    cancelDeploymentReviewBtn.addEventListener(
        "click",
        closeDeploymentReviewModal
    );
}


if (deploymentReviewModal) {

    deploymentReviewModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                deploymentReviewModal
            ) {

                closeDeploymentReviewModal();
            }
        }
    );
}


// ============================================================
// DEPLOYMENT CHECKLIST MODAL LISTENERS
// ============================================================

if (closeDeploymentChecklistModalBtn) {

    closeDeploymentChecklistModalBtn.addEventListener(
        "click",
        closeDeploymentChecklistModal
    );
}


if (closeDeploymentChecklistFooterBtn) {

    closeDeploymentChecklistFooterBtn.addEventListener(
        "click",
        closeDeploymentChecklistModal
    );
}


if (deploymentChecklistModal) {

    deploymentChecklistModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                deploymentChecklistModal
            ) {

                closeDeploymentChecklistModal();
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

                closeAllProjectActionMenus();

                openUploadDestinationModal(
                    "file"
                );
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

                closeAllProjectActionMenus();

                openUploadDestinationModal(
                    "folder"
                );
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
// DEPLOY ACTION STATE
// ============================================================

async function refreshDeployActionState(
    menu,
    project
) {

    if (
        !menu ||
        !project?.project_id
    ) {
        return;
    }


    const deployAction =
        menu.querySelector(
            ".deploy-project-action"
        );


    if (!deployAction) {
        return;
    }


    const deployLabel =
        deployAction.querySelector(
            ".deploy-project-label"
        );


    // Only administrators can deploy the project.
    if (!isAdminViewer) {

        deployAction.disabled =
            true;

        deployAction.title =
            "Administrator access required.";

        return;
    }


    // A deployed project cannot be deployed again.
    if (
        project.project_status ===
        "Deployed"
    ) {

        deployAction.disabled =
            true;

        deployAction.title =
            "This project is already deployed.";

        if (deployLabel) {
            deployLabel.textContent =
                "Deployed";
        }

        return;
    }


    deployAction.disabled =
        true;

    deployAction.title =
        "Checking deployment readiness...";


    try {

        const response =
            await fetch(
                `/api/projects/${encodeURIComponent(
                    project.project_id
                )}/deployment-checklist`
            );


        const responseText =
            await response.text();


        let result = {};


        if (responseText) {

            try {
                result =
                    JSON.parse(
                        responseText
                    );
            } catch (_) {
                result = {
                    error:
                        responseText
                };
            }
        }


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.error ||
                result.details ||
                "Unable to verify deployment readiness."
            );
        }


        const ready =
            result.summary
                ?.ready_for_deployment ===
            true;


        deployAction.disabled =
            !ready;


        deployAction.title =
            ready
                ? "All 8 required deployment documents are approved."
                : "All 8 required deployment documents must be approved before deployment.";


        if (deployLabel) {
            deployLabel.textContent =
                "Deploy";
        }


    } catch (error) {

        console.error(
            "DEPLOYMENT READINESS CHECK ERROR:",
            error
        );


        deployAction.disabled =
            true;

        deployAction.title =
            "Unable to verify deployment readiness.";
    }
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


    // ============================================================
    // PROJECT ACTION SECTIONS / ACCORDION
    // ============================================================

    const sectionToggles =
        menu.querySelectorAll(
            ".project-action-section-toggle"
        );


    sectionToggles.forEach(toggle => {

        toggle.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                if (toggle.disabled) {
                    return;
                }

                const sectionName =
                    toggle.dataset.actionSection;

                const targetContent =
                    menu.querySelector(
                        `[data-action-section-content="${sectionName}"]`
                    );

                if (!targetContent) {
                    return;
                }

                const shouldOpen =
                    targetContent.hidden;


                menu.querySelectorAll(
                    ".project-action-section-content"
                ).forEach(content => {

                    content.hidden = true;
                });


                menu.querySelectorAll(
                    ".project-action-section-toggle"
                ).forEach(button => {

                    const arrow =
                        button.querySelector(
                            ".project-action-section-arrow"
                        );

                    if (!arrow) {
                        return;
                    }

                    arrow.textContent =
                        button.disabled
                            ? "🔒"
                            : "›";
                });


                if (shouldOpen) {

                    targetContent.hidden =
                        false;

                    const arrow =
                        toggle.querySelector(
                            ".project-action-section-arrow"
                        );

                    if (arrow) {
                        arrow.textContent =
                            "⌄";
                    }


                    if (
                        sectionName ===
                        "deployment"
                    ) {

                        refreshDeployActionState(
                            menu,
                            project
                        );
                    }
                }
            }
        );
    });


    // ============================================================
    // DEPLOYMENT CHECKLIST ACTION
    // ============================================================

    const deploymentChecklistAction =
        menu.querySelector(
            ".deployment-checklist-action"
        );


    if (deploymentChecklistAction) {

        deploymentChecklistAction.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                closeAllProjectActionMenus();

                openDeploymentChecklist(
                    project
                );
            }
        );
    }


    // ============================================================
    // DEPLOY PROJECT
    // ============================================================

    const deployProjectAction =
        menu.querySelector(
            ".deploy-project-action"
        );


    if (deployProjectAction) {

        deployProjectAction.addEventListener(
            "click",
            async event => {

                event.stopPropagation();


                if (
                    deployProjectAction.disabled ||
                    !isAdminViewer
                ) {
                    return;
                }


                const confirmed =
                    window.confirm(
                        `Deploy ${project.project_id} - ${project.project_name}?\n\nThis will mark the project as Deployed and unlock Maintenance.`
                    );


                if (!confirmed) {
                    return;
                }


                const deployLabel =
                    deployProjectAction.querySelector(
                        ".deploy-project-label"
                    );


                deployProjectAction.disabled =
                    true;


                if (deployLabel) {
                    deployLabel.textContent =
                        "Deploying...";
                }


                try {

                    const response =
                        await fetch(
                            `/api/projects/${encodeURIComponent(
                                project.project_id
                            )}/deploy`,
                            {
                                method:
                                    "POST"
                            }
                        );


                    const responseText =
                        await response.text();


                    let result = {};


                    if (responseText) {

                        try {
                            result =
                                JSON.parse(
                                    responseText
                                );
                        } catch (_) {
                            result = {
                                error:
                                    responseText
                            };
                        }
                    }


                    if (!response.ok) {

                        throw new Error(
                            result.error ||
                            result.details ||
                            "Unable to deploy the project."
                        );
                    }


                    closeAllProjectActionMenus();


                    alert(
                        result.message ||
                        "Project deployed successfully. Maintenance is now unlocked."
                    );


                    await loadDashboard();


                } catch (error) {

                    console.error(
                        "DEPLOY PROJECT ERROR:",
                        error
                    );


                    alert(
                        "Deployment failed: " +
                        error.message
                    );


                    await refreshDeployActionState(
                        menu,
                        project
                    );
                }
            }
        );
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


    const deleteAction =
        menu.querySelector(
            ".delete-project-action"
        );

    if (deleteAction) {

        deleteAction.addEventListener(
            "click",
            async event => {

                event.stopPropagation();

                closeAllProjectActionMenus();

                if (!isAdminViewer) {
                    return;
                }

                const projectLabel =
                    `${project.project_id || "Project"} - ${project.project_name || "Unnamed Project"}`;

                const confirmed = window.confirm(
                    `Delete ${projectLabel}?\n\nThis will permanently delete the project and its related records. This action cannot be undone.`
                );

                if (!confirmed) {
                    return;
                }

                deleteAction.disabled = true;

                try {

                    const response = await fetch(
                        `/api/projects/${encodeURIComponent(project.project_id)}`,
                        {
                            method: "DELETE"
                        }
                    );

                    const responseText =
                        await response.text();

                    let result = {};

                    if (responseText) {
                        try {
                            result = JSON.parse(responseText);
                        } catch (_) {
                            result = { error: responseText };
                        }
                    }

                    if (!response.ok) {
                        throw new Error(
                            result.error ||
                            result.details ||
                            `Server returned ${response.status}.`
                        );
                    }

                    alert(
                        result.message ||
                        "Project deleted successfully."
                    );

                    await loadDashboard();

                } catch (error) {

                    console.error(
                        "DELETE PROJECT ERROR:",
                        error
                    );

                    alert(
                        "Unable to delete project: " +
                        error.message
                    );

                } finally {
                    deleteAction.disabled = false;
                }
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


    const maintenanceEnabled =
    project.project_status === "Deployed";


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


            <!-- =========================================
                PROJECT
                ========================================= -->

            <button
                type="button"
                class="project-action-section-toggle"
                data-action-section="project"
            >
                <span class="project-action-section-icon">
                    ▦
                </span>

                <span class="project-action-section-label">
                    Project
                </span>

                <span class="project-action-section-arrow">
                    ›
                </span>
            </button>


            <div
                class="project-action-section-content"
                data-action-section-content="project"
                hidden
            >

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

            </div>



            <!-- =========================================
                DEPLOYMENT
                ========================================= -->

            <button
                type="button"
                class="project-action-section-toggle"
                data-action-section="deployment"
            >
                <span class="project-action-section-icon">
                    ✓
                </span>

                <span class="project-action-section-label">
                    Deployment
                </span>

                <span class="project-action-section-arrow">
                    ›
                </span>
            </button>


            <div
                class="project-action-section-content"
                data-action-section-content="deployment"
                hidden
            >

                <button
                    type="button"
                    class="project-action-item deployment-checklist-action"
                >
                    <span class="project-action-icon">
                        ☑
                    </span>

                    <span>
                        Deployment Checklist
                    </span>
                </button>


                <button
                    type="button"
                    class="project-action-item ready-for-deployment-action deploy-project-action"
                    disabled
                    title="${
                        maintenanceEnabled
                            ? "This project is already deployed."
                            : "All 8 required deployment documents must be approved before deployment."
                    }"
                >
                    <span class="project-action-icon">
                        ✓
                    </span>

                    <span class="deploy-project-label">
                        ${maintenanceEnabled ? "Deployed" : "Deploy"}
                    </span>
                </button>
            </div>



            <!-- =========================================
                MAINTENANCE
                ========================================= -->

            <button
                type="button"
                class="project-action-section-toggle ${maintenanceEnabled ? "" : "project-action-section-disabled"}"
                data-action-section="maintenance"
                ${maintenanceEnabled ? "" : "disabled"}
            >
                <span class="project-action-section-icon">
                    ⚒
                </span>

                <span class="project-action-section-label">
                    Maintenance
                </span>

                <span class="project-action-section-arrow">
                    ${maintenanceEnabled ? "›" : "🔒"}
                </span>
            </button>


            <div
                class="project-action-section-content"
                data-action-section-content="maintenance"
                hidden
            >

                <button
                    type="button"
                    class="project-action-item maintenance-action"
                >
                    <span class="project-action-icon">
                        ⚒
                    </span>

                    <span>
                        Maintenance
                    </span>
                </button>

            </div>



            ${isAdminViewer ? `

            <!-- =========================================
                MANAGE
                ========================================= -->

            <button
                type="button"
                class="project-action-section-toggle"
                data-action-section="manage"
            >
                <span class="project-action-section-icon">
                    ⚙
                </span>

                <span class="project-action-section-label">
                    Manage
                </span>

                <span class="project-action-section-arrow">
                    ›
                </span>
            </button>


            <div
                class="project-action-section-content"
                data-action-section-content="manage"
                hidden
            >

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


                <button
                    type="button"
                    class="project-action-item delete-project-action"
                    style="color: #dc2626;"
                >
                    <span
                        class="project-action-icon"
                        style="color: #dc2626;"
                    >
                        🗑
                    </span>

                    <span>
                        Delete
                    </span>
                </button>

            </div>

            ` : ""}

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

        isAdminViewer = data.viewer?.role === "admin";
        if (newProjectBtn) {
            newProjectBtn.hidden = !isAdminViewer;
            newProjectBtn.style.display = isAdminViewer ? "" : "none";
        }
        if (addTeamMemberBtn) addTeamMemberBtn.hidden = !isAdminViewer;
        const teamGroup = document.getElementById("developmentTeamFormGroup");
        if (teamGroup) teamGroup.hidden = !isAdminViewer;
        if (isAdminViewer && developmentTeamAccounts.length === 0) {
            await loadDevelopmentTeamAccounts();
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
            (editingProjectId
                ? "Error updating project: "
                : "Error creating project: ") +
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
// SELECT PROJECT FOCUS MODE - INSTANT
// ============================================================

function initializeSelectProjectMode() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    if (
        params.get("select_project") !== "1"
    ) {
        return;
    }


    // Show the guide/focus state immediately.
    document.body.classList.add(
        "select-project-mode"
    );


    let message =
        document.querySelector(
            ".select-project-message"
        );

    if (!message) {

        message =
            document.createElement(
                "div"
            );

        message.className =
            "select-project-message";

        message.innerHTML = `
            <div class="select-project-message-icon">☷</div>

            <div class="select-project-message-text">
                <strong>Select a project first</strong>
                <span>
                    Choose the project you want, then click
                    <b>Actions</b> → <b>View Tasks</b>.
                </span>
            </div>

            <button
                type="button"
                class="select-project-message-close"
                aria-label="Close"
                title="Close"
            >×</button>
        `;

        document.body.appendChild(
            message
        );
    }


    const closeGuide = () => {

        document.body.classList.remove(
            "select-project-mode"
        );

        document
            .querySelectorAll(
                ".select-project-focus-table"
            )
            .forEach(element => {
                element.classList.remove(
                    "select-project-focus-table"
                );
            });

        message?.remove();

        const cleanUrl =
            new URL(
                window.location.href
            );

        cleanUrl.searchParams.delete(
            "select_project"
        );

        window.history.replaceState(
            {},
            document.title,
            cleanUrl.pathname +
            cleanUrl.search +
            cleanUrl.hash
        );
    };


    const closeButton =
        message.querySelector(
            ".select-project-message-close"
        );

    if (closeButton) {

        const cleanCloseButton =
            closeButton.cloneNode(true);

        closeButton.replaceWith(
            cleanCloseButton
        );

        cleanCloseButton.addEventListener(
            "click",
            closeGuide
        );
    }


    const focusProjectTable = () => {

        const tableBody =
            document.getElementById(
                "projectsTable"
            );

        const tableContainer =
            tableBody?.closest(
                ".table-container"
            );

        if (!tableContainer) {
            return false;
        }

        // Focus the table container immediately, even before
        // project rows finish loading.
        tableContainer.classList.add(
            "select-project-focus-table"
        );

        const firstAction =
            tableContainer.querySelector(
                ".project-action-trigger"
            );

        if (!firstAction) {
            return false;
        }

        tableContainer.scrollIntoView({
            behavior: "auto",
            block: "center"
        });

        return true;
    };


    if (focusProjectTable()) {
        return;
    }


    const tableBody =
        document.getElementById(
            "projectsTable"
        );

    if (tableBody) {

        const observer =
            new MutationObserver(() => {

                if (focusProjectTable()) {
                    observer.disconnect();
                }
            });

        observer.observe(
            tableBody,
            {
                childList: true,
                subtree: true
            }
        );

        setTimeout(
            () => observer.disconnect(),
            10000
        );

        return;
    }


    // Fallback only if the expected table is temporarily missing.
    const fallback =
        setInterval(() => {

            if (focusProjectTable()) {
                clearInterval(fallback);
            }

        }, 50);

    setTimeout(() => {
        clearInterval(fallback);
    }, 10000);
}


document.addEventListener(
    "DOMContentLoaded",
    initializeSelectProjectMode
);
