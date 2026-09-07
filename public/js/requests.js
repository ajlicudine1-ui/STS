// ============================================================
// DEVTRACK - REQUESTS
// ============================================================

let requestsData = [];
let editingRequestId = null;
let reviewingRequestId = null;
let requestsViewer = null;


// ============================================================
// ELEMENTS
// ============================================================

const requestModal =
    document.getElementById(
        "requestModal"
    );

const newRequestBtn =
    document.getElementById(
        "newRequestBtn"
    );

const closeRequestModalBtn =
    document.getElementById(
        "closeRequestModal"
    );

const cancelRequestBtn =
    document.getElementById(
        "cancelRequestBtn"
    );

const requestForm =
    document.getElementById(
        "requestForm"
    );

const requestModalTitle =
    document.getElementById(
        "requestModalTitle"
    );

const requestReferenceNo =
    document.getElementById(
        "requestReferenceNo"
    );

const requestDate =
    document.getElementById(
        "requestDate"
    );

const requestingOffice =
    document.getElementById(
        "requestingOffice"
    );

const requestEndUser =
    document.getElementById(
        "requestEndUser"
    );

const requestSystemName =
    document.getElementById(
        "requestSystemName"
    );

const requestOtherTypeGroup =
    document.getElementById(
        "requestOtherTypeGroup"
    );

const requestOtherType =
    document.getElementById(
        "requestOtherType"
    );

const requestFormFile =
    document.getElementById(
        "requestFormFile"
    );

const saveRequestBtn =
    document.getElementById(
        "saveRequestBtn"
    );

const requestsTableBody =
    document.getElementById(
        "requestsTableBody"
    );

const requestSearchInput =
    document.getElementById(
        "requestSearchInput"
    );

const requestStatusFilter =
    document.getElementById(
        "requestStatusFilter"
    );

const requestTypeFilter =
    document.getElementById(
        "requestTypeFilter"
    );

const totalRequests =
    document.getElementById(
        "totalRequests"
    );

const pendingRequests =
    document.getElementById(
        "pendingRequests"
    );

const forReviewRequests =
    document.getElementById(
        "forReviewRequests"
    );

const approvedRequests =
    document.getElementById(
        "approvedRequests"
    );

const requestReviewModal =
    document.getElementById(
        "requestReviewModal"
    );

const closeRequestReviewModalBtn =
    document.getElementById(
        "closeRequestReviewModal"
    );

const cancelRequestReviewBtn =
    document.getElementById(
        "cancelRequestReviewBtn"
    );

const requestReviewForm =
    document.getElementById(
        "requestReviewForm"
    );

const requestReviewReference =
    document.getElementById(
        "requestReviewReference"
    );

const requestReviewSystem =
    document.getElementById(
        "requestReviewSystem"
    );

const requestReviewOffice =
    document.getElementById(
        "requestReviewOffice"
    );

const requestReviewStatus =
    document.getElementById(
        "requestReviewStatus"
    );

const saveRequestReviewBtn =
    document.getElementById(
        "saveRequestReviewBtn"
    );


// ============================================================
// HELPERS
// ============================================================

