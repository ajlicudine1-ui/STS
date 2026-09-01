// ============================================================
// STS - PROJECT TASKS JAVASCRIPT
// ============================================================


// ============================================================
// GET PROJECT ID FROM URL
// ============================================================

const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get("project_id");


// ============================================================
// CHECK PROJECT ID
// ============================================================

if (!projectId) {

    alert("No project selected.");

    window.location.href = "/";

}


// ============================================================
// TASK MODAL ELEMENTS
// ============================================================

const taskModal =
    document.getElementById("taskModal");

const newTaskBtn =
    document.getElementById("newTaskBtn");

const closeTaskModal =
    document.getElementById("closeTaskModal");

const cancelTaskBtn =
    document.getElementById("cancelTaskBtn");

const taskForm =
    document.getElementById("taskForm");

const taskModalTitle =
    document.getElementById("taskModalTitle");

const taskModalSubtitle =
    document.getElementById("taskModalSubtitle");

const taskSubmitBtn =
    document.getElementById("taskSubmitBtn");


// ============================================================
// EDITING STATE
// ============================================================

let editingTaskId = null;

let editingTaskCompletionDate = null;


// ============================================================
// REVIEW STATE
// ============================================================

let currentReviewTaskId = null;


// ============================================================
// HISTORY STATE
// ============================================================

let currentHistoryTaskId = null;


// ============================================================
// HELPER - GET ELEMENT
// ============================================================

function getElement(id) {

    return document.getElementById(id);

}


// ============================================================
// HELPER - SET VALUE
// ============================================================

function setValue(id, value) {

    const element = getElement(id);

    if (element) {

        element.value = value ?? "";

    }

}


// ============================================================
// HELPER - GET VALUE
// ============================================================

function getValue(id) {

    const element = getElement(id);

    return element ? element.value : "";

}


// ============================================================
// HELPER - ESCAPE HTML
// ============================================================

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
// HELPER - FORMAT DATE
// ============================================================

function formatDate(dateValue) {

    if (!dateValue) {

        return "-";

    }

    return String(dateValue).substring(0, 10);

}



// ============================================================
// HELPER - STATUS CLASS
// ============================================================

function getStatusClass(status) {

    switch (status) {

        case "In Progress":
            return "status-active";

        case "Completed":
            return "status-completed";

        case "Not Started":
            return "status-pending";

        case "On Hold":
            return "status-pending";

        default:
            return "status-pending";

    }

}


// ============================================================
// HELPER - CALCULATE SCHEDULE STATUS
// ============================================================

function getScheduleStatus(task) {

    if (!task) {
        return "-";
    }

    const percentComplete =
        Number(task.percent_complete ?? 0);

    // When BOTH the task status and progress are complete,
    // Schedule Status must display as Completed.
    if (
        task.status === "Completed" &&
        percentComplete >= 100
    ) {
        return "Completed";
    }

    if (!task.due_date) {
        return "-";
    }

    const dueDate =
        new Date(
            `${formatDate(task.due_date)}T00:00:00`
        );

    if (Number.isNaN(dueDate.getTime())) {
        return "-";
    }

    let comparisonDate;

    // Completed task: use the actual Completion Date.
    if (
        task.status === "Completed" &&
        task.completion_date
    ) {
        comparisonDate =
            new Date(
                `${formatDate(task.completion_date)}T00:00:00`
            );
    } else {
        // Unfinished task: use today's date.
        comparisonDate = new Date();
        comparisonDate.setHours(0, 0, 0, 0);
    }

    if (Number.isNaN(comparisonDate.getTime())) {
        return "-";
    }

    const millisecondsPerDay =
        1000 * 60 * 60 * 24;

    const daysDifference =
        Math.round(
            (comparisonDate - dueDate) /
            millisecondsPerDay
        );

    // Completed before the Due Date.
    if (
        task.status === "Completed" &&
        daysDifference < 0
    ) {
        return "Ahead of Schedule";
    }

    // Exact Due Date or any date before it.
    if (daysDifference <= 0) {
        return "On Schedule";
    }

    // 10+ days overdue.
    if (daysDifference >= 10) {
        return "At Risk";
    }

    // 1-9 days overdue.
    return "Delayed";
}


// ============================================================
// HELPER - SCHEDULE STATUS CLASS
// ============================================================

function getScheduleStatusClass(scheduleStatus) {

    switch (scheduleStatus) {

        case "Ahead of Schedule":
            return "schedule-ahead";

        case "On Schedule":
            return "schedule-on";

        case "At Risk":
            return "schedule-risk";

        case "Delayed":
            return "schedule-delayed";

        case "Completed":
            return "schedule-completed";

        default:
            return "";
    }
}



// ============================================================
// LOAD PROJECT DEVELOPMENT TEAM
// ============================================================

async function loadProjectMembers() {

    if (!responsiblePersons || !projectId) {
        return;
    }

    responsiblePersons.innerHTML = `
        <div class="team-selection-empty">
            Loading team members...
        </div>
    `;

    try {

        const response =
            await fetch(
                `/api/projects/${encodeURIComponent(projectId)}/members`
            );

        const result =
            await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                "Failed to load development team."
            );
        }

        const members =
            Array.isArray(result.members)
                ? result.members
                : Array.isArray(result)
                    ? result
                    : [];

        if (members.length === 0) {

            responsiblePersons.innerHTML = `
                <div class="team-selection-empty">
                    No development team members found.
                </div>
            `;

            updateDevelopmentTeamText();
            return;
        }

        responsiblePersons.innerHTML =
            members
                .map(member => {

                    const name =
                        String(
                            member.member_name ||
                            member.full_name ||
                            member.name ||
                            ""
                        ).trim();

                    if (!name) {
                        return "";
                    }

                    return `
                        <label class="team-selection-item">

                            <input
                                type="checkbox"
                                class="responsible-person-checkbox"
                                value="${escapeHtml(name)}"
                            >

                            <span class="team-selection-info">

                                <strong>
                                    ${escapeHtml(name)}
                                </strong>
                            </span>

                        </label>
                    `;
                })
                .join("");

        updateDevelopmentTeamText();

    } catch (error) {

        console.error(
            "Load project members error:",
            error
        );

        responsiblePersons.innerHTML = `
            <div class="team-selection-empty">
                Unable to load development team.
            </div>
        `;
    }
}


// ============================================================
// GET SELECTED DEVELOPMENT TEAM
// ============================================================

function getSelectedResponsiblePersons() {

    return Array
        .from(
            document.querySelectorAll(
                ".responsible-person-checkbox:checked"
            )
        )
        .map(
            checkbox =>
                checkbox.value.trim()
        )
        .filter(Boolean)
        .join(", ");
}


// ============================================================
// CLEAR DEVELOPMENT TEAM SELECTION
// ============================================================

function clearSelectedResponsiblePersons() {

    document
        .querySelectorAll(
            ".responsible-person-checkbox"
        )
        .forEach(
            checkbox => {
                checkbox.checked = false;
            }
        );

    updateDevelopmentTeamText();
}


// ============================================================
// RESTORE DEVELOPMENT TEAM WHEN EDITING
// ============================================================

