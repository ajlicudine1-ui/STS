// ============================================================
// DEVTRACK - PROJECT MAINTENANCE
// ============================================================

const maintenanceParams = new URLSearchParams(window.location.search);
const maintenanceProjectId = maintenanceParams.get("project_id") || "";

let maintenanceRecords = [];
let maintenancePersonnel = [];
let currentMaintenanceProject = null;
let editingMaintenanceId = null;
const maintenanceGreenSelects = new Map();

const maintenancePageSubtitle = document.getElementById("maintenancePageSubtitle");
const addMaintenanceBtn = document.getElementById("addMaintenanceBtn");
const totalMaintenance = document.getElementById("totalMaintenance");
const activeMaintenance = document.getElementById("activeMaintenance");
const inactiveMaintenance = document.getElementById("inactiveMaintenance");
const maintenanceFiles = document.getElementById("maintenanceFiles");
const maintenanceSearch = document.getElementById("maintenanceSearch");
const maintenanceStatusFilter = document.getElementById("maintenanceStatusFilter");
const maintenanceTableBody = document.getElementById("maintenanceTableBody");

const maintenanceModal = document.getElementById("maintenanceModal");
const maintenanceModalTitle = document.getElementById("maintenanceModalTitle");
const maintenanceModalProjectName = document.getElementById("maintenanceModalProjectName");
const maintenanceForm = document.getElementById("maintenanceForm");
const maintenanceDate = document.getElementById("maintenanceDate");
const maintenancePersonnelList = document.getElementById("maintenancePersonnelList");
const addMaintenancePersonBtn = document.getElementById("addMaintenancePersonBtn");
const maintenanceFile = document.getElementById("maintenanceFile");
const maintenanceFileHelp = document.getElementById("maintenanceFileHelp");
const currentMaintenanceFile = document.getElementById("currentMaintenanceFile");
const maintenanceFormError = document.getElementById("maintenanceFormError");
const saveMaintenanceBtn = document.getElementById("saveMaintenanceBtn");
const closeMaintenanceModalBtn = document.getElementById("closeMaintenanceModal");
const cancelMaintenanceBtn = document.getElementById("cancelMaintenanceBtn");

if (addMaintenancePersonBtn) {
    addMaintenancePersonBtn.addEventListener("click", () => {
        if (!maintenancePersonnelList) return;

        maintenancePersonnelList.appendChild(createMaintenancePersonRow());
        refreshMaintenancePersonRows();

        const latestTrigger = maintenancePersonnelList.querySelector(
            ".maintenance-person-row:last-child .maintenance-person-trigger"
        );
        latestTrigger?.focus();
    });
}


function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


async function readJsonResponse(response) {
    const responseText = await response.text();

    if (!responseText) {
        return {};
    }

    try {
        return JSON.parse(responseText);
    } catch (_) {
        return { error: responseText };
    }
}


function getLocalDateValue() {
    const now = new Date();
    const localDate = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
    );

    return localDate.toISOString().slice(0, 10);
}


function formatMaintenanceDate(value) {
    if (!value) return "—";

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
}


function showMaintenanceError(message) {
    if (!maintenanceFormError) return;

    maintenanceFormError.textContent = message;
    maintenanceFormError.hidden = false;
}


function clearMaintenanceError() {
    if (!maintenanceFormError) return;

    maintenanceFormError.textContent = "";
    maintenanceFormError.hidden = true;
}


function closeAllMaintenanceGreenSelects(except = null) {
    maintenanceGreenSelects.forEach(control => {
        if (control.wrapper === except) return;

        control.wrapper.classList.remove("is-open");
        control.menu.hidden = true;
        control.trigger.setAttribute("aria-expanded", "false");
    });
}


function syncMaintenanceGreenSelect(select) {
    const control = maintenanceGreenSelects.get(select);
    if (!control) return;

    const selectedOption = select.options[select.selectedIndex];
    control.label.textContent = selectedOption?.textContent || "Select option";
    control.trigger.classList.toggle("has-value", Boolean(select.value));
    control.trigger.disabled = select.disabled;

    control.menu.querySelectorAll(".maintenance-green-option").forEach(option => {
        const isSelected = option.dataset.value === select.value;
        option.classList.toggle("is-selected", isSelected);
        option.setAttribute("aria-selected", String(isSelected));
    });
}