function escapeHtml(value) {

    return String(
        value ??
        ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


function getTodayValue() {

    const now =
        new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );

    return `${year}-${month}-${day}`;
}


function formatRequestDate(value) {

    if (!value) {
        return "—";
    }

    const parts =
        String(value)
            .split("-");

    if (parts.length !== 3) {
        return value;
    }

    return `${parts[1]}/${parts[2]}/${parts[0]}`;
}


function getStatusClass(status) {

    switch (status) {

        case "For Review":
            return "request-status-review";

        case "Approved":
            return "request-status-approved";

        case "Rejected":
            return "request-status-rejected";

        case "Completed":
            return "request-status-completed";

        case "Pending":
        default:
            return "request-status-pending";
    }
}


function closeRequestModalWindow() {

    if (requestModal) {
        requestModal.classList.remove(
            "show"
        );
    }
}


function updateRequestSummaryCards() {

    const countByStatus = status =>
        requestsData.filter(
            request =>
                (request.status || "Pending") ===
                status
        ).length;

    if (totalRequests) {
        totalRequests.textContent =
            String(requestsData.length);
    }

    if (pendingRequests) {
        pendingRequests.textContent =
            String(countByStatus("Pending"));
    }

    if (forReviewRequests) {
        forReviewRequests.textContent =
            String(countByStatus("For Review"));
    }

    if (approvedRequests) {
        approvedRequests.textContent =
            String(countByStatus("Approved"));
    }
}


function closeRequestReviewModalWindow() {

    if (requestReviewModal) {
        requestReviewModal.classList.remove(
            "show"
        );
    }

    reviewingRequestId = null;
}


function openRequestReviewModal(request) {

    if (
        !requestReviewModal ||
        !request
    ) {
        return;
    }

    reviewingRequestId =
        request.request_id;

    if (requestReviewReference) {
        requestReviewReference.value =
            request.request_reference_no || "";
    }

    if (requestReviewSystem) {
        requestReviewSystem.value =
            request.system_application_name || "";
    }

    if (requestReviewOffice) {
        requestReviewOffice.value =
            request.requesting_office || "";
    }

    if (requestReviewStatus) {
        requestReviewStatus.value =
            request.status || "Pending";
    }

    requestReviewModal.classList.add(
        "show"
    );
}


function updateOtherTypeVisibility() {

    const checked =
        document.querySelector(
            'input[name="requestType"]:checked'
        );

    const isOther =
        checked?.value ===
        "Other";

    if (requestOtherTypeGroup) {
        requestOtherTypeGroup.hidden =
            !isOther;
    }

    if (requestOtherType) {

        requestOtherType.required =
            isOther;

        if (!isOther) {
            requestOtherType.value =
                "";
        }
    }
}


// ============================================================
// REQUEST FORM FILE SELECTION
// - Upload is required when creating a new request.
// - The selected file is shown with an X so the user can remove
//   a wrong file before saving.
// ============================================================

let requestSelectedFileDisplay =
    null;


function ensureRequestSelectedFileDisplay() {

    if (
        requestSelectedFileDisplay ||
        !requestFormFile
    ) {
        return;
    }

    requestSelectedFileDisplay =
        document.createElement(
            "div"
        );

    requestSelectedFileDisplay.id =
        "requestSelectedFileDisplay";

    requestSelectedFileDisplay.style.display =
        "none";

    requestSelectedFileDisplay.style.marginTop =
        "10px";

    requestFormFile.insertAdjacentElement(
        "afterend",
        requestSelectedFileDisplay
    );
}


function renderRequestSelectedFile() {

    ensureRequestSelectedFileDisplay();

    if (!requestSelectedFileDisplay) {
        return;
    }

    const file =
        requestFormFile
            ?.files?.[0] ||
        null;

    if (!file) {

        requestSelectedFileDisplay.innerHTML =
            "";

        requestSelectedFileDisplay.style.display =
            "none";

        return;
    }

    const fileSizeMb =
        (
            Number(file.size || 0) /
            1024 /
            1024
        ).toFixed(2);

    requestSelectedFileDisplay.style.display =
        "flex";

    requestSelectedFileDisplay.style.alignItems =
        "center";

    requestSelectedFileDisplay.style.justifyContent =
        "space-between";

    requestSelectedFileDisplay.style.gap =
        "12px";

    requestSelectedFileDisplay.style.padding =
        "10px 12px";

    requestSelectedFileDisplay.style.border =
        "1px solid #d8e0e8";

    requestSelectedFileDisplay.style.borderRadius =
        "9px";

    requestSelectedFileDisplay.style.background =
        "#ffffff";

    requestSelectedFileDisplay.innerHTML = `
        <div
            style="
                min-width:0;
                display:flex;
                align-items:center;
                gap:9px;
            "
        >
            <span aria-hidden="true">📄</span>

            <div style="min-width:0;">
                <div
                    style="
                        color:#334155;
                        font-size:13px;
                        font-weight:700;
                        white-space:nowrap;
                        overflow:hidden;
                        text-overflow:ellipsis;
                        max-width:420px;
                    "
                    title="${escapeHtml(file.name)}"
                >
                    ${escapeHtml(file.name)}
                </div>

                <div
                    style="
                        margin-top:2px;
                        color:#94a3b8;
                        font-size:11px;
                    "
                >
                    ${escapeHtml(fileSizeMb)} MB
                </div>
            </div>
        </div>

        <button
            type="button"
            id="removeRequestSelectedFileBtn"
            aria-label="Remove selected file"
            title="Remove selected file"
            style="
                width:30px;
                height:30px;
                flex:0 0 30px;
                display:inline-flex;
                align-items:center;
                justify-content:center;
                border:1px solid #fecaca;
                border-radius:8px;
                background:#fff;
                color:#b91c1c;
                font-size:20px;
                line-height:1;
                cursor:pointer;
            "
        >
            &times;
        </button>
    `;

    const removeButton =
        requestSelectedFileDisplay.querySelector(
            "#removeRequestSelectedFileBtn"
        );

    if (removeButton) {

        removeButton.addEventListener(
            "click",
            () => {

                if (requestFormFile) {
                    requestFormFile.value =
                        "";
                }

                renderRequestSelectedFile();

                requestFormFile?.focus();
            }
        );
    }
}


function setRequestUploadRequirement() {

    if (!requestFormFile) {
        return;
    }

    // A new request must always include a request form.
    // When editing, an already-uploaded form satisfies the requirement.
    const existingRequest =
        editingRequestId
            ? requestsData.find(
                item =>
                    String(item.request_id) ===
                    String(editingRequestId)
            )
            : null;

    const hasExistingUpload =
        Boolean(
            existingRequest
                ?.uploaded_file_id ||
            existingRequest
                ?.uploaded_file_url
        );

    requestFormFile.required =
        !editingRequestId ||
        !hasExistingUpload;
}


async function getNextRequestReference() {

    const response =
        await fetch(
            "/api/requests-next-reference"
        );

    const result =
        await response.json();

    if (
        !response.ok ||
        !result.success
    ) {
        throw new Error(
            result.error ||
            "Unable to generate request reference."
        );
    }

    return result
        .request_reference_no;
}


// ============================================================
// MODAL
// ============================================================

async function openNewRequestModal() {

    editingRequestId =
        null;

    if (requestForm) {
        requestForm.reset();
    }

    if (requestFormFile) {
        requestFormFile.value =
            "";
    }

    renderRequestSelectedFile();
    setRequestUploadRequirement();

    if (requestModalTitle) {
        requestModalTitle.textContent =
            "New Request";
    }

    if (saveRequestBtn) {
        saveRequestBtn.textContent =
            "Save Request";
    }

    if (requestDate) {
        requestDate.value =
            getTodayValue();
    }

    if (requestReferenceNo) {
        requestReferenceNo.value =
            "Generating...";
    }

    updateOtherTypeVisibility();

    if (requestModal) {
        requestModal.classList.add(
            "show"
        );
    }

    try {

        const nextReference =
            await getNextRequestReference();

        if (
            !editingRequestId &&
            requestReferenceNo
        ) {
            requestReferenceNo.value =
                nextReference;
        }

    } catch (error) {

        console.error(
            "NEXT REQUEST REFERENCE ERROR:",
            error
        );

        if (requestReferenceNo) {
            requestReferenceNo.value =
                "Auto-generated on save";
        }
    }
}


function openEditRequestModal(request) {

    editingRequestId =
        request.request_id;

    if (requestModalTitle) {
        requestModalTitle.textContent =
            "Edit Request";
    }

    if (saveRequestBtn) {
        saveRequestBtn.textContent =
            "Save Changes";
    }

    if (requestReferenceNo) {
        requestReferenceNo.value =
            request.request_reference_no ||
            "";
    }

    if (requestDate) {
        requestDate.value =
            request.date_requested ||
            "";
    }

    if (requestingOffice) {
        requestingOffice.value =
            request.requesting_office ||
            "";
    }

    if (requestEndUser) {
        requestEndUser.value =
            request.end_user ||
            "";
    }

    if (requestSystemName) {
        requestSystemName.value =
            request.system_application_name ||
            "";
    }

    const radio =
        document.querySelector(
            `input[name="requestType"][value="${CSS.escape(
                request.request_type ||
                ""
            )}"]`
        );

    if (radio) {
        radio.checked =
            true;
    }

    if (requestOtherType) {
        requestOtherType.value =
            request.request_type_other ||
            "";
    }

    if (requestFormFile) {
        requestFormFile.value =
            "";
    }

    renderRequestSelectedFile();
    setRequestUploadRequirement();

    updateOtherTypeVisibility();

    if (requestModal) {
        requestModal.classList.add(
            "show"
        );
    }
}


// ============================================================
// TABLE
// ============================================================

function getFilteredRequests() {

    const searchTerm =
        String(
            requestSearchInput?.value ||
            ""
        )
            .trim()
            .toLowerCase();

    const statusFilter =
        String(
            requestStatusFilter?.value ||
            ""
        );

    const typeFilter =
        String(
            requestTypeFilter?.value ||
            ""
        );

    return requestsData.filter(
        request => {

            if (
                statusFilter &&
                request.status !==
                    statusFilter
            ) {
                return false;
            }

            if (
                typeFilter &&
                request.request_type !==
                    typeFilter
            ) {
                return false;
            }

            if (!searchTerm) {
                return true;
            }

            const haystack = [
                request.request_reference_no,
                request.requesting_office,
                request.end_user,
                request.system_application_name,
                request.request_type,
                request.request_type_other,
                request.status
            ]
                .map(
                    value =>
                        String(
                            value ||
                            ""
                        )
                            .toLowerCase()
                )
                .join(
                    " "
                );

            return haystack.includes(
                searchTerm
            );
        }
    );
}


function renderRequests() {

    if (!requestsTableBody) {
        return;
    }

    updateRequestSummaryCards();

    const rows =
        getFilteredRequests();

    if (rows.length === 0) {

        requestsTableBody.innerHTML = `
            <tr>
                <td
                    class="request-empty-state"
                    colspan="9"
                >
                    No requests found.
                </td>
            </tr>
        `;

        return;
    }

    const isAdmin =
        requestsViewer?.role ===
        "admin";

    requestsTableBody.innerHTML =
        rows.map(
            request => {

                const requestType =
                    request.request_type ===
                        "Other" &&
                    request.request_type_other
                        ? request.request_type_other
                        : request.request_type;

                const formHtml =
                    request.uploaded_file_url
                        ? `
                            <button
                                type="button"
                                class="request-action-btn view-request-form"
                                data-request-id="${request.request_id}"
                            >
                                View Form
                            </button>
                        `
                        : `<span>—</span>`;

                return `
                    <tr>
                        <td>
                            <strong>
                                ${escapeHtml(
                                    request.request_reference_no
                                )}
                            </strong>
                        </td>

                        <td>
                            ${escapeHtml(
                                formatRequestDate(
                                    request.date_requested
                                )
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                request.requesting_office
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                request.end_user
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                request.system_application_name
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                requestType ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${formHtml}
                        </td>

                        <td>
                            <span
                                class="request-status ${getStatusClass(
                                    request.status
                                )}"
                            >
                                ${escapeHtml(
                                    request.status ||
                                    "Pending"
                                )}
                            </span>
                        </td>

                        <td>
                            ${
                                isAdmin
                                    ? `
                                        <div class="request-action-menu-wrapper">

                                            <button
                                                type="button"
                                                class="request-action-menu-trigger"
                                                data-request-id="${request.request_id}"
                                                aria-expanded="false"
                                            >
                                                <span>Actions</span>
                                                <span class="request-action-menu-arrow">▾</span>
                                            </button>

                                            <div
                                                class="request-action-dropdown"
                                                data-request-menu="${request.request_id}"
                                                hidden
                                            >

                                                <button
                                                    type="button"
                                                    class="request-action-dropdown-item review-request"
                                                    data-request-id="${request.request_id}"
                                                >
                                                    <span class="request-dropdown-icon">✓</span>
                                                    <span>Review Request</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    class="request-action-dropdown-item edit-request"
                                                    data-request-id="${request.request_id}"
                                                >
                                                    <span class="request-dropdown-icon">✎</span>
                                                    <span>Edit</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    class="request-action-dropdown-item request-action-delete delete-request"
                                                    data-request-id="${request.request_id}"
                                                >
                                                    <span class="request-dropdown-icon">🗑</span>
                                                    <span>Delete</span>
                                                </button>

                                            </div>

                                        </div>
                                    `
                                    : `<span>—</span>`
                            }
                        </td>
                    </tr>
                `;
            }
        ).join(
            ""
        );

    bindRequestRowActions();
}


function bindRequestRowActions() {
  
    // ============================================================
    // ACTIONS DROPDOWN
    // ============================================================

    document
        .querySelectorAll(
            ".request-action-menu-trigger"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();
                        event.stopPropagation();

                        const requestId =
                            button.dataset.requestId;

                        const menu =
                            document.querySelector(
                                `[data-request-menu="${CSS.escape(
                                    requestId
                                )}"]`
                            );

                        if (!menu) {
                            return;
                        }

                        const buttonRect =
                            button.getBoundingClientRect();

                        const menuWidth =
                            170;

                        let left =
                            buttonRect.right -
                            menuWidth;

                        let top =
                            buttonRect.bottom +
                            8;


                        // Prevent menu from going outside right side.
                        if (
                            left + menuWidth >
                            window.innerWidth - 12
                        ) {
                            left =
                                window.innerWidth -
                                menuWidth -
                                12;
                        }


                        // Prevent menu from going outside left side.
                        if (left < 12) {
                            left = 12;
                        }


                        // If there is not enough room below,
                        // show the dropdown above the Actions button.
                        const estimatedMenuHeight =
                            160;

                        if (
                            top + estimatedMenuHeight >
                            window.innerHeight - 12
                        ) {
                            top =
                                buttonRect.top -
                                estimatedMenuHeight -
                                8;
                        }


                        menu.style.left =
                            `${left}px`;

                        menu.style.top =
                            `${top}px`;

                        menu.style.right =
                            "auto";

                        const willOpen =
                            menu.hidden;

                        document
                            .querySelectorAll(
                                ".request-action-dropdown"
                            )
                            .forEach(
                                otherMenu => {
                                    otherMenu.hidden =
                                        true;
                                }
                            );

                        document
                            .querySelectorAll(
                                ".request-action-menu-trigger"
                            )
                            .forEach(
                                otherButton => {

                                    otherButton.setAttribute(
                                        "aria-expanded",
                                        "false"
                                    );
                                }
                            );

                        menu.hidden =
                            !willOpen;

                        button.setAttribute(
                            "aria-expanded",
                            willOpen
                                ? "true"
                                : "false"
                        );
                    }
                );
            }
        );


    // KEEP YOUR EXISTING VIEW FORM CODE BELOW
    document
        .querySelectorAll(
            ".view-request-form"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const request =
                            requestsData.find(
                                item =>
                                    String(
                                        item.request_id
                                    ) ===
                                    String(
                                        button.dataset.requestId
                                    )
                            );

                        if (
                            request
                                ?.uploaded_file_url
                        ) {
                            window.open(
                                request.uploaded_file_url,
                                "_blank",
                                "noopener,noreferrer"
                            );
                        }
                    }
                );
            }
        );

    document
        .querySelectorAll(
            ".review-request"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const request =
                            requestsData.find(
                                item =>
                                    String(
                                        item.request_id
                                    ) ===
                                    String(
                                        button.dataset.requestId
                                    )
                            );

                        if (request) {
                            openRequestReviewModal(
                                request
                            );
                        }
                    }
                );
            }
        );


    document
        .querySelectorAll(
            ".edit-request"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const request =
                            requestsData.find(
                                item =>
                                    String(
                                        item.request_id
                                    ) ===
                                    String(
                                        button.dataset.requestId
                                    )
                            );

                        if (request) {
                            openEditRequestModal(
                                request
                            );
                        }
                    }
                );
            }
        );


    document
        .querySelectorAll(
            ".delete-request"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        const request =
                            requestsData.find(
                                item =>
                                    String(
                                        item.request_id
                                    ) ===
                                    String(
                                        button.dataset.requestId
                                    )
                            );

                        if (!request) {
                            return;
                        }

                        const confirmed =
                            window.confirm(
                                `Delete ${request.request_reference_no}? This will also delete its Google Drive request folder.`
                            );

                        if (!confirmed) {
                            return;
                        }

                        const originalButtonHtml =
                            button.innerHTML;

                        button.disabled =
                            true;

                        button.innerHTML = `
                            <span class="request-dropdown-icon">⌛</span>
                            <span>Deleting...</span>
                        `;

                        try {

                            const response =
                                await fetch(
                                    `/api/requests/${encodeURIComponent(
                                        request.request_id
                                    )}`,
                                    {
                                        method:
                                            "DELETE"
                                    }
                                );

                            const result =
                                await response.json();

                            if (
                                !response.ok ||
                                !result.success
                            ) {
                                throw new Error(
                                    result.error ||
                                    "Unable to delete request."
                                );
                            }

                            await loadRequests(
                                false
                            );

                        } catch (error) {

                            alert(
                                error.message
                            );

                            button.disabled =
                                false;

                            button.innerHTML =
                                originalButtonHtml;
                        }
                    }
                );
            }
        );
}


