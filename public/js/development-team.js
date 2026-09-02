const table = document.getElementById("membersTable");
const modal = document.getElementById("memberModal");
const form = document.getElementById("memberForm");
const search = document.getElementById("memberSearch");

let members = [];


/* ============================================================
   HELPERS
   ============================================================ */

function esc(v) {
    return String(v ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function fmt(d) {
    if (!d) return "-";

    const x = new Date(d);

    return Number.isNaN(x.getTime())
        ? String(d)
        : x.toLocaleDateString();
}


/* ============================================================
   RENDER MEMBERS
   ============================================================ */

function render() {

    const q = search.value.trim().toLowerCase();

    const rows = members.filter(m =>
        !q ||
        `${m.full_name} ${m.email}`
            .toLowerCase()
            .includes(q)
    );

    document.getElementById("memberCount").textContent =
        members.length;

    document.getElementById("activeCount").textContent =
        members.filter(m => m.is_active !== false).length;


    if (!rows.length) {

        table.innerHTML = `
            <tr>
                <td colspan="5">
                    No development team accounts found.
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML = rows.map(m => `
        <tr>

            <td>
                <strong>${esc(m.full_name)}</strong>
            </td>

            <td>
                ${esc(m.email)}
            </td>

            <td>
                <span class="account-status ${
                    m.is_active !== false
                        ? "active"
                        : "inactive"
                }">
                    ${
                        m.is_active !== false
                            ? "Active"
                            : "Inactive"
                    }
                </span>
            </td>

            <td>
                ${esc(fmt(m.created_at))}
            </td>

            <td>

                <div class="account-actions">

                    <button
                        data-edit="${esc(m.user_id)}"
                    >
                        Edit
                    </button>

                    <button
                        class="danger"
                        data-delete="${esc(m.user_id)}"
                    >
                        Delete
                    </button>

                </div>

            </td>

        </tr>
    `).join("");


    table
        .querySelectorAll("[data-edit]")
        .forEach(b => {

            b.onclick = () =>
                openEdit(b.dataset.edit);

        });


    table
        .querySelectorAll("[data-delete]")
        .forEach(b => {

            b.onclick = () =>
                deleteMember(b.dataset.delete);

        });
}


/* ============================================================
   LOAD MEMBERS
   ============================================================ */

async function load() {

    const r = await fetch("/api/development-team");

    const x = await r.json();


    if (r.status === 403) {

        window.location.replace("/");

        return;
    }


    if (!r.ok) {

        throw new Error(
            x.error ||
            "Failed to load accounts"
        );
    }


    members = x.members || [];

    render();
}


/* ============================================================
   OPEN NEW MEMBER MODAL
   ============================================================ */

function openNew() {

    form.reset();


    document.getElementById(
        "editingUserId"
    ).value = "";


    document.getElementById(
        "memberModalTitle"
    ).textContent =
        "Add Development Team Member";


    document.getElementById(
        "memberModalSubtitle"
    ).textContent =
        "Create a login account for a development team member.";


    document.getElementById(
        "passwordLabel"
    ).textContent =
        "Temporary Password *";


    document.getElementById(
        "passwordHint"
    ).textContent =
        "The member can use this password to sign in immediately.";


    /* Password is required when creating */

    document.getElementById(
        "memberPassword"
    ).required = true;


    /* Show Confirm Password */

    document.getElementById(
        "confirmPasswordField"
    ).hidden = false;


    document.getElementById(
        "memberConfirmPassword"
    ).required = true;


    /* Reset Confirm Password text for Add Member */

    document.getElementById(
        "confirmPasswordLabel"
    ).textContent =
        "Confirm Password *";

    document.getElementById(
        "memberConfirmPassword"
    ).placeholder =
        "Re-enter temporary password";

    document.getElementById(
        "confirmPasswordHint"
    ).textContent =
        "Re-enter the temporary password to confirm.";

    document.getElementById(
        "activeField"
    ).hidden = true;


    document.getElementById(
        "saveMemberBtn"
    ).textContent =
        "Create Account";


    document.getElementById(
        "memberFormError"
    ).textContent = "";


    modal.classList.add("show");
}


/* ============================================================
   OPEN EDIT MEMBER MODAL
   ============================================================ */

function openEdit(id) {

    const m = members.find(
        x => x.user_id === id
    );

    if (!m) return;


    form.reset();


    document.getElementById(
        "editingUserId"
    ).value = id;


    document.getElementById(
        "memberFullName"
    ).value =
        m.full_name || "";


    document.getElementById(
        "memberEmail"
    ).value =
        m.email || "";


    document.getElementById(
        "memberActive"
    ).checked =
        m.is_active !== false;


    document.getElementById(
        "memberModalTitle"
    ).textContent =
        "Edit Development Team Member";


    document.getElementById(
        "memberModalSubtitle"
    ).textContent =
        "Update this development team account.";


    document.getElementById(
        "passwordLabel"
    ).textContent =
        "New Password";


    document.getElementById(
        "passwordHint"
    ).textContent =
        "Leave blank to keep the current password.";


    /* Password is optional when editing */

    document.getElementById(
        "memberPassword"
    ).required = false;


    /* Show Confirm New Password when editing */

    document.getElementById(
        "confirmPasswordField"
    ).hidden = false;

    document.getElementById(
        "confirmPasswordLabel"
    ).textContent =
        "Confirm New Password";

    document.getElementById(
        "memberConfirmPassword"
    ).required = false;

    document.getElementById(
        "memberConfirmPassword"
    ).value = "";

    document.getElementById(
        "memberConfirmPassword"
    ).placeholder =
        "Re-enter new password";

    document.getElementById(
        "confirmPasswordHint"
    ).textContent =
    "Required only when changing the password.";


    document.getElementById(
        "activeField"
    ).hidden = false;


    document.getElementById(
        "saveMemberBtn"
    ).textContent =
        "Save Changes";


    document.getElementById(
        "memberFormError"
    ).textContent = "";


    modal.classList.add("show");
}


/* ============================================================
   CLOSE MODAL
   ============================================================ */

function close() {

    modal.classList.remove("show");

    form.reset();

    document.getElementById(
        "memberFormError"
    ).textContent = "";
}


/* ============================================================
   DELETE MEMBER
   ============================================================ */

async function deleteMember(id) {

    const m = members.find(
        x => x.user_id === id
    );


    if (
        !m ||
        !confirm(
            `Delete the account for ${m.full_name}?\n\n` +
            `Existing project history will remain, ` +
            `but the account will no longer be able to sign in.`
        )
    ) {
        return;
    }


    const r = await fetch(
        `/api/development-team/${encodeURIComponent(id)}`,
        {
            method: "DELETE"
        }
    );


    const x = await r.json();


    if (!r.ok) {

        alert(
            x.error ||
            "Unable to delete account"
        );

        return;
    }


    await load();
}


/* ============================================================
   CREATE / UPDATE MEMBER
   ============================================================ */

form.addEventListener(
    "submit",
    async e => {

        e.preventDefault();


        const id =
            document.getElementById(
                "editingUserId"
            ).value;


        const fullName =
            document.getElementById(
                "memberFullName"
            ).value.trim();


        const email =
            document.getElementById(
                "memberEmail"
            ).value.trim();


        const password =
            document.getElementById(
                "memberPassword"
            ).value;


        const confirmPassword =
            document.getElementById(
                "memberConfirmPassword"
            ).value;


        const btn =
            document.getElementById(
                "saveMemberBtn"
            );


        const err =
            document.getElementById(
                "memberFormError"
            );


        err.textContent = "";


        /* ====================================================
           CREATE ACCOUNT VALIDATION
           ==================================================== */

        if (!id) {

            if (!password) {

                err.textContent =
                    "Temporary password is required.";

                document.getElementById(
                    "memberPassword"
                ).focus();

                return;
            }


            const strongPassword =
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

            if (!strongPassword.test(password)) {

                err.textContent =
                    "Password must be at least 8 characters and contain an uppercase letter, lowercase letter, number, and special character.";

                document.getElementById(
                    "memberPassword"
                ).focus();

                return;
            }


            if (!confirmPassword) {

                err.textContent =
                    "Please confirm the temporary password.";

                document.getElementById(
                    "memberConfirmPassword"
                ).focus();

                return;
            }


            if (password !== confirmPassword) {

                err.textContent =
                    "Passwords do not match.";

                document.getElementById(
                    "memberConfirmPassword"
                ).focus();

                return;
            }
        }


        /* ====================================================
   EDIT PASSWORD VALIDATION
   ==================================================== */

        const strongPassword =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

        if (id && password) {

            if (!strongPassword.test(password)) {

                err.textContent =
                    "New password must be at least 8 characters and contain an uppercase letter, lowercase letter, number, and special character.";

                document.getElementById(
                    "memberPassword"
                ).focus();

                return;
            }

            if (!confirmPassword) {

                err.textContent =
                    "Please confirm the new password.";

                document.getElementById(
                    "memberConfirmPassword"
                ).focus();

                return;
            }

            if (password !== confirmPassword) {

                err.textContent =
                    "Passwords do not match.";

                document.getElementById(
                    "memberConfirmPassword"
                ).focus();

                return;
            }
        }

    


        /* ====================================================
           PAYLOAD
           ==================================================== */

        const payload = {

            full_name: fullName,

            email: email,

            password: password

        };


        if (id) {

            payload.is_active =
                document.getElementById(
                    "memberActive"
                ).checked;
        }


        btn.disabled = true;


        btn.textContent =
            id
                ? "Saving..."
                : "Creating...";


        try {

            const r = await fetch(

                id
                    ? `/api/development-team/${encodeURIComponent(id)}`
                    : "/api/development-team",

                {

                    method:
                        id
                            ? "PATCH"
                            : "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(payload)

                }

            );


            const x = await r.json();


            if (!r.ok) {

                throw new Error(
                    x.error ||
                    "Unable to save account"
                );
            }


            close();

            await load();


        } catch (error) {

            err.textContent =
                error.message;


        } finally {

            btn.disabled = false;


            btn.textContent =
                id
                    ? "Save Changes"
                    : "Create Account";
        }
    }
);


/* ============================================================
   EVENTS
   ============================================================ */

document.getElementById(
    "addMemberBtn"
).onclick = openNew;


document.getElementById(
    "closeMemberModal"
).onclick = close;


document.getElementById(
    "cancelMemberBtn"
).onclick = close;


search.oninput = render;


modal.addEventListener(
    "click",
    e => {

        if (e.target === modal) {

            close();
        }
    }
);


/* ============================================================
   INITIAL LOAD
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setTimeout(
            () =>
                load().catch(e => {

                    table.innerHTML = `
                        <tr>
                            <td colspan="5">
                                ${esc(e.message)}
                            </td>
                        </tr>
                    `;

                }),
            0
        );
    }
);