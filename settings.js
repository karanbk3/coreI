
import { supabase } from "./supabase.js";

// =============================================
// 1. PAGE ELEMENTS
// =============================================

// Personal information
const profileForm = document.getElementById("profileSettingsForm");
const displayNameInput = document.getElementById("displayName");
const bioInput = document.getElementById("bio");
const avatarInput = document.getElementById("avatarInput");
const avatarPreview = document.getElementById("avatarPreview");
const profileMessage = document.getElementById("profileMessage");
const saveProfileButton = document.getElementById("saveProfileButton");

// Email
const emailForm = document.getElementById("emailSettingsForm");
const newEmailInput = document.getElementById("newEmail");
const emailMessage = document.getElementById("emailMessage");
const updateEmailButton = document.getElementById("updateEmailButton");

// Password
const passwordForm = document.getElementById("passwordSettingsForm");
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
const passwordMessage = document.getElementById("passwordMessage");
const updatePasswordButton = document.getElementById("updatePasswordButton");

// Account information
const memberCodeElement = document.getElementById("settingsMemberCode");
const memberStatusElement = document.getElementById("settingsMemberStatus");

// Logout
const logoutButton = document.getElementById("logoutButton");
const logoutMessage = document.getElementById("logoutMessage");

// Search and navigation
const settingsSearch = document.getElementById("settingsSearch");
const clearSettingsSearch = document.getElementById("clearSettingsSearch");
const navigation = document.getElementById("settingsNavigation");
const navigationLinks = document.querySelectorAll(".settings-menu-link");
const settingsSections = document.querySelectorAll(
    ".settings-content .settings-section"
);

// Notifications
const ideaNotifications = document.getElementById("ideaNotifications");
const announcementNotifications = document.getElementById("announcementNotifications");
const accountNotifications = document.getElementById("accountNotifications");
const saveNotificationSettings = document.getElementById("saveNotificationSettings");
const notificationMessage = document.getElementById("notificationMessage");

// Appearance
const themeInputs = document.querySelectorAll('input[name="theme"]');
const themeMessage = document.getElementById("themeMessage");

// Privacy
const profileVisibility = document.getElementById("profileVisibility");
const showBio = document.getElementById("showBio");
const savePrivacySettings = document.getElementById("savePrivacySettings");
const privacyMessage = document.getElementById("privacyMessage");

// Activity
const myIdeasCount = document.getElementById("myIdeasCount");
const myNotificationsCount = document.getElementById("myNotificationsCount");
const activityList = document.getElementById("activityList");
const activityMessage = document.getElementById("activityMessage");

// Data management
const exportDataButton = document.getElementById("exportDataButton");
const exportMessage = document.getElementById("exportMessage");
const accountDeletionInfoButton = document.getElementById("accountDeletionInfoButton");
const accountDeletionInfo = document.getElementById("accountDeletionInfo");

// Support
const supportForm = document.getElementById("supportForm");
const supportFormMessage = document.getElementById("supportFormMessage");

// =============================================
// 2. SETTINGS
// =============================================

const DEFAULT_AVATAR = "./images/default-profile.png";
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

const STORAGE_KEYS = {
    theme: "coreI_theme",
    notifications: "coreI_notification_preferences",
    privacy: "coreI_privacy_preferences"
};

let currentUser = null;
let currentProfile = null;
let currentAvatarUrl = "";
let selectedPhoto = null;
let previewObjectUrl = null;


// =============================================
// 3. HELPER FUNCTIONS
// =============================================

function showMessage(element, message, success = false) {
    if (!element) return;

    element.textContent = message;
    element.style.color = success ? "#86EFAC" : "#FCA5A5";
}

function setButtonLoading(button, loading, normalText, loadingText) {
    if (!button) return;

    button.disabled = loading;
    button.textContent = loading ? loadingText : normalText;
}

function readLocalSettings(key, fallback) {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : fallback;
    } catch (error) {
        console.error("Could not read local settings:", error);
        return fallback;
    }
}