function setSelectedResponsiblePersons(value) {

    const selectedNames =
        String(value || "")
            .split(",")
            .map(
                name => name.trim()
            )
            .filter(Boolean);

    document
        .querySelectorAll(
            ".responsible-person-checkbox"
        )
        .forEach(
            checkbox => {

                checkbox.checked =
                    selectedNames.includes(
                        checkbox.value.trim()
                    );
            }
        );

    updateDevelopmentTeamText();
}


// ============================================================
// DEVELOPMENT TEAM DROPDOWN
// ============================================================

const developmentTeamTrigger =
    document.getElementById(
        "developmentTeamTrigger"
    );

const responsiblePersons =
    document.getElementById(
        "responsiblePersons"
    );

const developmentTeamSelectedText =
    document.getElementById(
        "developmentTeamSelectedText"
    );


function updateDevelopmentTeamText() {

    const checked =
        document.querySelectorAll(
            ".responsible-person-checkbox:checked"
        );


    if (!developmentTeamSelectedText) {
        return;
    }


    if (checked.length === 0) {

        developmentTeamSelectedText.textContent =
            "Select Development Team";

        return;
    }


    if (checked.length === 1) {

        developmentTeamSelectedText.textContent =
            checked[0].value;

        return;
    }


    developmentTeamSelectedText.textContent =
        `${checked.length} members selected`;
}


if (
    developmentTeamTrigger &&
    responsiblePersons
) {

    developmentTeamTrigger.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            responsiblePersons.classList.toggle(
                "show"
            );

            developmentTeamTrigger.classList.toggle(
                "active"
            );

        }
    );


    responsiblePersons.addEventListener(
        "change",
        event => {

            if (
                event.target.classList.contains(
                    "responsible-person-checkbox"
                )
            ) {

                updateDevelopmentTeamText();

            }

        }
    );


    responsiblePersons.addEventListener(
        "click",
        event => {

            event.stopPropagation();

        }
    );


    document.addEventListener(
        "click",
        () => {

            responsiblePersons.classList.remove(
                "show"
            );

            developmentTeamTrigger.classList.remove(
                "active"
            );

        }
    );
}
// ============================================================
// OPEN NEW TASK MODAL
// ============================================================

if (newTaskBtn) {

    newTaskBtn.addEventListener(
        "click",
        () => {

            editingTaskId = null;
            editingTaskCompletionDate = null;


            if (taskForm) {

                taskForm.reset();

            }


            setValue(
                "percentComplete",
                0
            );

            clearSelectedResponsiblePersons();


            if (taskModalTitle) {

                taskModalTitle.textContent =
                    "New Task";

            }


            if (taskModalSubtitle) {

                taskModalSubtitle.textContent =
                    "Add a task to this project.";

            }


            if (taskSubmitBtn) {

                taskSubmitBtn.textContent =
                    "Create Task";

            }


            if (taskModal) {

                taskModal.classList.add("show");

            }

        }
    );

}


// ============================================================
// CLOSE TASK MODAL
// ============================================================

function closeModal() {

    if (!taskModal) {

        return;

    }


    taskModal.classList.remove("show");

    editingTaskId = null;
    editingTaskCompletionDate = null;


    if (taskForm) {

        taskForm.reset();

    }


    setValue(
        "percentComplete",
        0
    );

    clearSelectedResponsiblePersons();


    if (taskModalTitle) {

        taskModalTitle.textContent =
            "New Task";

    }


    if (taskModalSubtitle) {

        taskModalSubtitle.textContent =
            "Add a task to this project.";

    }


    if (taskSubmitBtn) {

        taskSubmitBtn.textContent =
            "Create Task";

    }

}


// ============================================================
// CLOSE TASK MODAL BUTTONS
// ============================================================

if (closeTaskModal) {

    closeTaskModal.addEventListener(
        "click",
        closeModal
    );

}


if (cancelTaskBtn) {

    cancelTaskBtn.addEventListener(
        "click",
        closeModal
    );

}


// ============================================================
// CLOSE TASK MODAL OUTSIDE CLICK
// ============================================================

if (taskModal) {

    taskModal.addEventListener(
        "click",
        event => {

            if (event.target === taskModal) {

                closeModal();

            }

        }
    );

}


// ============================================================
// OPEN EDIT TASK MODAL
// ============================================================

function openEditTaskModal(task) {

    console.log(
        "Opening task for edit:",
        task
    );


    editingTaskId =
        task.task_id;

    editingTaskCompletionDate =
        task.completion_date || null;


    // --------------------------------------------------------
    // MODAL HEADER
    // --------------------------------------------------------

    if (taskModalTitle) {

        taskModalTitle.textContent =
            "Edit Task";

    }


    if (taskModalSubtitle) {

        taskModalSubtitle.textContent =
            "Update the information for this task.";

    }


    if (taskSubmitBtn) {

        taskSubmitBtn.textContent =
            "Update Task";

    }


    // --------------------------------------------------------
    // BASIC INFORMATION
    // --------------------------------------------------------
    setValue(
        "procedureStage",
        task.procedure_stage
    );

    setValue(
        "taskActivity",
        task.task_activity
    );


    


    setValue(
        "taskStatus",
        task.status
    );


    // --------------------------------------------------------
    // ASSIGNMENT & SCHEDULE
    // --------------------------------------------------------

    setValue(
        "taskPriority",
        task.priority
    );

    setSelectedResponsiblePersons(
        task.responsible_person
    );

    setValue(
        "stakeholderEndUser",
        task.stakeholder_end_user
    );


    // --------------------------------------------------------
    // DATES
    // --------------------------------------------------------

    setValue(
        "startDate",
        formatDate(task.start_date)
    );


    setValue(
        "dueDate",
        formatDate(task.due_date)
    );


    // --------------------------------------------------------
    // PROGRESS
    // --------------------------------------------------------

    updateProgressFromStatus();


    // --------------------------------------------------------
    // ADDITIONAL DETAILS
    // --------------------------------------------------------

    setValue(
        "deliverableExpectedOutput",
        task.deliverable_expected_output
    );


    setValue(
        "evidenceApplicability",
        task.evidence_applicability
    );


    // --------------------------------------------------------
    // OPEN MODAL
    // --------------------------------------------------------

    if (taskModal) {

        taskModal.classList.add("show");

    }

}


// ============================================================
// REVIEW MODAL
// ============================================================

const reviewModal =
    document.getElementById(
        "reviewModal"
    );

const closeReviewModalBtn =
    document.getElementById(
        "closeReviewModal"
    );

const cancelReviewBtn =
    document.getElementById(
        "cancelReviewBtn"
    );

const reviewForm =
    document.getElementById(
        "reviewForm"
    );


// ============================================================
// CLOSE REVIEW MODAL
// ============================================================

function closeReviewModal() {

    if (!reviewModal) {

        return;

    }


    reviewModal.classList.remove("show");

    currentReviewTaskId = null;


    if (reviewForm) {

        reviewForm.reset();

    }

}


// ============================================================
// REVIEW CLOSE BUTTONS
// ============================================================

if (closeReviewModalBtn) {

    closeReviewModalBtn.addEventListener(
        "click",
        closeReviewModal
    );

}


if (cancelReviewBtn) {

    cancelReviewBtn.addEventListener(
        "click",
        closeReviewModal
    );

}


// ============================================================
// REVIEW OUTSIDE CLICK
// ============================================================

