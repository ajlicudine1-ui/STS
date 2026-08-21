// ============================================================
// DASHBOARD
// ============================================================

async function loadDashboard() {

    try {

        const response = await fetch("/api/dashboard");

        if (!response.ok) {
            throw new Error("Failed to load dashboard data.");
        }

        const data = await response.json();


        // Statistics
        document.getElementById("totalProjects").textContent =
            data.totalProjects;

        document.getElementById("activeProjects").textContent =
            data.activeProjects;

        document.getElementById("completedProjects").textContent =
            data.completedProjects;

        document.getElementById("totalTasks").textContent =
            data.totalTasks;


        // Projects table
        const table =
            document.getElementById("projectsTable");

        table.innerHTML = "";


        if (data.projects.length === 0) {

            table.innerHTML = `
                <tr>
                    <td colspan="5">
                        No projects found.
                    </td>
                </tr>
            `;

            return;
        }


        data.projects.forEach(project => {

            const row =
                document.createElement("tr");

            let statusClass =
                "status-pending";


            if (project.project_status === "Active") {
                statusClass = "status-active";
            }


            if (project.project_status === "Completed") {
                statusClass = "status-completed";
            }


            row.innerHTML = `
                <td>
                    ${project.project_name}
                </td>

                <td>
                    ${project.project_owner || "-"}
                </td>

                <td>
                    <span class="status ${statusClass}">
                        ${project.project_status}
                    </span>
                </td>

                <td>
                    ${project.date_opened || "-"}
                </td>

                <td>
                    <button
                        class="btn btn-primary view-tasks-btn"
                        data-project-id="${project.project_id}"
                    >
                        View Tasks
                    </button>
                </td>
            `;


            table.appendChild(row);

            const viewTasksBtn =
                row.querySelector(".view-tasks-btn");

            viewTasksBtn.addEventListener("click", () => {
                const projectId =
                    viewTasksBtn.dataset.projectId;

                window.location.href =
                    `/tasks.html?project_id=${projectId}`;
            });

        });


    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );

    }

}


// ============================================================
// PROJECT MODAL
// ============================================================

const projectModal =
    document.getElementById("projectModal");

const newProjectBtn =
    document.getElementById("newProjectBtn");

const closeProjectModal =
    document.getElementById("closeProjectModal");

const cancelProjectBtn =
    document.getElementById("cancelProjectBtn");


// Open modal
newProjectBtn.addEventListener(
    "click",
    () => {

        projectModal.classList.add("show");

    }
);


// Close modal
function closeModal() {

    projectModal.classList.remove("show");

}


closeProjectModal.addEventListener(
    "click",
    closeModal
);


cancelProjectBtn.addEventListener(
    "click",
    closeModal
);


// Close when clicking outside
projectModal.addEventListener(
    "click",
    event => {

        if (event.target === projectModal) {

            closeModal();

        }

    }
);


// ============================================================
// CREATE PROJECT
// ============================================================

const projectForm =
    document.getElementById("projectForm");


projectForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const projectData = {

            project_name:
                document.getElementById(
                    "projectName"
                ).value.trim(),

            project_folder_link:
                document.getElementById(
                    "projectFolderLink"
                ).value.trim(),

            project_owner:
                document.getElementById(
                    "projectOwner"
                ).value.trim(),

            project_status:
                document.getElementById(
                    "projectStatus"
                ).value,

            date_opened:
                document.getElementById(
                    "dateOpened"
                ).value || null,

            date_closed:
                document.getElementById(
                    "dateClosed"
                ).value || null

        };


        try {

            const response =
                await fetch(
                    "/api/projects",
                    {
                        method: "POST",

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
                    "Failed to create project."
                );

            }


            alert(
                "Project created successfully!"
            );


            projectForm.reset();

            closeModal();

            loadDashboard();


        } catch (error) {

            console.error(
                "Create project error:",
                error
            );

            alert(
                "Error: " +
                error.message
            );

        }

    }
);


// ============================================================
// INITIAL LOAD
// ============================================================

loadDashboard();