function upgradeMaintenanceGreenSelect(select) {
    if (!select || maintenanceGreenSelects.has(select)) return;

    select.classList.add("maintenance-native-select-hidden");
    select.tabIndex = -1;

    const wrapper = document.createElement("div");
    wrapper.className = "maintenance-green-select";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "maintenance-green-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute(
        "aria-label",
        select.id === "maintenanceStatusFilter"
            ? "Filter maintenance status"
            : "Maintenance status"
    );

    const label = document.createElement("span");
    label.className = "maintenance-green-trigger-label";

    const arrow = document.createElement("span");
    arrow.className = "maintenance-green-trigger-arrow";
    arrow.textContent = "⌄";
    arrow.setAttribute("aria-hidden", "true");
    trigger.append(label, arrow);

    const menu = document.createElement("div");
    menu.className = "maintenance-green-menu";
    menu.setAttribute("role", "listbox");
    menu.hidden = true;

    Array.from(select.options).forEach(nativeOption => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "maintenance-green-option";
        option.dataset.value = nativeOption.value;
        option.textContent = nativeOption.textContent;
        option.disabled = nativeOption.disabled;
        option.setAttribute("role", "option");
        option.addEventListener("click", event => {
            event.stopPropagation();
            select.value = option.dataset.value;
            select.dispatchEvent(new Event("change", { bubbles: true }));
            wrapper.classList.remove("is-open");
            menu.hidden = true;
            trigger.setAttribute("aria-expanded", "false");
            syncMaintenanceGreenSelect(select);
        });
        menu.appendChild(option);
    });

    trigger.addEventListener("click", event => {
        event.stopPropagation();
        const shouldOpen = menu.hidden;
        closeAllMaintenanceGreenSelects(wrapper);
        closeAllMaintenancePersonDropdowns();
        wrapper.classList.toggle("is-open", shouldOpen);
        menu.hidden = !shouldOpen;
        trigger.setAttribute("aria-expanded", String(shouldOpen));
    });

    select.addEventListener("change", () => syncMaintenanceGreenSelect(select));
    wrapper.append(trigger, menu);
    select.insertAdjacentElement("afterend", wrapper);

    maintenanceGreenSelects.set(select, {
        wrapper,
        trigger,
        label,
        menu
    });
    syncMaintenanceGreenSelect(select);
}


function createMaintenancePersonRow(selectedUserId = "") {
    const row = document.createElement("div");
    row.className = "maintenance-person-row";

    const dropdown = document.createElement("div");
    dropdown.className = "maintenance-person-dropdown";
    dropdown.dataset.value = String(selectedUserId || "");

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "maintenance-person-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    const triggerLabel = document.createElement("span");
    triggerLabel.className = "maintenance-person-trigger-label";

    const triggerArrow = document.createElement("span");
    triggerArrow.className = "maintenance-person-trigger-arrow";
    triggerArrow.textContent = "⌄";
    triggerArrow.setAttribute("aria-hidden", "true");
    trigger.append(triggerLabel, triggerArrow);

    const menu = document.createElement("div");
    menu.className = "maintenance-person-menu";
    menu.setAttribute("role", "listbox");
    menu.hidden = true;

    trigger.addEventListener("click", event => {
        event.stopPropagation();
        const shouldOpen = menu.hidden;
        closeAllMaintenancePersonDropdowns(dropdown);
        menu.hidden = !shouldOpen;
        dropdown.classList.toggle("is-open", shouldOpen);
        trigger.setAttribute("aria-expanded", String(shouldOpen));
    });

    dropdown.append(trigger, menu);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "maintenance-remove-person-btn";
    removeButton.setAttribute("aria-label", "Remove person responsible");
    removeButton.textContent = "×";
    removeButton.addEventListener("click", () => {
        const rows = maintenancePersonnelList.querySelectorAll(
            ".maintenance-person-row"
        );

        if (rows.length === 1) {
            dropdown.dataset.value = "";
        } else {
            row.remove();
        }

        refreshMaintenancePersonRows();
    });

    row.append(dropdown, removeButton);
    return row;
}