// ============================================================
// LOAD
// ============================================================

async function loadRequests(
    showLoading = true
) {

    if (
        showLoading &&
        requestsTableBody
    ) {

        requestsTableBody.innerHTML = `
            <tr>
                <td
                    class="request-empty-state"
                    colspan="9"
                >
                    Loading requests...
                </td>
            </tr>
        `;
    }

    try {

        const response =
            await fetch(
                "/api/requests"
            );

        const result =
            await response.json();

        if (
            !response.ok ||
            !result.success
        ) {
            throw new Error(
                result.error ||
                "Unable to load requests."
            );
        }

        requestsData =
            Array.isArray(
                result.requests
            )
                ? result.requests
                : [];

        requestsViewer =
            result.viewer ||
            window.DevTAuth
                ?.getProfile?.() ||
            null;

        renderRequests();

    } catch (error) {

        console.error(
            "LOAD REQUESTS ERROR:",
            error
        );

        if (requestsTableBody) {

            requestsTableBody.innerHTML = `
                <tr>
                    <td
                        class="request-empty-state"
                        colspan="9"
                    >
                        ${escapeHtml(
                            error.message
                        )}
                    </td>
                </tr>
            `;
        }
    }
}


// ============================================================
// REVIEW REQUEST STATUS - ADMIN ONLY
// ============================================================

