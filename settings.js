
import { supabase } from "./supabase.js";

// =====================================
// 1. PAGE ELEMENTS
// =====================================

const profileForm = document.getElementById("profileSettingsForm");
const displayNameInput = document.getElementById("displayName");
const bioInput = document.getElementById("bio");

const avatarInput = document.getElementById("avatarInput");
const avatarPreview = document.getElementById("avatarPreview");

const profileMessage = document.getElementById("profileMessage");
const saveProfileButton = document.getElementById("saveProfileButton");

const emailForm = document.getElementById("emailSettingsForm");
const newEmailInput = document.getElementById("newEmail");
const emailMessage = document.getElementById("emailMessage");

const passwordForm = document.getElementById("passwordSettingsForm");
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
const passwordMessage = document.getElementById("passwordMessage");

const memberCodeElement = document.getElementById("settingsMemberCode");
const memberStatusElement = document.getElementById("settingsMemberStatus");

const logoutButton = document.getElementById("logoutButton");
const logoutMessage = document.getElementById("logoutMessage");

// =====================================
// 2. PAGE DATA
// =====================================

let currentUser = null;
let currentAvatarUrl = "";
let selectedPhoto = null;

const DEFAULT_AVATAR = "./images/default-profile.png";

// =====================================
// 3. MESSAGE HELPER
// =====================================

function showMessage(element, message, success = false) {
    element.textContent = message;
    element.style.color = success ? "#86EFAC" : "#FCA5A5";
}

// =====================================
// 4. LOAD CURRENT USER
// =====================================

async function loadSettings() {
    const { data: userData, error: userError } =
        await supabase.auth.getUser();

    if (userError || !userData.user) {
        window.location.href = "./login.html";
        return;
    }

    currentUser = userData.user;

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("display_name, member_code, status, bio, avatar_url")
        .eq("id", currentUser.id)
        .single();

    if (error) {
        console.error("Profile loading error:", error);
        showMessage(
            profileMessage,
            "Could not load your profile. Please refresh the page."
        );
        return;
    }

    displayNameInput.value = profile.display_name || "";
    bioInput.value = profile.bio || "";

    currentAvatarUrl = profile.avatar_url || "";

    avatarPreview.src = currentAvatarUrl || DEFAULT_AVATAR;

    memberCodeElement.textContent = profile.member_code || "Not assigned";
    memberStatusElement.textContent = profile.status || "Unknown";

    if (currentUser.email) {
        newEmailInput.placeholder = currentUser.email;
    }
}

// =====================================
// 5. PREVIEW SELECTED PHOTO
// =====================================

avatarInput.addEventListener("change", () => {
    const file = avatarInput.files[0];

    if (!file) return;

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
        showMessage(
            profileMessage,
            "Please choose a JPG, PNG or WEBP image."
        );

        avatarInput.value = "";
        selectedPhoto = null;
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showMessage(
            profileMessage,
            "Your photo must be smaller than 5 MB."
        );

        avatarInput.value = "";
        selectedPhoto = null;
        return;
    }

    selectedPhoto = file;

    const previewUrl = URL.createObjectURL(file);
    avatarPreview.src = previewUrl;

    showMessage(profileMessage, "Photo selected. Save your profile to upload it.", true);
});

// =====================================
// 6. UPLOAD PROFILE PHOTO
// =====================================

async function uploadProfilePhoto() {
    if (!selectedPhoto) {
        return currentAvatarUrl;
    }

    const extension = selectedPhoto.type === "image/png"
        ? "png"
        : selectedPhoto.type === "image/webp"
            ? "webp"
            : "jpg";

    const filePath =
        `${currentUser.id}/avatar-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, selectedPhoto, {
            contentType: selectedPhoto.type,
            cacheControl: "3600",
            upsert: false
        });

    if (uploadError) {
        throw uploadError;
    }

    const { data } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(filePath);

    return data.publicUrl;
}

// =====================================
// 7. SAVE PROFILE CHANGES
// =====================================

profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) return;

    const displayName = displayNameInput.value.trim();
    const bio = bioInput.value.trim();

    if (!displayName) {
        showMessage(profileMessage, "Please enter your display name.");
        return;
    }

    saveProfileButton.disabled = true;
    saveProfileButton.textContent = "Saving...";

    try {
        const avatarUrl = await uploadProfilePhoto();

        const { error } = await supabase
            .from("profiles")
            .update({
                display_name: displayName,
                bio: bio,
                avatar_url: avatarUrl
            })
            .eq("id", currentUser.id);

        if (error) {
            throw error;
        }

        currentAvatarUrl = avatarUrl;
        selectedPhoto = null;
        avatarInput.value = "";

        showMessage(
            profileMessage,
            "Your profile has been updated successfully!",
            true
        );

    } catch (error) {
        console.error("Profile update error:", error);

        showMessage(
            profileMessage,
            error.message || "Could not save your profile."
        );

    } finally {
        saveProfileButton.disabled = false;
        saveProfileButton.textContent = "Save profile";
    }
});

// =====================================
// 8. UPDATE EMAIL
// =====================================

emailForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const newEmail = newEmailInput.value.trim();

    if (!newEmail) {
        showMessage(emailMessage, "Please enter your new email.");
        return;
    }

    const button = document.getElementById("updateEmailButton");

    button.disabled = true;
    button.textContent = "Updating...";

    const { error } = await supabase.auth.updateUser({
        email: newEmail
    });

    if (error) {
        showMessage(emailMessage, error.message);
    } else {
        showMessage(
            emailMessage,
            "Email update requested. Check your inbox for confirmation.",
            true
        );

        newEmailInput.value = "";
    }

    button.disabled = false;
    button.textContent = "Update email";
});

// =====================================
// 9. UPDATE PASSWORD
// =====================================

passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const password = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (password.length < 8) {
        showMessage(
            passwordMessage,
            "Your password must contain at least 8 characters."
        );
        return;
    }

    if (password !== confirmPassword) {
        showMessage(passwordMessage, "The passwords do not match.");
        return;
    }

    const button = document.getElementById("updatePasswordButton");

    button.disabled = true;
    button.textContent = "Updating...";

    const { error } = await supabase.auth.updateUser({
        password: password
    });

    if (error) {
        showMessage(passwordMessage, error.message);
    } else {
        showMessage(
            passwordMessage,
            "Your password has been updated successfully.",
            true
        );

        passwordForm.reset();
    }

    button.disabled = false;
    button.textContent = "Update password";
});

// =====================================
// 10. SIGN OUT
// =====================================

logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    logoutButton.textContent = "Signing out...";

    const { error } = await supabase.auth.signOut();

    if (error) {
        showMessage(logoutMessage, error.message);
        logoutButton.disabled = false;
        logoutButton.textContent = "Sign out";
        return;
    }

    window.location.href = "./login.html";
});

// =====================================
// 11. START SETTINGS PAGE
// =====================================

loadSettings();
