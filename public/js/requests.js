// ============================================================
// DEVTRACK - REQUESTS
// ============================================================

let requestsData = [];
let editingRequestId = null;
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
                            112;

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

                            await loadRequests();

                        } catch (error) {

                            alert(
                                error.message
                            );
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
            requestFormFile
                ?.files?.[0] ||
            null;

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

        await loadRequests();

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