if (reviewModal) {

    reviewModal.addEventListener(
        "click",
        event => {

            if (event.target === reviewModal) {

                closeReviewModal();

            }

        }
    );

}


// ============================================================
// OPEN REVIEW MODAL
// ============================================================

function openReviewModal(task) {

    console.log(
        "Opening review:",
        task
    );


    currentReviewTaskId =
        task.task_id;


    // --------------------------------------------------------
    // REVIEW INFORMATION
    // --------------------------------------------------------

    const reviewTaskName =
        document.getElementById(
            "reviewTaskName"
        );


    const reviewResponsiblePerson =
        document.getElementById(
            "reviewResponsiblePerson"
        );


    const reviewStatus =
        document.getElementById(
            "reviewStatus"
        );


    const reviewPercentComplete =
        document.getElementById(
            "reviewPercentComplete"
        );


    const reviewExpectedOutput =
        document.getElementById(
            "reviewExpectedOutput"
        );


    if (reviewTaskName) {

        reviewTaskName.textContent =
            task.task_activity || "-";

    }


    if (reviewResponsiblePerson) {

        reviewResponsiblePerson.textContent =
            task.responsible_person || "-";

    }


    if (reviewStatus) {

        reviewStatus.textContent =
            task.status || "-";

    }


    if (reviewPercentComplete) {

        reviewPercentComplete.textContent =
            `${task.percent_complete ?? 0}%`;

    }


    if (reviewExpectedOutput) {

        reviewExpectedOutput.textContent =
            task.deliverable_expected_output || "-";

    }


    // --------------------------------------------------------
    // EXISTING REVIEW DATA
    // --------------------------------------------------------
setValue(
        "reviewResult",
        task.review_result
    );


    setValue(
        "reviewDate",
        formatDate(task.review_date)
    );


    setValue(
        "reviewRemarks",
        task.remarks
    );


    // --------------------------------------------------------
    // OPEN MODAL
    // --------------------------------------------------------

    if (reviewModal) {

        reviewModal.classList.add("show");

    }

}


// ============================================================
// HISTORY MODAL
// ============================================================

const historyModal =
    document.getElementById(
        "historyModal"
    );

const closeHistoryModalBtn =
    document.getElementById(
        "closeHistoryModal"
    );

const cancelHistoryBtn =
    document.getElementById(
        "cancelHistoryBtn"
    );

const historyTaskName =
    document.getElementById(
        "historyTaskName"
    );

const historyTaskTitle =
    document.getElementById(
        "historyTaskTitle"
    );

const historyCurrentStatus =
    document.getElementById(
        "historyCurrentStatus"
    );

const historyCurrentPercent =
    document.getElementById(
        "historyCurrentPercent"
    );

const historyProgressBar =
    document.getElementById(
        "historyProgressBar"
    );

const historyTransactionCount =
    document.getElementById(
        "historyTransactionCount"
    );

const taskHistoryTable =
    document.getElementById(
        "taskHistoryTable"
    );


// ============================================================
// CLOSE HISTORY MODAL
// ============================================================

function closeHistoryModal() {

    if (!historyModal) {

        return;

    }


    historyModal.classList.remove("show");

    currentHistoryTaskId = null;


    if (taskHistoryTable) {

        taskHistoryTable.innerHTML = `
            <tr>
                <td colspan="8">
                    No history found.
                </td>
            </tr>
        `;

    }


    if (historyTransactionCount) {

        historyTransactionCount.textContent =
            "0";

    }

}


// ============================================================
// HISTORY CLOSE BUTTONS
// ============================================================

if (closeHistoryModalBtn) {

    closeHistoryModalBtn.addEventListener(
        "click",
        closeHistoryModal
    );

}


if (cancelHistoryBtn) {

    cancelHistoryBtn.addEventListener(
        "click",
        closeHistoryModal
    );

}


// ============================================================
// HISTORY OUTSIDE CLICK
// ============================================================

if (historyModal) {

    historyModal.addEventListener(
        "click",
        event => {

            if (event.target === historyModal) {

                closeHistoryModal();

            }

        }
    );

}


// ============================================================
// LOAD TASK HISTORY
// ============================================================