function saveLocalSettings(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error("Could not save local settings:", error);
        return false;
    }
}

function formatDate(dateValue) {
    if (!dateValue) return "Date unavailable";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}


// =============================================
// 4. LOAD LOGGED-IN USER
// =============================================

async function loadSettings() {
    try {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
            window.location.href = "./login.html";
            return;
        }

        currentUser = data.user;

        await loadUserProfile();

        loadNotificationSettings();
        loadPrivacySettings();
        loadThemeSettings();

        await loadActivity();

    } catch (error) {
        console.error("Settings loading error:", error);

        showMessage(
            profileMessage,
            "Could not load your settings. Please refresh the page."
        );
    }
}


// =============================================
// 5. LOAD PROFILE
// =============================================

async function loadUserProfile() {
    const { data: profile, error } = await supabase
        .from("profiles")
        .select(`
            display_name,
            member_code,
            status,
            bio,
            avatar_url,
            name_last_changed_at
        `)
        .eq("id", currentUser.id)
        .single();

    if (error) {
        console.error("Profile loading error:", error);

        showMessage(
            profileMessage,
            "Could not load your profile information."
        );

        return;
    }

    currentProfile = profile;
    currentAvatarUrl = profile.avatar_url || "";

    if (displayNameInput) {
        displayNameInput.value = profile.display_name || "";
    }

    if (bioInput) {
        bioInput.value = profile.bio || "";
    }

    if (avatarPreview) {
        avatarPreview.src = currentAvatarUrl || DEFAULT_AVATAR;
    }

    if (memberCodeElement) {
        memberCodeElement.textContent =
            profile.member_code || "Not assigned";
    }

    if (memberStatusElement) {
        memberStatusElement.textContent =
            profile.status || "Unknown";
    }

    if (newEmailInput) {
        newEmailInput.placeholder =
            currentUser.email || "Enter your new email";
    }
}


// =============================================
// 6. PROFILE PHOTO PREVIEW
// =============================================

if (avatarInput) {
    avatarInput.addEventListener("change", () => {
        const file = avatarInput.files?.[0];

        if (!file) return;

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {
            showMessage(
                profileMessage,
                "Choose a JPG, PNG or WEBP image."
            );

            avatarInput.value = "";
            selectedPhoto = null;
            return;
        }

        if (file.size > MAX_PHOTO_SIZE) {
            showMessage(
                profileMessage,
                "Your photo must be smaller than 5 MB."
            );

            avatarInput.value = "";
            selectedPhoto = null;
            return;
        }

        selectedPhoto = file;

        if (previewObjectUrl) {
            URL.revokeObjectURL(previewObjectUrl);
        }

        previewObjectUrl = URL.createObjectURL(file);

        if (avatarPreview) {
            avatarPreview.src = previewObjectUrl;
        }

        showMessage(
            profileMessage,
            "Photo selected. Save your changes to upload it.",
            true
        );
    });
}


// =============================================
// 7. UPLOAD PROFILE PHOTO
// =============================================

async function uploadProfilePhoto() {
    if (!selectedPhoto) {
        return currentAvatarUrl;
    }

    const extension =
        selectedPhoto.type === "image/png"
            ? "png"
            : selectedPhoto.type === "image/webp"
                ? "webp"
                : "jpg";

    const filePath =
        `${currentUser.id}/avatar-${Date.now()}.${extension}`;

    const { error } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, selectedPhoto, {
            contentType: selectedPhoto.type,
            cacheControl: "3600",
            upsert: false
        });

    if (error) throw error;

    const { data } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(filePath);

    return data.publicUrl;
}


// =============================================
// 8. SAVE PROFILE
// =============================================

