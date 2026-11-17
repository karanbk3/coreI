
import { supabase } from "./supabase.js";

// =============================================
// 1. GET PAGE ELEMENTS
// =============================================

// Dashboard statistics
const totalMembersCount = document.getElementById("totalMembersCount");
const totalIdeasCount = document.getElementById("totalIdeasCount");
const publishedAnnouncementsCount = document.getElementById("publishedAnnouncementsCount");

// Membership statistics
const pendingCount = document.getElementById("pendingCount");
const approvedCount = document.getElementById("approvedCount");
const rejectedCount = document.getElementById("rejectedCount");

// Member management
const membersList = document.getElementById("membersList");
const dashboardMessage = document.getElementById("dashboardMessage");
const refreshButton = document.getElementById("refreshButton");
const logoutButton = document.getElementById("logoutButton");
const filterButtons = document.querySelectorAll(".filter-button");

// Announcement form
const announcementForm = document.getElementById("announcementForm");
const announcementTitle = document.getElementById("announcementTitle");
const announcementDescription = document.getElementById("announcementDescription");
const announcementMessage = document.getElementById("announcementMessage");
const publishAnnouncementButton = document.getElementById("publishAnnouncementButton");


// =============================================
// 2. DASHBOARD VARIABLES
// =============================================

let allMembers = [];
let currentFilter = "pending";
let currentAdminId = null;
let dashboardStarted = false;


// =============================================
// 3. SHOW MESSAGES
// =============================================

function showMessage(message) {
    if (dashboardMessage) {
        dashboardMessage.textContent = message;
    }
}

function showAnnouncementMessage(message, type = "") {
    if (!announcementMessage) return;

    announcementMessage.textContent = message;
    announcementMessage.className = "announcement-message";

    if (type) {
        announcementMessage.classList.add(type);
    }
}


// =============================================
// 4. CHECK ADMINISTRATOR ACCESS
// =============================================

async function checkAdminAccess() {
    try {
        // Check whether someone is logged in.
        const {
            data: userData,
            error: userError
        } = await supabase.auth.getUser();

        if (userError || !userData.user) {
            window.location.replace("./login.html");
            return false;
        }

        currentAdminId = userData.user.id;

        // Get the user's profile.
        const {
            data: profile,
            error: profileError
        } = await supabase
            .from("profiles")
            .select("role, status")
            .eq("id", currentAdminId)
            .single();

        if (profileError || !profile) {
            console.error("Profile verification error:", profileError);
            window.location.replace("./login.html");
            return false;
        }

        // Only an approved administrator can continue.
        if (
            profile.role !== "admin" ||
            profile.status !== "approved"
        ) {
            showMessage("Access denied. Administrator permission required.");
            window.location.replace("./main.html");
            return false;
        }

        // Verify administrator access through Supabase.
        const {
            data: adminCheck,
            error: adminError
        } = await supabase.rpc("is_corei_admin");

        if (adminError || adminCheck !== true) {
            console.error("Admin verification error:", adminError);
            showMessage("Administrator permission could not be verified.");
            window.location.replace("./main.html");
            return false;
        }

        console.log("coreI administrator access verified.");

        return true;

    } catch (error) {
        console.error("Admin access error:", error);
        window.location.replace("./login.html");
        return false;
    }
}


// =============================================
// 5. LOAD DASHBOARD STATISTICS
// =============================================

async function loadDashboardStats() {
    // Count normal members, excluding the administrator.
    if (totalMembersCount) {
        totalMembersCount.textContent = allMembers.length;
    }

    // Show loading indicators.
    if (totalIdeasCount) {
        totalIdeasCount.textContent = "…";
    }

    if (publishedAnnouncementsCount) {
        publishedAnnouncementsCount.textContent = "…";
    }

    try {
        // Request both counts at the same time.
        const [
            ideasResult,
            announcementsResult
        ] = await Promise.all([
            supabase
                .from("ideas")
                .select("id", {
                    count: "exact",
                    head: true
                }),

            supabase
                .from("announcements")
                .select("id", {
                    count: "exact",
                    head: true
                })
                .eq("is_published", true)
        ]);

        // Display total ideas.
        if (ideasResult.error) {
            console.error("Ideas count error:", ideasResult.error);

            if (totalIdeasCount) {
                totalIdeasCount.textContent = "—";
            }

        } else if (totalIdeasCount) {
            totalIdeasCount.textContent = ideasResult.count ?? 0;
        }

        // Display published announcements.
        if (announcementsResult.error) {
            console.error(
                "Announcements count error:",
                announcementsResult.error
            );

            if (publishedAnnouncementsCount) {
                publishedAnnouncementsCount.textContent = "—";
            }

        } else if (publishedAnnouncementsCount) {
            publishedAnnouncementsCount.textContent =
                announcementsResult.count ?? 0;
        }

    } catch (error) {
        console.error("Dashboard statistics error:", error);

        if (totalIdeasCount) {
            totalIdeasCount.textContent = "—";
        }

        if (publishedAnnouncementsCount) {
            publishedAnnouncementsCount.textContent = "—";
        }
    }
}