function closeAllMaintenancePersonDropdowns(except = null) {
    document.querySelectorAll(".maintenance-person-dropdown").forEach(dropdown => {
        if (dropdown === except) return;

        dropdown.classList.remove("is-open");
        const menu = dropdown.querySelector(".maintenance-person-menu");
        const trigger = dropdown.querySelector(".maintenance-person-trigger");
        if (menu) menu.hidden = true;
        trigger?.setAttribute("aria-expanded", "false");
    });
}


function refreshMaintenancePersonRows() {
    if (!maintenancePersonnelList) return;

    const dropdowns = Array.from(
        maintenancePersonnelList.querySelectorAll(".maintenance-person-dropdown")
    );
    const selectedValues = new Set(
        dropdowns.map(dropdown => dropdown.dataset.value).filter(Boolean)
    );

    dropdowns.forEach(dropdown => {
        const currentValue = dropdown.dataset.value || "";
        const placeholderText = maintenancePersonnel.length
            ? "Select project personnel"
            : "No connected project personnel";

        const trigger = dropdown.querySelector(".maintenance-person-trigger");
        const triggerLabel = dropdown.querySelector(
            ".maintenance-person-trigger-label"
        );
        const menu = dropdown.querySelector(".maintenance-person-menu");
        const currentMember = maintenancePersonnel.find(
            member => String(member.user_id) === currentValue
        );

        if (triggerLabel) {
            triggerLabel.textContent = currentMember
                ? currentMember.full_name
                : placeholderText;
        }

        if (trigger) {
            trigger.disabled = maintenancePersonnel.length === 0;
            trigger.classList.toggle("has-value", Boolean(currentMember));
        }

        if (!menu) return;
        menu.innerHTML = "";

        maintenancePersonnel.forEach(member => {
            const userId = String(member.user_id);

            // Keep this row's current person, but completely hide people
            // already selected in the other responsible-person rows.
            if (userId !== currentValue && selectedValues.has(userId)) {
                return;
            }

            const option = document.createElement("button");
            option.type = "button";
            option.className = "maintenance-person-option";
            option.setAttribute("role", "option");
            option.setAttribute("aria-selected", String(userId === currentValue));
            option.classList.toggle("is-selected", userId === currentValue);
            option.textContent = member.full_name;
            option.addEventListener("click", event => {
                event.stopPropagation();
                dropdown.dataset.value = userId;
                menu.hidden = true;
                dropdown.classList.remove("is-open");
                trigger?.setAttribute("aria-expanded", "false");
                refreshMaintenancePersonRows();
            });
            menu.appendChild(option);
        });
    });

    if (addMaintenancePersonBtn) {
        addMaintenancePersonBtn.disabled =
            maintenancePersonnel.length === 0 ||
            dropdowns.length >= maintenancePersonnel.length;
    }
}


function renderPersonnelOptions(selectedUserIds = []) {
    if (!maintenancePersonnelList) return;

    maintenancePersonnelList.innerHTML = "";
    const selected = selectedUserIds
        .map(value => String(value || ""))
        .filter(userId => maintenancePersonnel.some(
            member => String(member.user_id) === userId
        ));

    (selected.length ? selected : [""]).forEach(userId => {
        maintenancePersonnelList.appendChild(
            createMaintenancePersonRow(userId)
        );
    });

    refreshMaintenancePersonRows();
}


function getSelectedPersonnelIds() {
    return Array.from(
        document.querySelectorAll(".maintenance-person-dropdown")
    ).map(dropdown => dropdown.dataset.value).filter(Boolean);
}