if (profileForm) {
    profileForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!currentUser || !currentProfile) {
            showMessage(profileMessage, "Your profile is not ready yet.");
            return;
        }

        const displayName = displayNameInput?.value.trim() || "";
        const bio = bioInput?.value.trim() || "";

        if (!displayName) {
            showMessage(profileMessage, "Please enter your display name.");
            return;
        }

        if (displayName.length > 40) {
            showMessage(
                profileMessage,
                "Your display name must be 40 characters or fewer."
            );
            return;
        }

        setButtonLoading(
            saveProfileButton,
            true,
            "Save changes",
            "Saving..."
        );

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

            if (error) throw error;

            currentAvatarUrl = avatarUrl;

            currentProfile.display_name = displayName;
            currentProfile.bio = bio;
            currentProfile.avatar_url = avatarUrl;

            selectedPhoto = null;

            if (previewObjectUrl) {
                URL.revokeObjectURL(previewObjectUrl);
                previewObjectUrl = null;
            }

            if (avatarInput) {
                avatarInput.value = "";
            }

            if (avatarPreview) {
                avatarPreview.src = avatarUrl || DEFAULT_AVATAR;
            }

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
            setButtonLoading(
                saveProfileButton,
                false,
                "Save changes",
                "Saving..."
            );
        }
    });
}


// =============================================
// 9. UPDATE EMAIL
// =============================================

if (emailForm) {
    emailForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!currentUser || !newEmailInput) return;

        const newEmail = newEmailInput.value.trim();

        if (!newEmail) {
            showMessage(emailMessage, "Enter your new email address.");
            return;
        }

        if (newEmail.toLowerCase() === currentUser.email?.toLowerCase()) {
            showMessage(emailMessage, "This is already your email address.");
            return;
        }

        setButtonLoading(
            updateEmailButton,
            true,
            "Update email",
            "Updating..."
        );

        try {
            const { error } = await supabase.auth.updateUser({
                email: newEmail
            });

            if (error) throw error;

            showMessage(
                emailMessage,
                "Email change requested. Check your inbox for confirmation.",
                true
            );

            newEmailInput.value = "";

        } catch (error) {
            console.error("Email update error:", error);
            showMessage(emailMessage, error.message || "Could not update email.");

        } finally {
            setButtonLoading(
                updateEmailButton,
                false,
                "Update email",
                "Updating..."
            );
        }
    });
}


// =============================================
// 10. CHANGE PASSWORD
// =============================================

if (passwordForm) {
    passwordForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!currentUser || !newPasswordInput || !confirmPasswordInput) {
            return;
        }

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
            showMessage(passwordMessage, "Your passwords do not match.");
            return;
        }

        setButtonLoading(
            updatePasswordButton,
            true,
            "Change password",
            "Updating..."
        );

        try {
            const { error } = await supabase.auth.updateUser({
                password
            });

            if (error) throw error;

            showMessage(
                passwordMessage,
                "Your password has been changed successfully.",
                true
            );

            passwordForm.reset();

        } catch (error) {
            console.error("Password update error:", error);
            showMessage(passwordMessage, error.message || "Could not change password.");

        } finally {
            setButtonLoading(
                updatePasswordButton,
                false,
                "Change password",
                "Updating..."
            );
        }
    });
}


// =============================================
// 11. SETTINGS SEARCH
// =============================================

function filterSettings() {
    const searchText =
        settingsSearch?.value.trim().toLowerCase() || "";

    settingsSections.forEach(section => {
        const searchableText = (
            (section.dataset.search || "") +
            " " +
            section.textContent
        ).toLowerCase();

        section.hidden =
            searchText.length > 0 &&
            !searchableText.includes(searchText);
    });

    navigationLinks.forEach(link => {
        const targetId = link.getAttribute("href")?.slice(1);
        const targetSection = document.getElementById(targetId);

        if (targetSection) {
            link.hidden = targetSection.hidden;
        }
    });

    const visibleSections = [...settingsSections].filter(
        section => !section.hidden
    );

    const sidebar = navigation?.closest(".settings-sidebar");

    if (sidebar) {
        sidebar.hidden =
            searchText.length > 0 &&
            visibleSections.length === 0;
    }

    if (clearSettingsSearch) {
        clearSettingsSearch.hidden = searchText.length === 0;
    }

    if (visibleSections.length > 0) {
        const activeLink = [...navigationLinks].find(link => {
            const id = link.getAttribute("href")?.slice(1);
            return id === visibleSections[0].id;
        });

        if (
            searchText &&
            activeLink &&
            !activeLink.classList.contains("active")
        ) {
            navigationLinks.forEach(link => link.classList.remove("active"));
            activeLink.classList.add("active");
        }
    }
}