// =============================================
// 6. PUBLISH FEATURE ANNOUNCEMENT
// =============================================

async function publishAnnouncement(event) {
    event.preventDefault();

    if (!currentAdminId) return;

    if (
        !announcementForm ||
        !announcementTitle ||
        !announcementDescription ||
        !publishAnnouncementButton
    ) {
        showAnnouncementMessage(
            "Announcement form could not be found.",
            "error"
        );

        return;
    }

    // Read the form information.
    const title = announcementTitle.value.trim();
    const description = announcementDescription.value.trim();

    // Check the information.
    if (!title || !description) {
        showAnnouncementMessage(
            "Please enter the feature title and description.",
            "error"
        );

        return;
    }

    // Disable the button while publishing.
    publishAnnouncementButton.disabled = true;
    publishAnnouncementButton.textContent = "Publishing...";

    showAnnouncementMessage("Publishing your announcement...");

    try {
        const { error } = await supabase
            .from("announcements")
            .insert({
                title: title,
                description: description,

                // Your database requires this column.
                // The form does not ask the admin for a question.
                question: "",

                created_by: currentAdminId,
                is_published: true
            });

        if (error) {
            console.error("Announcement error:", error);

            showAnnouncementMessage(
                "Could not publish: " + error.message,
                "error"
            );

            return;
        }

        // Clear the form after successful publishing.
        announcementForm.reset();

        showAnnouncementMessage(
            "Announcement published successfully!",
            "success"
        );

        // Update the announcement count.
        await loadDashboardStats();

    } catch (error) {
        console.error("Announcement error:", error);

        showAnnouncementMessage(
            "Something went wrong: " + error.message,
            "error"
        );

    } finally {
        publishAnnouncementButton.disabled = false;
        publishAnnouncementButton.textContent = "Publish announcement";
    }
}


// =============================================
// 7. LOAD MEMBERS
// =============================================

async function loadMembers() {
    if (!currentAdminId || !membersList) return;

    showMessage("Loading membership requests...");

    membersList.replaceChildren();

    try {
        const { data, error } = await supabase
            .from("profiles")
            .select("id, display_name, status, role, created_at")
            .order("created_at", {
                ascending: false
            });

        if (error) {
            console.error("Member loading error:", error);

            showMessage(
                "Could not load members: " + error.message
            );

            return;
        }

        // Keep normal member accounts only.
        allMembers = (data || []).filter(
            member => member.role !== "admin"
        );

        // Update the statistics.
        updateStatistics();

        // Update the main dashboard cards.
        await loadDashboardStats();

        // Display the selected member list.
        displayMembers();

    } catch (error) {
        console.error("Member loading error:", error);

        showMessage(
            "Something went wrong while loading members."
        );
    }
}


// =============================================
// 8. UPDATE MEMBERSHIP STATISTICS
// =============================================

function updateStatistics() {
    const pending = allMembers.filter(
        member => member.status === "pending"
    ).length;

    const approved = allMembers.filter(
        member => member.status === "approved"
    ).length;

    const rejected = allMembers.filter(
        member => member.status === "rejected"
    ).length;

    if (pendingCount) {
        pendingCount.textContent = pending;
    }

    if (approvedCount) {
        approvedCount.textContent = approved;
    }

    if (rejectedCount) {
        rejectedCount.textContent = rejected;
    }

    if (totalMembersCount) {
        totalMembersCount.textContent = allMembers.length;
    }
}


// =============================================
// 9. DISPLAY MEMBERS
// =============================================

