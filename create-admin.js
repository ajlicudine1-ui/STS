require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || "");
const fullName = String(process.env.ADMIN_NAME || "DevT Administrator").trim();

if (!url || !serviceKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
if (!email || password.length < 8) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (minimum 8 characters) in .env.");

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

(async () => {
    let user;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name: fullName, role: "admin" }
    });

    if (createError) {
        // If account already exists, locate it and update it.
        const { data: users, error: listError } = await admin.auth.admin.listUsers();
        if (listError) throw listError;
        user = users.users.find(u => String(u.email || "").toLowerCase() === email);
        if (!user) throw createError;
        const { error: updateError } = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
        if (updateError) throw updateError;
    } else {
        user = created.user;
    }

    const { error: profileError } = await admin.from("profiles").upsert({
        user_id: user.id,
        full_name: fullName,
        email,
        role: "admin",
        is_active: true,
        updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });
    if (profileError) throw profileError;

    console.log(`Admin ready: ${email}`);
})().catch(error => { console.error(error.message); process.exit(1); });