if (settingsSearch) {
    settingsSearch.addEventListener("input", filterSettings);
}

if (clearSettingsSearch) {
    clearSettingsSearch.addEventListener("click", () => {
        settingsSearch.value = "";
        filterSettings();
        settingsSearch.focus();
    });
}


// =============================================
// 12. SIDEBAR NAVIGATION
// =============================================

navigationLinks.forEach(link => {
    link.addEventListener("click", event => {
        const targetId = link.getAttribute("href")?.slice(1);
        const targetSection = document.getElementById(targetId);

        if (!targetSection || targetSection.hidden) {
            event.preventDefault();
            return;
        }

        navigationLinks.forEach(item => {
            item.classList.remove("active");
        });

        link.classList.add("active");

        targetSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });
});


// =============================================
// 13. HIGHLIGHT CURRENT SECTION
// =============================================

if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            if (entry.target.hidden) return;

            const sectionId = entry.target.id;

            navigationLinks.forEach(link => {
                const linkId = link.getAttribute("href")?.slice(1);

                if (!link.hidden) {
                    link.classList.toggle(
                        "active",
                        linkId === sectionId
                    );
                }
            });
        });
    }, {
        rootMargin: "-15% 0px -70% 0px"
    });

    settingsSections.forEach(section => {
        if (section.id) sectionObserver.observe(section);
    });
}


// =============================================
// 14. NOTIFICATION PREFERENCES
// =============================================

function loadNotificationSettings() {
    const defaults = {
        ideas: true,
        announcements: true,
        account: true
    };

    const preferences = readLocalSettings(
        STORAGE_KEYS.notifications,
        defaults
    );

    if (ideaNotifications) {
        ideaNotifications.checked = preferences.ideas ?? true;
    }

    if (announcementNotifications) {
        announcementNotifications.checked = preferences.announcements ?? true;
    }

    if (accountNotifications) {
        accountNotifications.checked = preferences.account ?? true;
    }
}

if (saveNotificationSettings) {
    saveNotificationSettings.addEventListener("click", () => {
        const preferences = {
            ideas: ideaNotifications?.checked ?? true,
            announcements: announcementNotifications?.checked ?? true,
            account: accountNotifications?.checked ?? true
        };

        const saved = saveLocalSettings(
            STORAGE_KEYS.notifications,
            preferences
        );

        showMessage(
            notificationMessage,
            saved
                ? "Notification preferences saved on this device."
                : "Could not save your preferences.",
            saved
        );
    });
}


// =============================================
// 15. APPEARANCE AND THEME
// =============================================

function applyTheme(theme) {
    let selectedTheme = theme;

    if (theme === "system") {
        selectedTheme = window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches ? "dark" : "light";
    }

    document.documentElement.dataset.theme = selectedTheme;
    document.body.dataset.theme = selectedTheme;
}

function loadThemeSettings() {
    const savedTheme = readLocalSettings(
        STORAGE_KEYS.theme,
        "system"
    );

    const validThemes = ["dark", "light", "system"];

    const theme = validThemes.includes(savedTheme)
        ? savedTheme
        : "system";

    applyTheme(theme);

    themeInputs.forEach(input => {
        input.checked = input.value === theme;
    });
}