function displayMembers() {
    if (!membersList) return;

    membersList.replaceChildren();

    let filteredMembers = allMembers;

    // Apply the selected filter.
    if (currentFilter !== "all") {
        filteredMembers = allMembers.filter(
            member => member.status === currentFilter
        );
    }

    // Show a message if there are no members.
    if (filteredMembers.length === 0) {
        showMessage("No members found in this section.");
        return;
    }

    showMessage("");

    // Create a card for every member.
    filteredMembers.forEach(member => {
        const card = document.createElement("article");
        card.className = "member-card";

        // Member information section.
        const top = document.createElement("div");
        top.className = "member-top";

        // Member avatar.
        const avatar = document.createElement("div");
        avatar.className = "member-avatar";

        avatar.textContent =
            (member.display_name || "M")
                .charAt(0)
                .toUpperCase();

        // Member name and joining date.
        const info = document.createElement("div");
        info.className = "member-info";

        const name = document.createElement("h3");
        name.textContent = member.display_name || "New member";

        const date = document.createElement("p");

        date.textContent = "Joined: " + (
            member.created_at
                ? new Date(member.created_at).toLocaleDateString()
                : "Date unavailable"
        );

        info.append(name, date);
        top.append(avatar, info);

        // Member status.
        const status = document.createElement("span");

        status.className = "member-status " + member.status;
        status.textContent = member.status;

        card.append(top, status);

        // Only pending members receive action buttons.
        if (member.status === "pending") {
            const actions = document.createElement("div");
            actions.className = "member-actions";

            // Approve button.
            const approveButton = document.createElement("button");

            approveButton.type = "button";
            approveButton.className = "approve-button";
            approveButton.textContent = "✓ Approve";

            approveButton.addEventListener("click", () => {
                updateMemberStatus(member.id, "approved");
            });

            // Reject button.
            const rejectButton = document.createElement("button");

            rejectButton.type = "button";
            rejectButton.className = "reject-button";
            rejectButton.textContent = "✕ Reject";

            rejectButton.addEventListener("click", () => {
                updateMemberStatus(member.id, "rejected");
            });

            actions.append(approveButton, rejectButton);
            card.append(actions);
        }

        membersList.append(card);
    });
}


// =============================================
// 10. APPROVE OR REJECT MEMBERS
// =============================================

async function updateMemberStatus(memberId, newStatus) {
    if (!currentAdminId) return;

    if (!["approved", "rejected"].includes(newStatus)) {
        return;
    }

    const action = newStatus === "approved"
        ? "approve"
        : "reject";

    const confirmed = window.confirm(
        `Are you sure you want to ${action} this membership request?`
    );

    if (!confirmed) return;

    showMessage("Updating membership...");

    try {
        // Use the existing protected Supabase function.
        const { data, error } = await supabase.rpc(
            "admin_update_member_status",
            {
                p_member_id: memberId,
                p_new_status: newStatus
            }
        );

        if (error) {
            console.error("Membership update error:", error);

            showMessage(
                "Could not update membership: " + error.message
            );

            return;
        }

        if (data !== true) {
            showMessage(
                "No membership was updated. The request may have already changed."
            );

            await loadMembers();
            return;
        }

        showMessage(
            newStatus === "approved"
                ? "Member approved successfully!"
                : "Membership request rejected successfully!"
        );

        // Reload the updated information.
        await loadMembers();

    } catch (error) {
        console.error("Unexpected membership error:", error);

        showMessage(
            "Something went wrong: " + error.message
        );
    }
}


// =============================================
// 11. FILTER BUTTONS
// =============================================

filterButtons.forEach(button => {
    button.addEventListener("click", () => {
        const selectedFilter = button.dataset.filter;

        if (
            !["pending", "approved", "rejected", "all"]
                .includes(selectedFilter)
        ) {
            return;
        }

        currentFilter = selectedFilter;

        // Update the active filter button.
        filterButtons.forEach(item => {
            item.classList.remove("active");
        });

        button.classList.add("active");

        // Show the selected members.
        displayMembers();
    });
});


// =============================================
// 12. REFRESH DASHBOARD
// =============================================

refreshButton?.addEventListener("click", async () => {
    if (!dashboardStarted) return;

    refreshButton.disabled = true;
    refreshButton.textContent = "Refreshing...";

    try {
        await loadMembers();

    } finally {
        refreshButton.disabled = false;
        refreshButton.textContent = "↻ Refresh";
    }
});


// =============================================
// 13. ANNOUNCEMENT FORM
// =============================================

announcementForm?.addEventListener(
    "submit",
    publishAnnouncement
);


// =============================================
// 14. SIGN OUT
// =============================================

logoutButton?.addEventListener("click", async () => {
    const confirmed = window.confirm(
        "Are you sure you want to sign out?"
    );

    if (!confirmed) return;

    logoutButton.disabled = true;
    logoutButton.textContent = "Signing out...";

    try {
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error("Logout error:", error);

            showMessage(
                "Could not sign out. Please try again."
            );

            logoutButton.disabled = false;
            logoutButton.textContent = "Sign out";

            return;
        }

        window.location.replace("./login.html");

    } catch (error) {
        console.error("Logout error:", error);

        showMessage(
            "Something went wrong while signing out."
        );

        logoutButton.disabled = false;
        logoutButton.textContent = "Sign out";
    }
});


// =============================================
// 15. START ADMIN DASHBOARD
// =============================================

async function startDashboard() {
    const isAdmin = await checkAdminAccess();

    if (!isAdmin) return;

    dashboardStarted = true;

    showMessage(
        "Administrator verified. Loading dashboard..."
    );

    await loadMembers();
}

startDashboard();
