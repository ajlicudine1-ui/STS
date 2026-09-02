require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const url =
    process.env.SUPABASE_URL;

const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const userId =
    String(
        process.env.ADMIN_USER_ID || ""
    ).trim();

const email =
    String(
        process.env.ADMIN_EMAIL || ""
    )
        .trim()
        .toLowerCase();

const password =
    String(
        process.env.ADMIN_PASSWORD || ""
    );

const fullName =
    String(
        process.env.ADMIN_NAME ||
        "DevT Administrator"
    ).trim();



/* ============================================================
   VALIDATE ENVIRONMENT VARIABLES
   ============================================================ */

if (!url || !serviceKey) {

    throw new Error(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
    );

}



if (!userId) {

    throw new Error(
        "ADMIN_USER_ID is required."
    );

}



if (!email) {

    throw new Error(
        "ADMIN_EMAIL is required."
    );

}



/* ============================================================
   CREATE SUPABASE ADMIN CLIENT
   ============================================================ */

const admin =
    createClient(
        url,
        serviceKey,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        }
    );



/* ============================================================
   UPDATE ADMIN
   ============================================================ */

(async () => {

    console.log(
        "Updating admin account..."
    );



    /* ========================================================
       AUTH USER UPDATE
       ======================================================== */

    const authUpdate = {

        email: email,

        email_confirm: true,

        user_metadata: {

            full_name: fullName,

            name: fullName,

            display_name: fullName,

            role: "admin"

        }

    };



    /*
       ADMIN_PASSWORD is optional.

       If left blank:
       current password stays unchanged.

       If provided:
       password will be replaced.
    */

    if (password) {

        const strongPassword =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;



        if (!strongPassword.test(password)) {

            throw new Error(
                "ADMIN_PASSWORD must be at least 8 characters and contain an uppercase letter, lowercase letter, number, and special character."
            );

        }



        authUpdate.password =
            password;

    }



    const {
        data: updatedUser,
        error: updateError
    } =
        await admin.auth.admin.updateUserById(
            userId,
            authUpdate
        );



    if (updateError) {

        throw updateError;

    }



    if (!updatedUser?.user) {

        throw new Error(
            "Supabase Auth user was not returned after update."
        );

    }



    console.log(
        "Supabase Auth user updated."
    );



    /* ========================================================
       PROFILE UPDATE
       ======================================================== */

    const {
        error: profileError
    } =
        await admin
            .from("profiles")
            .upsert(
                {

                    user_id:
                        userId,

                    full_name:
                        fullName,

                    email:
                        email,

                    role:
                        "admin",

                    is_active:
                        true,

                    updated_at:
                        new Date().toISOString()

                },
                {

                    onConflict:
                        "user_id"

                }
            );



    if (profileError) {

        throw profileError;

    }



    console.log(
        "Admin profile updated."
    );



    /* ========================================================
       SUCCESS
       ======================================================== */

    console.log(
        "===================================="
    );

    console.log(
        "Admin updated successfully."
    );

    console.log(
        `Name: ${fullName}`
    );

    console.log(
        `Email: ${email}`
    );

    console.log(
        `User ID: ${userId}`
    );

    console.log(
        password
            ? "Password: UPDATED"
            : "Password: UNCHANGED"
    );

    console.log(
        "===================================="
    );

})()

.catch(error => {

    console.error(
        "Admin update failed:"
    );

    console.error(
        error.message
    );

    process.exit(1);

});