themeInputs.forEach(input => {
    input.addEventListener("change", () => {
        if (!input.checked) return;

        const theme = input.value;

        if (!["dark", "light", "system"].includes(theme)) {
            return;
        }

        const saved = saveLocalSettings(STORAGE_KEYS.theme, theme);

        applyTheme(theme);

        showMessage(
            themeMessage,
            saved
                ? `${theme.charAt(0).toUpperCase() + theme.slice(1)} theme selected.`
                : "Theme selected, but could not save the preference.",
            saved
        );
    });
});

const systemThemeQuery = window.matchMedia(
    "(prefers-color-scheme: dark)"
);

systemThemeQuery.addEventListener?.("change", () => {
    const savedTheme = readLocalSettings(STORAGE_KEYS.theme, "system");

    if (savedTheme === "system") {
        applyTheme("system");
    }
});


// =============================================
// 16. PRIVACY PREFERENCES
// =============================================

function loadPrivacySettings() {
    const defaults = {
        visibility: "members",
        showBio: true
    };

    const preferences = readLocalSettings(
        STORAGE_KEYS.privacy,
        defaults
    );

    if (profileVisibility) {
        profileVisibility.value = preferences.visibility || "members";
    }

    if (showBio) {
        showBio.checked = preferences.showBio ?? true;
    }
}

if (savePrivacySettings) {
    savePrivacySettings.addEventListener("click", () => {
        const preferences = {
            visibility: profileVisibility?.value || "members",
            showBio: showBio?.checked ?? true
        };

        const saved = saveLocalSettings(
            STORAGE_KEYS.privacy,
            preferences
        );

        showMessage(
            privacyMessage,
            saved
                ? "Privacy preferences saved on this device. These settings do not yet control who can view your profile."
                : "Could not save your privacy preferences.",
            saved
        );
    });
}


// =============================================
// 17. LOAD MY ACTIVITY
// =============================================

async function loadActivity() {
    if (!currentUser) return;

    if (activityList) {
        activityList.textContent = "Loading your activity...";
    }

    try {
        const [ideasResult, notificationsResult] = await Promise.all([
            supabase
                .from("ideas")
                .select("id, title, created_at")
                .eq("member_id", currentUser.id)
                .order("created_at", { ascending: false }),

            supabase
                .from("notifications")
                .select("id, title, message, type, created_at")
                .eq("user_id", currentUser.id)
                .order("created_at", { ascending: false })
        ]);

        if (ideasResult.error) throw ideasResult.error;
        if (notificationsResult.error) throw notificationsResult.error;

        const ideas = ideasResult.data || [];
        const notifications = notificationsResult.data || [];

        if (myIdeasCount) {
            myIdeasCount.textContent = ideas.length;
        }

        if (myNotificationsCount) {
            myNotificationsCount.textContent = notifications.length;
        }

        if (!activityList) return;

        activityList.replaceChildren();

        const activities = [
            ...ideas.map(item => ({
                title: item.title || "Your idea",
                description: "You created an idea",
                date: item.created_at,
                kind: "Idea"
            })),

            ...notifications.map(item => ({
                title: item.title || "Notification",
                description: item.message || "You received a notification",
                date: item.created_at,
                kind: "Notification"
            }))
        ].sort((a, b) => {
            return new Date(b.date || 0) - new Date(a.date || 0);
        }).slice(0, 15);

        if (activities.length === 0) {
            activityList.textContent = "You don't have any activity yet.";
            return;
        }

        activities.forEach(activity => {
            const item = document.createElement("div");
            item.className = "activity-item";

            const heading = document.createElement("strong");
            heading.textContent = activity.title;

            const description = document.createElement("p");
            description.textContent = activity.description;

            const metadata = document.createElement("small");
            metadata.textContent =
                `${activity.kind} · ${formatDate(activity.date)}`;

            item.append(heading, description, metadata);
            activityList.appendChild(item);
        });

        showMessage(activityMessage, "Your activity is up to date.", true);

    } catch (error) {
        console.error("Activity loading error:", error);

        if (activityList) {
            activityList.textContent =
                "Activity could not be loaded. Please check your database permissions and table columns.";
        }

        showMessage(
            activityMessage,
            "Could not load activity."
        );
    }
}