async function loadTaskHistory(task) {

    if (!task || !task.task_id) {

        console.error(
            "Cannot load history. Task ID is missing."
        );

        return;

    }


    currentHistoryTaskId =
        task.task_id;


    // --------------------------------------------------------
    // CURRENT TASK INFORMATION
    // --------------------------------------------------------

    const currentPercent =
        Number(
            task.percent_complete ?? 0
        );


    if (historyTaskName) {

        historyTaskName.textContent =
            task.task_activity ||
            "Activity history and changes";

    }


    if (historyTaskTitle) {

        historyTaskTitle.textContent =
            task.task_activity || "-";

    }


    if (historyCurrentStatus) {

        historyCurrentStatus.textContent =
            task.status || "-";


        historyCurrentStatus.classList.remove(
            "status-active",
            "status-completed",
            "status-pending"
        );


        historyCurrentStatus.classList.add(
            getStatusClass(
                task.status
            )
        );

    }


    if (historyCurrentPercent) {

        historyCurrentPercent.textContent =
            `${currentPercent}%`;

    }


    if (historyProgressBar) {

        historyProgressBar.style.width =
            `${Math.min(
                Math.max(
                    currentPercent,
                    0
                ),
                100
            )}%`;

    }


    if (historyTransactionCount) {

        historyTransactionCount.textContent =
            "0";

    }


    // --------------------------------------------------------
    // LOADING STATE
    // --------------------------------------------------------

    if (taskHistoryTable) {

        taskHistoryTable.innerHTML = `
            <tr>
                <td colspan="8">

                    <div class="history-empty">

                        <div class="history-empty-icon">
                            ↻
                        </div>

                        <strong>
                            Loading history...
                        </strong>

                        <span>
                            Retrieving task activity records.
                        </span>

                    </div>

                </td>
            </tr>
        `;

    }


    // --------------------------------------------------------
    // OPEN MODAL
    // --------------------------------------------------------

    if (historyModal) {

        historyModal.classList.add("show");

    }


    // --------------------------------------------------------
    // FETCH HISTORY
    // --------------------------------------------------------

    try {

        const response =
            await fetch(
                `/api/tasks/${encodeURIComponent(
                    task.task_id
                )}/history`
            );


        const result =
            await response.json();


        console.log(
            "Task history response:",
            result
        );


        if (!response.ok) {

            throw new Error(
                result.error ||
                "Failed to load task history."
            );

        }


        const history =
            Array.isArray(result.history)
                ? result.history
                : [];


        // ----------------------------------------------------
        // TRANSACTION COUNT
        // ----------------------------------------------------

        if (historyTransactionCount) {

            historyTransactionCount.textContent =
                history.length;

        }


        // ----------------------------------------------------
        // NO HISTORY
        // ----------------------------------------------------

        if (history.length === 0) {

            if (taskHistoryTable) {

                taskHistoryTable.innerHTML = `
                    <tr>
                        <td colspan="8">

                            <div class="history-empty">

                                <div class="history-empty-icon">
                                    ↻
                                </div>

                                <strong>
                                    No history found
                                </strong>

                                <span>
                                    Changes made to this task will appear here.
                                </span>

                            </div>

                        </td>
                    </tr>
                `;

            }

            return;

        }


        // ----------------------------------------------------
        // DISPLAY HISTORY
        // ----------------------------------------------------

        if (taskHistoryTable) {

            taskHistoryTable.innerHTML =
                history
                    .map(item => {

                        // ------------------------------------
                        // DATE / TIME
                        // ------------------------------------

                        const changedAt =
                            item.changed_at ||
                            item.created_at ||
                            item.date ||
                            null;


                        let dateMain = "-";
                        let dateTime = "";


                        if (changedAt) {

                            const dateObject =
                                new Date(
                                    changedAt
                                );


                            if (
                                !Number.isNaN(
                                    dateObject.getTime()
                                )
                            ) {

                                dateMain =
                                    dateObject.toLocaleDateString(
                                        undefined,
                                        {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric"
                                        }
                                    );


                                dateTime =
                                    dateObject.toLocaleTimeString(
                                        undefined,
                                        {
                                            hour: "2-digit",
                                            minute: "2-digit"
                                        }
                                    );

                            } else {

                                dateMain =
                                    String(
                                        changedAt
                                    );

                            }

                        }


                        // ------------------------------------
                        // TASK / ACTIVITY
                        // ------------------------------------

                        const taskActivity =
                            item.task_activity ||
                            item.new_task_activity ||
                            task.task_activity ||
                            "-";


                        // ------------------------------------
                        // ACTION
                        // ------------------------------------

                        const rawAction =
                            item.action ||
                            "Task Updated";


                        const actionLower =
                            String(
                                rawAction
                            ).toLowerCase();


                        let actionClass =
                            "updated";


                        if (
                            actionLower.includes(
                                "creat"
                            )
                        ) {

                            actionClass =
                                "created";

                        } else if (
                            actionLower.includes(
                                "review"
                            )
                        ) {

                            actionClass =
                                "reviewed";

                        } else if (
                            actionLower.includes(
                                "update"
                            )
                        ) {

                            actionClass =
                                "updated";

                        }


                        // ------------------------------------
                        // STATUS
                        // ------------------------------------

                        const oldStatus =
                            item.old_status ?? "-";


                        const newStatus =
                            item.new_status ??
                            item.status ??
                            "-";


                        // ------------------------------------
                        // PROGRESS
                        // ------------------------------------

                        const oldPercent =
                            Number(
                                item.old_percent_complete ??
                                0
                            );


                        const newPercent =
                            Number(
                                item.new_percent_complete ??
                                item.percent_complete ??
                                0
                            );


                        const safeNewPercent =
                            Math.min(
                                Math.max(
                                    newPercent,
                                    0
                                ),
                                100
                            );


                        // ------------------------------------
                        // RESPONSIBLE PERSON
                        // ------------------------------------

                        const responsiblePerson =
                            item.responsible_person ||
                            item.new_responsible_person ||
                            task.responsible_person ||
                            "-";


                        // ------------------------------------
                        // REMARKS
                        // ------------------------------------

                        const remarks =
                            item.remarks ||
                            "Task information updated";


                        // ------------------------------------
                        // UPDATED / REVIEWED BY
                        // ------------------------------------

                        const changedBy =
                            item.changed_by ||
                            "System";


                        // ------------------------------------
                        // RETURN HISTORY ROW
                        // ------------------------------------

                        return `
                            <tr>

                                <!-- DATE / TIME -->
                                <td>

                                    <div class="history-date">

                                        <span class="history-date-main">
                                            ${escapeHtml(
                                                dateMain
                                            )}
                                        </span>

                                        ${
                                            dateTime
                                                ? `
                                                    <span class="history-date-time">
                                                        ${escapeHtml(
                                                            dateTime
                                                        )}
                                                    </span>
                                                `
                                                : ""
                                        }

                                    </div>

                                </td>


                                <!-- TASK / ACTIVITY -->
                                <td>

                                    <div class="history-task-activity">
                                        ${escapeHtml(
                                            taskActivity
                                        )}
                                    </div>

                                </td>


                                <!-- ACTION -->
                                <td>

                                    <span
                                        class="history-action ${actionClass}"
                                    >
                                        ${escapeHtml(
                                            rawAction
                                        )}
                                    </span>

                                </td>


                                <!-- STATUS -->
                                <td>

                                    <div class="history-status-change">

                                        <span
                                            class="status ${getStatusClass(
                                                oldStatus
                                            )}"
                                        >
                                            ${escapeHtml(
                                                oldStatus
                                            )}
                                        </span>

                                        <span class="history-arrow">
                                            →
                                        </span>

                                        <span
                                            class="status ${getStatusClass(
                                                newStatus
                                            )}"
                                        >
                                            ${escapeHtml(
                                                newStatus
                                            )}
                                        </span>

                                    </div>

                                </td>


                                <!-- PROGRESS -->
                                <td>

                                    <div class="history-row-progress">

                                        <span
                                            class="history-row-progress-value"
                                        >
                                            ${escapeHtml(
                                                oldPercent
                                            )}%

                                            →

                                            ${escapeHtml(
                                                newPercent
                                            )}%
                                        </span>


                                        <div
                                            class="history-row-progress-track"
                                        >

                                            <div
                                                class="history-row-progress-fill"
                                                style="width: ${safeNewPercent}%"
                                            ></div>

                                        </div>

                                    </div>

                                </td>


                                <!-- RESPONSIBLE PERSON -->
                                <td>

                                    <span class="history-responsible-person">
                                        ${escapeHtml(
                                            responsiblePerson
                                        )}
                                    </span>

                                </td>


                                <!-- REMARKS -->
                                <td>

                                    <div class="history-remarks">
                                        ${escapeHtml(
                                            remarks
                                        )}
                                    </div>

                                </td>


                                <!-- UPDATED / REVIEWED BY -->
                                <td>

                                    <span class="history-responsible-person">
                                        ${escapeHtml(
                                            changedBy
                                        )}
                                    </span>

                                </td>

                            </tr>
                        `;

                    })
                    .join("");

        }

    } catch (error) {

        console.error(
            "Load task history error:",
            error
        );


        if (taskHistoryTable) {

            taskHistoryTable.innerHTML = `
                <tr>

                    <td colspan="8">

                        <div class="history-empty">

                            <div class="history-empty-icon">
                                !
                            </div>

                            <strong>
                                Failed to load history
                            </strong>

                            <span>
                                ${escapeHtml(
                                    error.message
                                )}
                            </span>

                        </div>

                    </td>

                </tr>
            `;

        }

    }

}


// ============================================================
// TASK REPOSITORY + ACTION MENU
// ============================================================

const taskRepositoryFilesModal =
    document.getElementById("taskRepositoryFilesModal");

const taskRepositoryFilesModalTitle =
    document.getElementById("taskRepositoryFilesModalTitle");

const closeTaskRepositoryFilesModalBtn =
    document.getElementById("closeTaskRepositoryFilesModal");

const taskRepositoryFilesList =
    document.getElementById("taskRepositoryFilesList");

const refreshTaskRepositoryFilesBtn =
    document.getElementById("refreshTaskRepositoryFilesBtn");

const openTaskRepositoryDriveBtn =
    document.getElementById("openTaskRepositoryDriveBtn");

const taskRepositoryUploadProgress =
    document.getElementById("taskRepositoryUploadProgress");

const taskRepositoryFileInput =
    document.getElementById("taskRepositoryFileInput");