async function loadMaintenancePersonnel() {
    const response = await fetch(
        `/api/projects/${encodeURIComponent(maintenanceProjectId)}/members`
    );
    const result = await readJsonResponse(response);

    if (!response.ok) {
        throw new Error(
            result.error ||
            result.details ||
            "Unable to load project personnel."
        );
    }

    const uniqueMembers = new Map();

    (Array.isArray(result.members) ? result.members : []).forEach(member => {
        const userId = String(member.user_id || "").trim();
        const name = String(member.member_name || "").trim();

        if (userId && name && !uniqueMembers.has(userId)) {
            uniqueMembers.set(userId, {
                user_id: userId,
                full_name: name
            });
        }
    });

    maintenancePersonnel = Array.from(uniqueMembers.values());
}


function updateMaintenanceCards() {
    if (totalMaintenance) {
        totalMaintenance.textContent = maintenanceRecords.length;
    }

    if (activeMaintenance) {
        activeMaintenance.textContent = maintenanceRecords.filter(
            record => record.status === "Active"
        ).length;
    }

    if (inactiveMaintenance) {
        inactiveMaintenance.textContent = maintenanceRecords.filter(
            record => record.status === "Inactive"
        ).length;
    }

    if (maintenanceFiles) {
        maintenanceFiles.textContent = maintenanceRecords.filter(
            record => Boolean(record.drive_file_url)
        ).length;
    }
}


function getFilteredMaintenanceRecords() {
    const searchTerm = String(maintenanceSearch?.value || "")
        .trim()
        .toLowerCase();
    const status = maintenanceStatusFilter?.value || "";

    return maintenanceRecords.filter(record => {
        if (status && record.status !== status) {
            return false;
        }

        if (!searchTerm) {
            return true;
        }

        const people = Array.isArray(record.responsible_persons)
            ? record.responsible_persons
                .map(person => person.person_name || "")
                .join(" ")
            : "";

        return [
            record.issue,
            record.action_taken,
            record.down_time,
            record.observation_monitoring_result,
            record.action_needed,
            people
        ].join(" ").toLowerCase().includes(searchTerm);
    });
}