// =============================================
// 18. EXPORT MY DATA
// =============================================

if (exportDataButton) {
    exportDataButton.addEventListener("click", async () => {
        if (!currentUser) return;

        setButtonLoading(
            exportDataButton,
            true,
            "Export my data",
            "Preparing..."
        );

        try {
            const [profileResult, ideasResult, notificationsResult] =
                await Promise.all([
                    supabase
                        .from("profiles")
                        .select("display_name, member_code, status, bio, avatar_url, created_at")
                        .eq("id", currentUser.id)
                        .single(),

                    supabase
                        .from("ideas")
                        .select("*")
                        .eq("member_id", currentUser.id),

                    supabase
                        .from("notifications")
                        .select("*")
                        .eq("user_id", currentUser.id)
                ]);

            if (profileResult.error) throw profileResult.error;
            if (ideasResult.error) throw ideasResult.error;
            if (notificationsResult.error) throw notificationsResult.error;

            const exportData = {
                exported_at: new Date().toISOString(),
                account: {
                    email: currentUser.email
                },
                profile: profileResult.data,
                ideas: ideasResult.data || [],
                notifications: notificationsResult.data || []
            };

            const file = new Blob(
                [JSON.stringify(exportData, null, 2)],
                { type: "application/json" }
            );

            const url = URL.createObjectURL(file);
            const link = document.createElement("a");

            link.href = url;
            link.download = "coreI-my-data.json";

            document.body.appendChild(link);
            link.click();
            link.remove();

            URL.revokeObjectURL(url);

            showMessage(
                exportMessage,
                "Your data export has been downloaded.",
                true
            );

        } catch (error) {
            console.error("Data export error:", error);

            showMessage(
                exportMessage,
                error.message || "Could not export your data."
            );

        } finally {
            setButtonLoading(
                exportDataButton,
                false,
                "Export my data",
                "Preparing..."
            );
        }
    });
}


// =============================================
// 19. ACCOUNT DELETION INFORMATION
// =============================================

if (accountDeletionInfoButton && accountDeletionInfo) {
    accountDeletionInfoButton.addEventListener("click", () => {
        const isHidden = accountDeletionInfo.hidden;

        accountDeletionInfo.hidden = !isHidden;

        accountDeletionInfoButton.textContent = isHidden
            ? "Hide information"
            : "Learn about account deletion";
    });
}


// =============================================
// 20. HELP AND SUPPORT
// =============================================

if (supportForm) {
    supportForm.addEventListener("submit", event => {
        event.preventDefault();

        showMessage(
            supportFormMessage,
            "Support submission is not connected yet. We need a secure support table or server-side service before messages can be sent.",
            false
        );
    });
}


// =============================================
// 21. SEARCH KEYBOARD SHORTCUT
// =============================================

document.addEventListener("keydown", event => {
    const isSearchShortcut =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k";

    if (isSearchShortcut && settingsSearch) {
        event.preventDefault();
        settingsSearch.focus();
    }

    if (event.key === "Escape" && settingsSearch) {
        settingsSearch.value = "";
        filterSettings();
        settingsSearch.blur();
    }
});


// =============================================
// 22. SIGN OUT
// =============================================

if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
        setButtonLoading(
            logoutButton,
            true,
            "Sign out",
            "Signing out..."
        );

        try {
            const { error } = await supabase.auth.signOut();

            if (error) throw error;

            window.location.href = "./login.html";

        } catch (error) {
            console.error("Logout error:", error);

            showMessage(
                logoutMessage,
                error.message || "Could not sign out."
            );

            setButtonLoading(
                logoutButton,
                false,
                "Sign out",
                "Signing out..."
            );
        }
    });
}


// =============================================
// 23. START SETTINGS PAGE
// =============================================

loadSettings();