const taskRepositoryFolderInput =
    document.getElementById("taskRepositoryFolderInput");

let currentRepositoryTask = null;


function formatTaskRepositoryFileSize(bytes) {

    if (
        bytes === null ||
        bytes === undefined ||
        Number.isNaN(Number(bytes))
    ) {
        return "";
    }

    const size = Number(bytes);

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


const expandedTaskRepositoryFolders = new Set();

function normalizeTaskRepositoryPath(value) {
    return String(value || "")
        .replace(/\\/g, "/")
        .replace(/^\/+|\/+$/g, "");
}

function getTaskRepositoryParentPath(path) {
    const normalized = normalizeTaskRepositoryPath(path);
    const parts = normalized.split("/").filter(Boolean);
    parts.pop();
    return parts.join("/");
}

function renderTaskRepositoryFiles(items) {

    if (!taskRepositoryFilesList) {
        return;
    }

    const files = Array.isArray(items) ? items : [];

    if (files.length === 0) {
        taskRepositoryFilesList.innerHTML = `
            <div class="task-repository-empty">
                No uploaded files or folders yet.
            </div>
        `;
        return;
    }

    function isTaskRepositoryItemVisible(path) {

        const parts =
            normalizeTaskRepositoryPath(path)
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
                !expandedTaskRepositoryFolders.has(
                    ancestor
                )
            ) {
                return false;
            }
        }

        return true;
    }

    taskRepositoryFilesList.innerHTML = files
        .map(item => {

            const path =
                normalizeTaskRepositoryPath(
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
                expandedTaskRepositoryFolders.has(path);

            const isVisible =
                isTaskRepositoryItemVisible(path);

            const icon = isFolder
                ? (isExpanded ? "📂" : "📁")
                : "📄";

            const sizeText = isFolder
                ? ""
                : formatTaskRepositoryFileSize(item.size);

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
                    class="task-repository-file-row${isFolder ? " task-repository-folder-row" : " task-repository-clickable-file"}"
                    data-repository-path="${escapeHtml(path)}"
                    data-repository-folder="${isFolder ? "true" : "false"}"
                    data-repository-url="${safeUrl}"
                    role="button"
                    tabindex="0"
                    title="${escapeHtml(actionTitle)}"
                    style="--task-repository-depth:${depth};cursor:pointer;${isVisible ? "" : "display:none !important;"}"
                    ${isVisible ? "" : "hidden"}
                >
                    <div class="task-repository-file-main">

                        <span class="task-repository-folder-chevron">
                            ${isFolder ? (isExpanded ? "▾" : "▸") : ""}
                        </span>

                        <span class="task-repository-file-icon">
                            ${icon}
                        </span>

                        <div class="task-repository-file-info">

                            <div class="task-repository-file-name">
                                ${escapeHtml(item.name || "-")}
                            </div>

                            <div class="task-repository-file-path">
                                ${escapeHtml(path)}
                            </div>

                        </div>

                    </div>

                    <div class="task-repository-file-meta">

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

    function activateTaskRepositoryRow(row) {

        const path =
            normalizeTaskRepositoryPath(
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
                expandedTaskRepositoryFolders.has(
                    path
                )
            ) {

                expandedTaskRepositoryFolders.delete(
                    path
                );

                Array.from(
                    expandedTaskRepositoryFolders
                ).forEach(expandedPath => {

                    if (
                        expandedPath.startsWith(
                            `${path}/`
                        )
                    ) {
                        expandedTaskRepositoryFolders.delete(
                            expandedPath
                        );
                    }
                });

            } else {

                expandedTaskRepositoryFolders.add(
                    path
                );
            }

            renderTaskRepositoryFiles(files);
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

    taskRepositoryFilesList
        .querySelectorAll(
            ".task-repository-file-row"
        )
        .forEach(row => {

            row.addEventListener(
                "click",
                () => {
                    activateTaskRepositoryRow(row);
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
                        activateTaskRepositoryRow(row);
                    }
                }
            );
        });
}

async function loadTaskRepositoryFiles() {

    if (!currentRepositoryTask?.task_id) {
        return;
    }

    if (taskRepositoryFilesList) {
        taskRepositoryFilesList.innerHTML = `
            <div class="task-repository-empty">
                Loading repository files...
            </div>
        `;
    }

    try {

        const response = await fetch(
            `/api/tasks/${encodeURIComponent(
                currentRepositoryTask.task_id
            )}/repository/files`
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                result.details ||
                "Failed to load task repository files."
            );
        }

        currentRepositoryTask = {
            ...currentRepositoryTask,
            ...(result.task || {})
        };

        renderTaskRepositoryFiles(result.items);

    } catch (error) {

        console.error(
            "Load task repository files error:",
            error
        );

        if (taskRepositoryFilesList) {
            taskRepositoryFilesList.innerHTML = `
                <div class="task-repository-empty task-repository-error">
                    ${escapeHtml(error.message)}
                </div>
            `;
        }
    }
}


async function openTaskRepositoryFilesModal(task) {

    if (!task?.task_id) {
        return;
    }

    currentRepositoryTask = task;

    expandedTaskRepositoryFolders.clear();

    if (taskRepositoryFilesModalTitle) {
        taskRepositoryFilesModalTitle.textContent =
            `${task.task_id} - Task Repository`;
    }

    if (taskRepositoryUploadProgress) {
        taskRepositoryUploadProgress.textContent = "";
    }

    if (taskRepositoryFilesModal) {
        taskRepositoryFilesModal.classList.add("show");
    }

    await loadTaskRepositoryFiles();
}


function closeTaskRepositoryFilesModal() {

    if (taskRepositoryFilesModal) {
        taskRepositoryFilesModal.classList.remove("show");
    }

    currentRepositoryTask = null;

    if (taskRepositoryUploadProgress) {
        taskRepositoryUploadProgress.textContent = "";
    }
}


if (closeTaskRepositoryFilesModalBtn) {
    closeTaskRepositoryFilesModalBtn.addEventListener(
        "click",
        closeTaskRepositoryFilesModal
    );
}


if (taskRepositoryFilesModal) {
    taskRepositoryFilesModal.addEventListener(
        "click",
        event => {
            if (event.target === taskRepositoryFilesModal) {
                closeTaskRepositoryFilesModal();
            }
        }
    );
}


if (refreshTaskRepositoryFilesBtn) {
    refreshTaskRepositoryFilesBtn.addEventListener(
        "click",
        loadTaskRepositoryFiles
    );
}


if (openTaskRepositoryDriveBtn) {
    openTaskRepositoryDriveBtn.addEventListener(
        "click",
        () => {

            const url =
                currentRepositoryTask?.repository_folder_url ||
                currentRepositoryTask?.drive_folder_url;

            if (!url) {
                alert("Task Repository URL is not available.");
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


async function uploadFileToTaskRepository(
    taskId,
    file,
    relativePath = ""
) {

    const response = await fetch(
        `/api/tasks/${encodeURIComponent(taskId)}/repository/upload`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/octet-stream",
                "X-File-Name": encodeURIComponent(file.name),
                "X-File-Mime-Type": encodeURIComponent(
                    file.type || "application/octet-stream"
                ),
                "X-Relative-Path": encodeURIComponent(
                    relativePath || ""
                )
            },

            body: file
        }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.error ||
            result.details ||
            `Failed to upload ${file.name}.`
        );
    }

    return result;
}


async function uploadTaskRepositorySelection(
    task,
    files,
    isFolderSelection = false
) {

    if (!task?.task_id) {
        throw new Error("Task ID is required for upload.");
    }

    const selectedFiles = Array.from(files || []);

    if (selectedFiles.length === 0) {
        return;
    }

    for (
        let index = 0;
        index < selectedFiles.length;
        index += 1
    ) {

        const file = selectedFiles[index];
        let relativePath = "";

        if (isFolderSelection) {
            const parts = String(
                file.webkitRelativePath || ""
            )
                .split("/")
                .filter(Boolean);

            parts.pop();
            relativePath = parts.join("/");
        }

        if (taskRepositoryUploadProgress) {
            taskRepositoryUploadProgress.textContent =
                `Uploading ${index + 1} of ${selectedFiles.length}: ${file.name}`;
        }

        await uploadFileToTaskRepository(
            task.task_id,
            file,
            relativePath
        );
    }

    if (taskRepositoryUploadProgress) {
        taskRepositoryUploadProgress.textContent =
            `${selectedFiles.length} upload${selectedFiles.length === 1 ? "" : "s"} completed.`;
    }
}


if (taskRepositoryFileInput) {
    taskRepositoryFileInput.addEventListener(
        "change",
        async () => {

            const task = currentRepositoryTask;
            const files = Array.from(
                taskRepositoryFileInput.files || []
            );

            taskRepositoryFileInput.value = "";

            if (!task?.task_id || files.length === 0) {
                return;
            }

            try {
                await uploadTaskRepositorySelection(
                    task,
                    files,
                    false
                );

                alert(
                    `${files.length} file${files.length === 1 ? "" : "s"} uploaded successfully!`
                );

                if (taskRepositoryFilesModal?.classList.contains("show")) {
                    await loadTaskRepositoryFiles();
                }

            } catch (error) {
                console.error("Task repository upload error:", error);
                alert("Upload failed: " + error.message);
            }
        }
    );
}


if (taskRepositoryFolderInput) {
    taskRepositoryFolderInput.addEventListener(
        "change",
        async () => {

            const task = currentRepositoryTask;
            const files = Array.from(
                taskRepositoryFolderInput.files || []
            );

            taskRepositoryFolderInput.value = "";

            if (!task?.task_id || files.length === 0) {
                return;
            }

            try {
                await uploadTaskRepositorySelection(
                    task,
                    files,
                    true
                );

                alert(
                    `Folder uploaded successfully (${files.length} file${files.length === 1 ? "" : "s"}).`
                );

                if (taskRepositoryFilesModal?.classList.contains("show")) {
                    await loadTaskRepositoryFiles();
                }

            } catch (error) {
                console.error("Task repository folder upload error:", error);
                alert("Folder upload failed: " + error.message);
            }
        }
    );
}


// ============================================================
// TASK ACTION MENU POSITIONING
// ============================================================

function closeAllActionMenus() {

    document
        .querySelectorAll(".task-action-menu.show")
        .forEach(menu => {

            menu.classList.remove(
                "show",
                "task-action-menu-portal"
            );

            menu.style.left = "";
            menu.style.top = "";
            menu.style.right = "";
            menu.style.bottom = "";
            menu.style.visibility = "";

            const trigger = menu._taskActionTrigger;
            const wrapper = menu._taskActionWrapper;

            if (trigger) {
                trigger.setAttribute(
                    "aria-expanded",
                    "false"
                );
                trigger.classList.remove("active");
            }

            if (
                wrapper &&
                menu.parentElement !== wrapper
            ) {
                wrapper.appendChild(menu);
            }
        });
}


function openTaskActionMenu(trigger, menu) {

    if (!trigger || !menu) {
        return;
    }

    const triggerRect = trigger.getBoundingClientRect();

    document.body.appendChild(menu);

    menu.classList.add(
        "task-action-menu-portal",
        "show"
    );

    menu.style.visibility = "hidden";
    menu.style.left = "0px";
    menu.style.top = "0px";
    menu.style.right = "auto";
    menu.style.bottom = "auto";

    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const viewportPadding = 10;
    const gap = 6;

    let left = triggerRect.right - menuWidth;

    left = Math.max(
        viewportPadding,
        Math.min(
            left,
            window.innerWidth -
            menuWidth -
            viewportPadding
        )
    );

    let top = triggerRect.bottom + gap;

    if (
        top + menuHeight >
        window.innerHeight - viewportPadding
    ) {
        top = triggerRect.top - menuHeight - gap;
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

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.visibility = "visible";

    trigger.setAttribute("aria-expanded", "true");
    trigger.classList.add("active");
}


function showTaskUploadOptionsInActionMenu(menu, task) {

    if (!menu) {
        return;
    }

    menu.innerHTML = `
        <button
            type="button"
            class="task-upload-menu-close back-to-task-actions"
            title="Back"
            aria-label="Back"
        >
            ×
        </button>

        <button
            type="button"
            class="task-action-item choose-task-files"
        >
            <span class="task-action-icon">📄</span>
            <span>Upload Files</span>
        </button>

        <button
            type="button"
            class="task-action-item choose-task-folder"
        >
            <span class="task-action-icon">📁</span>
            <span>Upload Folder</span>
        </button>
    `;

    const backButton =
        menu.querySelector(".back-to-task-actions");

    const chooseFiles =
        menu.querySelector(".choose-task-files");

    const chooseFolder =
        menu.querySelector(".choose-task-folder");

    if (backButton) {
        backButton.addEventListener(
            "click",
            event => {
                event.stopPropagation();
                restoreTaskActionMenu(menu, task);
            }
        );
    }

    if (chooseFiles) {
        chooseFiles.addEventListener(
            "click",
            event => {
                event.stopPropagation();
                currentRepositoryTask = task;

                if (taskRepositoryFileInput) {
                    taskRepositoryFileInput.value = "";
                    taskRepositoryFileInput.click();
                }

                closeAllActionMenus();
            }
        );
    }

    if (chooseFolder) {
        chooseFolder.addEventListener(
            "click",
            event => {
                event.stopPropagation();
                currentRepositoryTask = task;

                if (taskRepositoryFolderInput) {
                    taskRepositoryFolderInput.value = "";
                    taskRepositoryFolderInput.click();
                }

                closeAllActionMenus();
            }
        );
    }
}


function restoreTaskActionMenu(menu, task) {

    if (!menu || !menu._originalActionHtml) {
        return;
    }

    menu.innerHTML = menu._originalActionHtml;
    bindTaskActionMenuItems(menu, task);
}


function bindTaskActionMenuItems(menu, task) {

    if (!menu) {
        return;
    }

    const reviewAction =
        menu.querySelector(".review-action");

    const repositoryFilesAction =
        menu.querySelector(".repository-files-action");

    const uploadRepositoryAction =
        menu.querySelector(".upload-repository-action");

    const editAction =
        menu.querySelector(".edit-action");

    const historyAction =
        menu.querySelector(".history-action");

    if (reviewAction) {
        reviewAction.addEventListener(
            "click",
            event => {
                event.stopPropagation();
                closeAllActionMenus();
                openReviewModal(task);
            }
        );
    }

    if (repositoryFilesAction) {
        repositoryFilesAction.addEventListener(
            "click",
            async event => {
                event.stopPropagation();
                closeAllActionMenus();
                await openTaskRepositoryFilesModal(task);
            }
        );
    }

    if (uploadRepositoryAction) {
        uploadRepositoryAction.addEventListener(
            "click",
            event => {
                event.stopPropagation();
                currentRepositoryTask = task;
                showTaskUploadOptionsInActionMenu(
                    menu,
                    task
                );
            }
        );
    }

    if (editAction) {
        editAction.addEventListener(
            "click",
            event => {
                event.stopPropagation();
                closeAllActionMenus();
                openEditTaskModal(task);
            }
        );
    }

    if (historyAction) {
        historyAction.addEventListener(
            "click",
            event => {
                event.stopPropagation();
                closeAllActionMenus();
                loadTaskHistory(task);
            }
        );
    }
}


function createActionMenu(task) {

    const wrapper = document.createElement("div");
    wrapper.className = "task-action-wrapper";

    wrapper.innerHTML = `
        <button
            type="button"
            class="task-action-trigger"
            aria-label="Task actions"
            aria-expanded="false"
            title="Actions"
        >
            <span class="task-action-label">
                Actions
            </span>

            <span class="task-action-arrow">
                ▾
            </span>
        </button>

        <div class="task-action-menu">

            <button
                type="button"
                class="task-action-item review-action"
            >
                <span class="task-action-icon">✓</span>
                <span>Review</span>
            </button>

            <button
                type="button"
                class="task-action-item repository-files-action"
            >
                <span class="task-action-icon">☰</span>
                <span>Project Repository</span>
            </button>

            <button
                type="button"
                class="task-action-item upload-repository-action"
            >
                <span class="task-action-icon">↑</span>
                <span>Upload Files / Folder</span>
            </button>

            <button
                type="button"
                class="task-action-item edit-action"
            >
                <span class="task-action-icon">✎</span>
                <span>Edit</span>
            </button>

            <button
                type="button"
                class="task-action-item history-action"
            >
                <span class="task-action-icon">↻</span>
                <span>History</span>
            </button>

        </div>
    `;

    const trigger =
        wrapper.querySelector(".task-action-trigger");

    const menu =
        wrapper.querySelector(".task-action-menu");

    if (menu) {
        menu._taskActionWrapper = wrapper;
        menu._taskActionTrigger = trigger;
        menu._originalActionHtml = menu.innerHTML;
    }

    if (trigger && menu) {
        trigger.addEventListener(
            "click",
            event => {
                event.stopPropagation();

                const wasOpen =
                    menu.classList.contains("show");

                closeAllActionMenus();

                if (!wasOpen) {
                    restoreTaskActionMenu(menu, task);
                    openTaskActionMenu(trigger, menu);
                }
            }
        );
    }

    bindTaskActionMenuItems(menu, task);

    return wrapper;
}


// ============================================================
// CLOSE ACTION MENU WHEN CLICKING ANYWHERE ELSE
// ============================================================

document.addEventListener(
    "click",
    () => {

        closeAllActionMenus();

    }
);


window.addEventListener(
    "resize",
    closeAllActionMenus
);


window.addEventListener(
    "scroll",
    closeAllActionMenus,
    true
);


// ============================================================
// LOAD TASKS
// ============================================================

async function loadTasks() {

    try {

        console.log(
            "========================================"
        );

        console.log(
            "LOADING TASKS"
        );

        console.log(
            "Project ID:",
            projectId
        );

        console.log(
            "========================================"
        );


        // ----------------------------------------------------
        // CHECK PROJECT ID
        // ----------------------------------------------------

        if (!projectId) {

            console.error(
                "Project ID is missing from URL."
            );


            alert(
                "No project selected."
            );


            window.location.href = "/";

            return;

        }


        // ----------------------------------------------------
        // FETCH TASKS
        // ----------------------------------------------------

        const response =
            await fetch(
                `/api/projects/${encodeURIComponent(
                    projectId
                )}/tasks`
            );


        console.log(
            "Tasks API status:",
            response.status
        );


        const data =
            await response.json();


        console.log(
            "Tasks API response:",
            data
        );


        // ----------------------------------------------------
        // CHECK SERVER RESPONSE
        // ----------------------------------------------------

        if (!response.ok) {

            throw new Error(
                data.error ||
                data.message ||
                "Failed to load tasks."
            );

        }


        // ----------------------------------------------------
        // SUPPORT MULTIPLE RESPONSE FORMATS
        // ----------------------------------------------------

        let tasks = [];


        if (Array.isArray(data)) {

            tasks = data;

        } else if (
            Array.isArray(data.tasks)
        ) {

            tasks = data.tasks;

        } else if (
            Array.isArray(data.data)
        ) {

            tasks = data.data;

        }


        console.log(
            "Project ID used:",
            projectId
        );


        console.log(
            "Number of tasks found:",
            tasks.length
        );


        console.log(
            "Tasks:",
            tasks
        );


        // ----------------------------------------------------
        // UPDATE STATISTICS
        // ----------------------------------------------------

        const taskTotal =
            document.getElementById(
                "taskTotal"
            );


        const taskNotStarted =
            document.getElementById(
                "taskNotStarted"
            );


        const taskInProgress =
            document.getElementById(
                "taskInProgress"
            );


        const taskCompleted =
            document.getElementById(
                "taskCompleted"
            );


        if (taskTotal) {

            taskTotal.textContent =
                tasks.length;

        }


        if (taskNotStarted) {

            taskNotStarted.textContent =
                tasks.filter(
                    task =>
                        task.status ===
                        "Not Started"
                ).length;

        }


        if (taskInProgress) {

            taskInProgress.textContent =
                tasks.filter(
                    task =>
                        task.status ===
                        "In Progress"
                ).length;

        }


        if (taskCompleted) {

            taskCompleted.textContent =
                tasks.filter(
                    task =>
                        task.status ===
                        "Completed"
                ).length;

        }


        // ----------------------------------------------------
        // TASK TABLE
        // ----------------------------------------------------

        const table =
            document.getElementById(
                "tasksTable"
            );


        if (!table) {

            console.error(
                "tasksTable element was not found."
            );

            return;

        }


        table.innerHTML = "";


        // ----------------------------------------------------
        // NO TASKS
        // ----------------------------------------------------

        if (tasks.length === 0) {

            table.innerHTML = `
                <tr>

                    <td colspan="9">
                        No tasks found for this project.
                    </td>

                </tr>
            `;

            return;

        }


        // ----------------------------------------------------
        // DISPLAY TASKS
        // ----------------------------------------------------

        tasks.forEach(task => {

            const row =
                document.createElement(
                    "tr"
                );


            const statusClass =
                getStatusClass(
                    task.status
                );


            const scheduleStatus =
                getScheduleStatus(
                    task
                );


            const scheduleStatusClass =
                getScheduleStatusClass(
                    scheduleStatus
                );


            row.innerHTML = `

                <!-- PROCEDURE STAGE -->

                <td>
                    ${escapeHtml(
                        task.procedure_stage || "-"
                    )}
                </td>

                <!-- TASK -->

                <td>
                    ${escapeHtml(
                        task.task_activity || "-"
                    )}
                </td>

                <!-- STATUS -->

                <td>

                    <span
                        class="status ${statusClass}"
                    >
                        ${escapeHtml(
                            task.status || "-"
                        )}
                    </span>

                </td>


                <!-- PRIORITY -->

                <td>
                    ${escapeHtml(
                        task.priority || "-"
                    )}
                </td>


                <!-- RESPONSIBLE PERSON -->

                <td>
                    ${escapeHtml(
                        task.responsible_person || "-"
                    )}
                </td>


                <!-- DUE DATE -->

                <td>
                    ${escapeHtml(
                        formatDate(
                            task.due_date
                        )
                    )}
                </td>


                <!-- PERCENT COMPLETE -->

                <td>
                    ${escapeHtml(
                        task.percent_complete ?? 0
                    )}%
                </td>


                <!-- SCHEDULE STATUS -->

                <td>
                    <span class="schedule-status ${scheduleStatusClass}">
                        ${escapeHtml(
                            scheduleStatus
                        )}
                    </span>
                </td>


                <!-- ACTIONS -->

                <td class="task-actions"></td>

            `;


            // ------------------------------------------------
            // ADD ACTION MENU
            // ------------------------------------------------

            const actionsCell =
                row.querySelector(
                    ".task-actions"
                );


            if (actionsCell) {

                const actionMenu =
                    createActionMenu(
                        task
                    );


                actionsCell.appendChild(
                    actionMenu
                );

            }


            table.appendChild(
                row
            );

        });

    } catch (error) {

        console.error(
            "========================================"
        );


        console.error(
            "LOAD TASKS ERROR:",
            error
        );


        console.error(
            "Project ID:",
            projectId
        );


        console.error(
            "========================================"
        );


        alert(
            "Error loading tasks: " +
            error.message
        );

    }

}


// ============================================================
// CREATE / UPDATE TASK
// ============================================================

if (taskForm) {

    taskForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            updateProgressFromStatus();


            // ------------------------------------------------
            // COLLECT FORM DATA
            // ------------------------------------------------

            const taskData = {

                procedure_stage:
                    getValue(
                        "procedureStage"
                    ).trim(),


                task_activity:
                    getValue(
                        "taskActivity"
                    ).trim(),


                status:
                    getValue(
                        "taskStatus"
                    ),

                priority:
                    getValue(
                        "taskPriority"
                    ),
stakeholder_end_user:
                    getValue(
                        "stakeholderEndUser"
                    ).trim(),


                start_date:
                    getValue(
                        "startDate"
                    ) || null,


                due_date:
                    getValue(
                        "dueDate"
                    ) || null,


                completion_date:
                    getValue("taskStatus") === "Completed"
                        ? (
                            editingTaskCompletionDate ||
                            new Date().toLocaleDateString("en-CA")
                        )
                        : null,


                deliverable_expected_output:
                    getValue(
                        "deliverableExpectedOutput"
                    ).trim(),


                evidence_applicability:
                    getValue(
                        "evidenceApplicability"
                    ),


                percent_complete:
                    Number(
                        getValue(
                            "percentComplete"
                        ) || 0
                    )

            };


            console.log(
                "Task data:",
                taskData
            );


            // ------------------------------------------------
            // DETERMINE CREATE OR UPDATE
            // ------------------------------------------------

            const isEditing =
                editingTaskId !== null;


            let url;
            let method;


            if (isEditing) {

                url =
                    `/api/tasks/${encodeURIComponent(
                        editingTaskId
                    )}`;


                method =
                    "PUT";

            } else {

                url =
                    `/api/projects/${encodeURIComponent(
                        projectId
                    )}/tasks`;


                method =
                    "POST";

            }


            console.log(
                "Request:",
                method,
                url
            );


            // ------------------------------------------------
            // SEND REQUEST
            // ------------------------------------------------

            try {

                const response =
                    await fetch(
                        url,
                        {
                            method: method,

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    taskData
                                )
                        }
                    );


                const result =
                    await response.json();


                console.log(
                    "Server response:",
                    result
                );


                if (!response.ok) {

                    throw new Error(
                        result.error ||
                        (
                            isEditing
                                ? "Failed to update task."
                                : "Failed to create task."
                        )
                    );

                }


                // ------------------------------------------------
                // SUCCESS
                // ------------------------------------------------

                alert(
                    isEditing
                        ? "Task updated successfully!"
                        : "Task created successfully!"
                );


                // ------------------------------------------------
                // CLOSE MODAL
                // ------------------------------------------------

                closeModal();


                // ------------------------------------------------
                // REFRESH TASKS
                // ------------------------------------------------

                await loadTasks();

            } catch (error) {

                console.error(
                    isEditing
                        ? "Update task error:"
                        : "Create task error:",
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
// SUBMIT REVIEW
// ============================================================

if (reviewForm) {

    reviewForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            // ------------------------------------------------
            // CHECK TASK
            // ------------------------------------------------

            if (!currentReviewTaskId) {

                alert(
                    "No task selected for review."
                );

                return;

            }


            // ------------------------------------------------
            // COLLECT REVIEW DATA
            // ------------------------------------------------

            const reviewData = {
review_result:
                    getValue(
                        "reviewResult"
                    ),


                review_date:
                    getValue(
                        "reviewDate"
                    ) || null,


                remarks:
                    getValue(
                        "reviewRemarks"
                    ).trim()

            };


            // ------------------------------------------------
            // VALIDATION
            // ------------------------------------------------

            if (
                !reviewData.reviewed_verified_by
            ) {

                alert(
                    "Please enter the name of the reviewer."
                );

                return;

            }


            if (
                !reviewData.review_result
            ) {

                alert(
                    "Please select a review result."
                );

                return;

            }


            if (
                !reviewData.review_date
            ) {

                alert(
                    "Please enter the review date."
                );

                return;

            }


            // ------------------------------------------------
            // SEND REVIEW
            // ------------------------------------------------

            try {

                const response =
                    await fetch(
                        `/api/tasks/${encodeURIComponent(
                            currentReviewTaskId
                        )}/review`,
                        {
                            method: "PUT",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    reviewData
                                )
                        }
                    );


                const result =
                    await response.json();


                console.log(
                    "Review response:",
                    result
                );


                if (!response.ok) {

                    throw new Error(
                        result.error ||
                        "Failed to submit review."
                    );

                }


                // ------------------------------------------------
                // SUCCESS
                // ------------------------------------------------

                alert(
                    "Task review submitted successfully!"
                );


                closeReviewModal();


                await loadTasks();

            } catch (error) {

                console.error(
                    "Submit review error:",
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
// INITIAL LOAD
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {
        await loadProjectMembers();
        await loadTasks();
    }
);

// ============================================================
// AUTO PROGRESS BASED ON STATUS
// ============================================================

function updateProgressFromStatus() {

    const status =
        document.getElementById("taskStatus");

    const progress =
        document.getElementById("percentComplete");

    if (!status || !progress) {
        return;
    }

    const progressByStatus = {
        "Not Started": 0,
        "In Progress": 50,
        "On Hold": 50,
        "Completed": 100
    };

    progress.value =
        progressByStatus[status.value] ?? 0;
}


const taskStatus =
    document.getElementById("taskStatus");

if (taskStatus) {

    taskStatus.addEventListener(
        "change",
        updateProgressFromStatus
    );
} 