function renderMaintenanceRecords() {
    if (!maintenanceTableBody) return;

    updateMaintenanceCards();

    const records = getFilteredMaintenanceRecords();

    if (records.length === 0) {
        maintenanceTableBody.innerHTML = `
            <tr>
                <td colspan="11" class="maintenance-empty-state">
                    No maintenance records found.
                </td>
            </tr>
        `;
        return;
    }

    maintenanceTableBody.innerHTML = records.map(record => {
        const persons = Array.isArray(record.responsible_persons)
            ? record.responsible_persons
                .map(person => person.person_name)
                .filter(Boolean)
                .join(", ")
            : "—";

        const checklistPassed = [
            record.activities_reviewed,
            record.testing_completed,
            record.backups_completed,
            record.owner_informed,
            record.documentation_updated
        ].filter(Boolean).length;

        const fileHtml = record.drive_file_url
            ? `
                <a
                    class="maintenance-file-btn"
                    href="${escapeHtml(record.drive_file_url)}"
                    target="_blank"
                    rel="noopener noreferrer"
                >View File</a>
            `
            : "—";

        return `
            <tr>
                <td>${escapeHtml(formatMaintenanceDate(record.maintenance_date))}</td>
                <td>${escapeHtml(record.issue)}</td>
                <td>${escapeHtml(record.action_taken)}</td>
                <td>${escapeHtml(record.down_time)}</td>
                <td>${escapeHtml(persons)}</td>
                <td>
                    <span class="maintenance-status maintenance-status-${String(record.status || "").toLowerCase()}">
                        ${escapeHtml(record.status)}
                    </span>
                </td>
                <td>${escapeHtml(record.observation_monitoring_result)}</td>
                <td>${escapeHtml(record.action_needed)}</td>
                <td>
                    <span class="maintenance-checklist-result">
                        ${checklistPassed} / 5 Complete
                    </span>
                </td>
                <td>${fileHtml}</td>
                <td>
                    <div class="maintenance-row-actions">
                        <button
                            type="button"
                            class="maintenance-edit-btn"
                            data-maintenance-id="${record.maintenance_id}"
                        >Edit</button>

                        <button
                            type="button"
                            class="maintenance-delete-btn"
                            data-maintenance-id="${record.maintenance_id}"
                        >Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");

    bindMaintenanceRowActions();
}


async function loadMaintenanceRecords() {
    if (!maintenanceProjectId) {
        throw new Error("Project ID is missing from the Maintenance page URL.");
    }

    const response = await fetch(
        `/api/projects/${encodeURIComponent(maintenanceProjectId)}/maintenance`
    );
    const result = await readJsonResponse(response);

    if (!response.ok) {
        throw new Error(
            result.error ||
            result.details ||
            "Unable to load maintenance records."
        );
    }

    currentMaintenanceProject = result.project || null;
    maintenanceRecords = Array.isArray(result.maintenance)
        ? result.maintenance
        : [];

    if (maintenancePageSubtitle && currentMaintenanceProject) {
        maintenancePageSubtitle.textContent =
            `${currentMaintenanceProject.project_id} - ${currentMaintenanceProject.project_name}`;
    }

    renderMaintenanceRecords();
}


function openMaintenanceModal(record = null) {
    if (!maintenanceForm || !maintenanceModal) return;

    maintenanceForm.reset();
    clearMaintenanceError();

    editingMaintenanceId = record?.maintenance_id || null;

    if (maintenanceModalTitle) {
        maintenanceModalTitle.textContent = editingMaintenanceId
            ? "Edit Maintenance"
            : "Add Maintenance";
    }

    if (maintenanceModalProjectName) {
        maintenanceModalProjectName.textContent = currentMaintenanceProject
            ? `${currentMaintenanceProject.project_id} - ${currentMaintenanceProject.project_name}`
            : maintenanceProjectId;
    }

    maintenanceForm.elements.date.value =
        record?.maintenance_date || getLocalDateValue();
    maintenanceForm.elements.status.value =
        record?.status || "Active";
    syncMaintenanceGreenSelect(maintenanceForm.elements.status);
    maintenanceForm.elements.issue.value =
        record?.issue || "";
    maintenanceForm.elements.action_taken.value =
        record?.action_taken || "";
    maintenanceForm.elements.down_time.value =
        record?.down_time || "";
    maintenanceForm.elements.observation_monitoring_result.value =
        record?.observation_monitoring_result || "";
    maintenanceForm.elements.action_needed.value =
        record?.action_needed || "";

    maintenanceForm.elements.activities_reviewed.checked =
        record?.activities_reviewed === true;
    maintenanceForm.elements.testing_completed.checked =
        record?.testing_completed === true;
    maintenanceForm.elements.backups_completed.checked =
        record?.backups_completed === true;
    maintenanceForm.elements.owner_informed.checked =
        record?.owner_informed === true;
    maintenanceForm.elements.documentation_updated.checked =
        record?.documentation_updated === true;

    const selectedIds = Array.isArray(record?.responsible_persons)
        ? record.responsible_persons.map(person => person.user_id)
        : [];

    renderPersonnelOptions(selectedIds);

    if (maintenanceFile) {
        maintenanceFile.required = !record?.drive_file_url;
    }

    if (maintenanceFileHelp) {
        maintenanceFileHelp.textContent = record?.drive_file_url
            ? "Keep the current file or choose a replacement file."
            : "A supporting file is required for every new maintenance record.";
    }

    if (currentMaintenanceFile) {
        if (record?.drive_file_url) {
            currentMaintenanceFile.href = record.drive_file_url;
            currentMaintenanceFile.hidden = false;
        } else {
            currentMaintenanceFile.removeAttribute("href");
            currentMaintenanceFile.hidden = true;
        }
    }

    maintenanceModal.classList.add("show");
}


function closeMaintenanceModal() {
    maintenanceModal?.classList.remove("show");
    maintenanceForm?.reset();
    clearMaintenanceError();
    editingMaintenanceId = null;
}


function buildMaintenancePayload() {
    return {
        date: maintenanceForm.elements.date.value,
        issue: maintenanceForm.elements.issue.value.trim(),
        action_taken: maintenanceForm.elements.action_taken.value.trim(),
        down_time: maintenanceForm.elements.down_time.value.trim(),
        responsible_person_user_ids: getSelectedPersonnelIds(),
        status: maintenanceForm.elements.status.value,
        observation_monitoring_result:
            maintenanceForm.elements.observation_monitoring_result.value.trim(),
        action_needed:
            maintenanceForm.elements.action_needed.value.trim(),
        checklist: {
            activities_reviewed:
                maintenanceForm.elements.activities_reviewed.checked,
            testing_completed:
                maintenanceForm.elements.testing_completed.checked,
            backups_completed:
                maintenanceForm.elements.backups_completed.checked,
            owner_informed:
                maintenanceForm.elements.owner_informed.checked,
            documentation_updated:
                maintenanceForm.elements.documentation_updated.checked
        }
    };
}


async function uploadMaintenanceFile(maintenanceId, file) {
    const response = await fetch(
        `/api/projects/${encodeURIComponent(
            maintenanceProjectId
        )}/maintenance/${encodeURIComponent(
            maintenanceId
        )}/upload`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/octet-stream",
                "X-File-Name": encodeURIComponent(file.name),
                "X-File-Mime-Type": encodeURIComponent(
                    file.type || "application/octet-stream"
                )
            },
            body: file
        }
    );

    const result = await readJsonResponse(response);

    if (!response.ok) {
        throw new Error(
            result.error ||
            result.details ||
            "Unable to upload the maintenance file."
        );
    }

    return result;
}


if (maintenanceForm) {
    maintenanceForm.addEventListener("submit", async event => {
        event.preventDefault();
        clearMaintenanceError();

        if (!maintenanceForm.reportValidity()) {
            return;
        }

        const responsibleRows = Array.from(
            document.querySelectorAll(".maintenance-person-dropdown")
        );
        const selectedPersonnel = getSelectedPersonnelIds();

        if (selectedPersonnel.length === 0) {
            showMaintenanceError("Select at least one Person Responsible.");
            return;
        }

        if (responsibleRows.some(row => !row.dataset.value)) {
            showMaintenanceError(
                "Select a person in every Person Responsible row or remove the empty row."
            );
            return;
        }

        const payload = buildMaintenancePayload();

        if (!Object.values(payload.checklist).some(Boolean)) {
            showMaintenanceError(
                "Select at least one Maintenance Checklist item."
            );
            return;
        }

        const selectedFile = maintenanceFile?.files?.[0] || null;

        if (!editingMaintenanceId && !selectedFile) {
            showMaintenanceError("Upload File is required.");
            return;
        }

        const isEditing = Boolean(editingMaintenanceId);
        const endpoint = isEditing
            ? `/api/projects/${encodeURIComponent(
                maintenanceProjectId
            )}/maintenance/${encodeURIComponent(editingMaintenanceId)}`
            : `/api/projects/${encodeURIComponent(
                maintenanceProjectId
            )}/maintenance`;

        if (saveMaintenanceBtn) {
            saveMaintenanceBtn.disabled = true;
            saveMaintenanceBtn.textContent = selectedFile
                ? "Uploading..."
                : "Saving...";
        }

        let newlyCreatedId = null;

        try {
            const response = await fetch(endpoint, {
                method: isEditing ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const result = await readJsonResponse(response);

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    result.details ||
                    "Unable to save the maintenance record."
                );
            }

            const maintenanceId =
                result.maintenance?.maintenance_id || editingMaintenanceId;

            if (!maintenanceId) {
                throw new Error("The server did not return a maintenance ID.");
            }

            if (!isEditing) {
                newlyCreatedId = maintenanceId;
            }

            if (selectedFile) {
                await uploadMaintenanceFile(maintenanceId, selectedFile);
            }

            closeMaintenanceModal();
            await loadMaintenanceRecords();
            alert(
                isEditing
                    ? "Maintenance record updated successfully."
                    : "Maintenance record added successfully."
            );
        } catch (error) {
            console.error("SAVE MAINTENANCE ERROR:", error);

            if (newlyCreatedId) {
                try {
                    await fetch(
                        `/api/projects/${encodeURIComponent(
                            maintenanceProjectId
                        )}/maintenance/${encodeURIComponent(newlyCreatedId)}`,
                        { method: "DELETE" }
                    );
                } catch (_) {}
            }

            showMaintenanceError(error.message);
        } finally {
            if (saveMaintenanceBtn) {
                saveMaintenanceBtn.disabled = false;
                saveMaintenanceBtn.textContent = "Save Maintenance";
            }
        }
    });
}


function bindMaintenanceRowActions() {
    document.querySelectorAll(".maintenance-edit-btn").forEach(button => {
        button.addEventListener("click", () => {
            const maintenanceId = String(button.dataset.maintenanceId || "");
            const record = maintenanceRecords.find(
                item => String(item.maintenance_id) === maintenanceId
            );

            if (record) {
                openMaintenanceModal(record);
            }
        });
    });

    document.querySelectorAll(".maintenance-delete-btn").forEach(button => {
        button.addEventListener("click", async () => {
            const maintenanceId = String(button.dataset.maintenanceId || "");
            const record = maintenanceRecords.find(
                item => String(item.maintenance_id) === maintenanceId
            );

            if (!record) return;

            const confirmed = window.confirm(
                `Delete the maintenance record dated ${formatMaintenanceDate(
                    record.maintenance_date
                )}?\n\nThis action cannot be undone.`
            );

            if (!confirmed) return;

            button.disabled = true;

            try {
                const response = await fetch(
                    `/api/projects/${encodeURIComponent(
                        maintenanceProjectId
                    )}/maintenance/${encodeURIComponent(maintenanceId)}`,
                    { method: "DELETE" }
                );

                const result = await readJsonResponse(response);

                if (!response.ok) {
                    throw new Error(
                        result.error ||
                        result.details ||
                        "Unable to delete the maintenance record."
                    );
                }

                await loadMaintenanceRecords();
                alert("Maintenance record deleted successfully.");
            } catch (error) {
                console.error("DELETE MAINTENANCE ERROR:", error);
                alert(error.message);
                button.disabled = false;
            }
        });
    });
}


if (addMaintenanceBtn) {
    addMaintenanceBtn.addEventListener("click", () => {
        openMaintenanceModal();
    });
}


if (closeMaintenanceModalBtn) {
    closeMaintenanceModalBtn.addEventListener("click", closeMaintenanceModal);
}


if (cancelMaintenanceBtn) {
    cancelMaintenanceBtn.addEventListener("click", closeMaintenanceModal);
}


if (maintenanceModal) {
    maintenanceModal.addEventListener("click", event => {
        if (event.target === maintenanceModal) {
            closeMaintenanceModal();
        }
    });
}


maintenanceSearch?.addEventListener("input", renderMaintenanceRecords);
maintenanceStatusFilter?.addEventListener("change", renderMaintenanceRecords);


async function initializeMaintenancePage() {
    try {
        if (!maintenanceProjectId) {
            throw new Error(
                "No project was selected. Return to Projects and open Maintenance from the Actions menu."
            );
        }

        await Promise.all([
            loadMaintenancePersonnel(),
            loadMaintenanceRecords()
        ]);

        renderPersonnelOptions();
    } catch (error) {
        console.error("INITIALIZE MAINTENANCE ERROR:", error);

        if (maintenanceTableBody) {
            maintenanceTableBody.innerHTML = `
                <tr>
                    <td colspan="11" class="maintenance-empty-state">
                        ${escapeHtml(error.message)}
                    </td>
                </tr>
            `;
        }

        if (addMaintenanceBtn) {
            addMaintenanceBtn.disabled = true;
        }
    }
}


upgradeMaintenanceGreenSelect(maintenanceStatusFilter);
upgradeMaintenanceGreenSelect(document.getElementById("maintenanceStatus"));
initializeMaintenancePage();

document.addEventListener("click", event => {
    if (!event.target.closest(".maintenance-person-dropdown")) {
        closeAllMaintenancePersonDropdowns();
    }

    if (!event.target.closest(".maintenance-green-select")) {
        closeAllMaintenanceGreenSelects();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeAllMaintenancePersonDropdowns();
        closeAllMaintenanceGreenSelects();
    }
});
