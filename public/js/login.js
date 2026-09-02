const form = document.getElementById("loginForm");
const errorBox = document.getElementById("loginError");
const loginBtn = document.getElementById("loginBtn");
const password = document.getElementById("password");
const fullName = document.getElementById("fullName");

const TOKEN_KEY = "devt_access_token";
const PROFILE_KEY = "devt_profile";

// Remove auth values from the old shared localStorage implementation.
// Component HTML caches use different keys and are not affected.
localStorage.removeItem(TOKEN_KEY);
localStorage.removeItem(PROFILE_KEY);

document
    .getElementById("togglePassword")
    ?.addEventListener("click", event => {

        const showing =
            password.type === "text";

        password.type =
            showing
                ? "password"
                : "text";

        event.currentTarget.textContent =
            showing
                ? "Show"
                : "Hide";
    });


// A session belongs only to this browser tab.
if (sessionStorage.getItem(TOKEN_KEY)) {
    window.location.replace("/");
}


form.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        errorBox.textContent = "";

        loginBtn.disabled = true;
        loginBtn.textContent = "Signing in...";

        try {

            // Clear any previous account in THIS TAB before starting
            // a new login, so role-specific UI cannot carry over.
            sessionStorage.removeItem(TOKEN_KEY);
            sessionStorage.removeItem(PROFILE_KEY);

            const enteredFullName =
                fullName.value.trim();

            if (!enteredFullName) {
                throw new Error(
                    "Please enter your username."
                );
            }

            const response =
                await fetch(
                    "/api/auth/login",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                full_name:
                                    enteredFullName,

                                password:
                                    password.value
                            })
                    }
                );

            const responseText =
                await response.text();

            let result = {};

            try {
                result =
                    responseText
                        ? JSON.parse(responseText)
                        : {};
            } catch {
                throw new Error(
                    response.ok
                        ? "The server returned an invalid response."
                        : responseText || "Sign in failed."
                );
            }

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    "Invalid username or password."
                );
            }

            if (
                !result.access_token ||
                !result.profile
            ) {
                throw new Error(
                    "The server did not return a complete DevT session."
                );
            }

            sessionStorage.setItem(
                TOKEN_KEY,
                result.access_token
            );

            sessionStorage.setItem(
                PROFILE_KEY,
                JSON.stringify(
                    result.profile
                )
            );

            window.location.replace("/");

        } catch (error) {

            // Do not leave a partial/stale role in this tab.
            sessionStorage.removeItem(TOKEN_KEY);
            sessionStorage.removeItem(PROFILE_KEY);

            errorBox.textContent =
                error.message;

        } finally {

            loginBtn.disabled = false;
            loginBtn.textContent = "Sign In";
        }
    }
);