async function saveRequestReview(event) {

    event.preventDefault();

    if (
        !reviewingRequestId ||
        !requestReviewStatus?.value
    ) {
        return;
    }

    const originalButtonText =
        saveRequestReviewBtn?.textContent ||
        "Update Status";

    if (saveRequestReviewBtn) {
        saveRequestReviewBtn.disabled = true;
        saveRequestReviewBtn.textContent =
            "Updating...";
    }

    try {

        const response =
            await fetch(
                `/api/requests/${encodeURIComponent(
                    reviewingRequestId
                )}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        status:
                            requestReviewStatus.value
                    })
                }
            );

        const result =
            await response.json();

        if (
            !response.ok ||
            !result.success
        ) {
            throw new Error(
                result.error ||
                result.details ||
                "Unable to update request status."
            );
        }

        closeRequestReviewModalWindow();
        await loadRequests(false);

    } catch (error) {

        alert(error.message);

    } finally {

        if (saveRequestReviewBtn) {
            saveRequestReviewBtn.disabled = false;
            saveRequestReviewBtn.textContent =
                originalButtonText;
        }
    }
}


// ============================================================
// SAVE
// ============================================================

async function uploadRequestFile(
    requestId,
    file
) {

    if (!file) {
        return;
    }

    const response =
        await fetch(
            `/api/requests/${encodeURIComponent(
                requestId
            )}/upload`,
            {
                method:
                    "POST",

                headers: {
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
                        )
                },

                body:
                    file
            }
        );

    const result =
        await response.json();

    if (
        !response.ok ||
        !result.success
    ) {
        throw new Error(
            result.error ||
            "Request was saved, but the form could not be uploaded."
        );
    }
}


async function saveRequest(event) {

    event.preventDefault();

    const selectedType =
        document.querySelector(
            'input[name="requestType"]:checked'
        )?.value ||
        "";

    setRequestUploadRequirement();

    const selectedFileBeforeSave =
        requestFormFile
            ?.files?.[0] ||
        null;

    if (
        requestFormFile?.required &&
        !selectedFileBeforeSave
    ) {

        requestFormFile.reportValidity();

        return;
    }

    const payload = {
        date_requested:
            requestDate?.value ||
            "",

        requesting_office:
            requestingOffice?.value
                ?.trim() ||
            "",

        end_user:
            requestEndUser?.value
                ?.trim() ||
            "",

        system_application_name:
            requestSystemName?.value
                ?.trim() ||
            "",

        request_type:
            selectedType,

        request_type_other:
            selectedType ===
                "Other"
                ? requestOtherType?.value
                    ?.trim() ||
                    ""
                : null
    };

    if (saveRequestBtn) {
        saveRequestBtn.disabled =
            true;

        saveRequestBtn.textContent =
            editingRequestId
                ? "Saving..."
                : "Creating...";
    }

    try {

        const url =
            editingRequestId
                ? `/api/requests/${encodeURIComponent(
                    editingRequestId
                )}`
                : "/api/requests";

        const response =
            await fetch(
                url,
                {
                    method:
                        editingRequestId
                            ? "PATCH"
                            : "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );

        const result =
            await response.json();

        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.details
                    ? `${result.error}\n\n${result.details}`
                    : result.error ||
                    "Unable to save request."
            );
        }

        const savedRequest =
            result.request;

        const selectedFile =
            selectedFileBeforeSave;

        if (
            selectedFile &&
            savedRequest?.request_id
        ) {

            if (saveRequestBtn) {
                saveRequestBtn.textContent =
                    "Uploading Form...";
            }

            await uploadRequestFile(
                savedRequest.request_id,
                selectedFile
            );
        }

        closeRequestModalWindow();

        await loadRequests(
            false
        );

    } catch (error) {

        alert(
            error.message
        );

    } finally {

        if (saveRequestBtn) {

            saveRequestBtn.disabled =
                false;

            saveRequestBtn.textContent =
                editingRequestId
                    ? "Save Changes"
                    : "Save Request";
        }
    }
}


// ============================================================
// EVENTS
// ============================================================

if (newRequestBtn) {

    newRequestBtn.addEventListener(
        "click",
        openNewRequestModal
    );
}


if (closeRequestModalBtn) {

    closeRequestModalBtn.addEventListener(
        "click",
        closeRequestModalWindow
    );
}


if (cancelRequestBtn) {

    cancelRequestBtn.addEventListener(
        "click",
        closeRequestModalWindow
    );
}


if (closeRequestReviewModalBtn) {
    closeRequestReviewModalBtn.addEventListener(
        "click",
        closeRequestReviewModalWindow
    );
}


if (cancelRequestReviewBtn) {
    cancelRequestReviewBtn.addEventListener(
        "click",
        closeRequestReviewModalWindow
    );
}


if (requestReviewForm) {
    requestReviewForm.addEventListener(
        "submit",
        saveRequestReview
    );
}


if (requestReviewModal) {
    requestReviewModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                requestReviewModal
            ) {
                closeRequestReviewModalWindow();
            }
        }
    );
}


if (requestModal) {

    requestModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                requestModal
            ) {
                closeRequestModalWindow();
            }
        }
    );
}


document
    .querySelectorAll(
        'input[name="requestType"]'
    )
    .forEach(
        radio => {

            radio.addEventListener(
                "change",
                updateOtherTypeVisibility
            );
        }
    );


if (requestFormFile) {

    requestFormFile.addEventListener(
        "change",
        renderRequestSelectedFile
    );
}


if (requestForm) {

    requestForm.addEventListener(
        "submit",
        saveRequest
    );
}


if (requestSearchInput) {

    requestSearchInput.addEventListener(
        "input",
        renderRequests
    );
}


if (requestStatusFilter) {

    requestStatusFilter.addEventListener(
        "change",
        renderRequests
    );
}


if (requestTypeFilter) {

    requestTypeFilter.addEventListener(
        "change",
        renderRequests
    );
}


// ============================================================
// INITIAL LOAD
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        ensureRequestSelectedFileDisplay();
        renderRequestSelectedFile();

        loadRequests();
    }
);

document.addEventListener(
    "click",
    () => {

        document
            .querySelectorAll(
                ".request-action-dropdown"
            )
            .forEach(
                menu => {
                    menu.hidden =
                        true;
                }
            );

        document
            .querySelectorAll(
                ".request-action-menu-trigger"
            )
            .forEach(
                button => {

                    button.setAttribute(
                        "aria-expanded",
                        "false"
                    );
                }
            );
    }
);
