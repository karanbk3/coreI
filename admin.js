
import { supabase } from "./supabase.js";

// =====================================
// 1. GET PAGE ELEMENTS
// =====================================

// Membership elements

const pendingCount = document.getElementById("pendingCount");
const approvedCount = document.getElementById("approvedCount");
const rejectedCount = document.getElementById("rejectedCount");

const membersList = document.getElementById("membersList");
const dashboardMessage = document.getElementById("dashboardMessage");

const refreshButton = document.getElementById("refreshButton");
const logoutButton = document.getElementById("logoutButton");

const filterButtons = document.querySelectorAll(".filter-button");

// Announcement elements

const announcementForm = document.getElementById("announcementForm");

const announcementTitle = document.getElementById("announcementTitle");
const announcementDescription = document.getElementById("announcementDescription");
const announcementQuestion = document.getElementById("announcementQuestion");

const announcementMessage = document.getElementById("announcementMessage");
const publishAnnouncementButton = document.getElementById("publishAnnouncementButton");


// =====================================
// 2. DASHBOARD VARIABLES
// =====================================

let allMembers = [];
let currentFilter = "pending";
let currentAdminId = null;
let dashboardStarted = false;


// =====================================
// 3. SHOW MESSAGES
// =====================================

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


// =====================================
// 4. CHECK ADMINISTRATOR ACCESS
// =====================================

async function checkAdminAccess() {

    try {

        // Check logged-in account

        const {
            data: userData,
            error: userError
        } = await supabase.auth.getUser();

        if (userError || !userData.user) {

            window.location.replace("./login.html");

            return false;
        }

        currentAdminId = userData.user.id;


        // Get account role from database

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

            showMessage("Your account could not be verified.");

            window.location.replace("./login.html");

            return false;
        }


        // Only approved administrator accounts can continue

        if (
            profile.role !== "admin" ||
            profile.status !== "approved"
        ) {

            showMessage("Access denied. Administrator permission required.");

            window.location.replace("./main.html");

            return false;
        }


        // Verify administrator permission using Supabase function

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


// =====================================
// 5. PUBLISH FEATURE ANNOUNCEMENT
// =====================================

async function publishAnnouncement(event) {

    event.preventDefault();

    if (!currentAdminId) return;

    const title = announcementTitle.value.trim();

    const description = announcementDescription.value.trim();

    const question = announcementQuestion.value.trim();


    // Validate form

    if (!title || !description || !question) {

        showAnnouncementMessage(
            "Please complete all three fields.",
            "error"
        );

        return;
    }


    // Prevent repeated clicks

    publishAnnouncementButton.disabled = true;

    publishAnnouncementButton.textContent = "Publishing...";

    showAnnouncementMessage("Publishing your announcement...");


    try {

        // Save announcement

        const { error } = await supabase
            .from("announcements")
            .insert({
                title: title,
                description: description,
                question: question,
                created_by: currentAdminId,
                is_published: true
            });


        if (error) {

            console.error("Announcement error:", error);

            showAnnouncementMessage(
                "Could not publish. Please check database permissions.",
                "error"
            );

            return;
        }


        // Successful publishing

        announcementForm.reset();

        showAnnouncementMessage(
            "Your announcement has been published successfully!",
            "success"
        );

    } catch (error) {

        console.error(error);

        showAnnouncementMessage(
            "Something went wrong. Please try again.",
            "error"
        );

    } finally {

        publishAnnouncementButton.disabled = false;

        publishAnnouncementButton.textContent = "Publish announcement";

    }

}


// =====================================
// 6. LOAD MEMBERS
// =====================================

async function loadMembers() {

    if (!currentAdminId) return;

    showMessage("Loading membership requests...");

    membersList.replaceChildren();


    try {

        const { data, error } = await supabase
            .from("profiles")
            .select("id, display_name, status, role, created_at")
            .order("created_at", { ascending: false });


        if (error) {

            console.error("Member loading error:", error);

            showMessage("Could not load members. Please refresh.");

            return;
        }


        // Do not display administrator accounts as member requests

        allMembers = (data || []).filter(
            member => member.role !== "admin"
        );


        updateStatistics();

        displayMembers();

    } catch (error) {

        console.error(error);

        showMessage("Something went wrong while loading members.");

    }

}


// =====================================
// 7. UPDATE MEMBERSHIP STATISTICS
// =====================================

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


    pendingCount.textContent = pending;

    approvedCount.textContent = approved;

    rejectedCount.textContent = rejected;

}


// =====================================
// 8. DISPLAY MEMBERS
// =====================================

function displayMembers() {

    membersList.replaceChildren();

    let filteredMembers = allMembers;


    // Apply selected filter

    if (currentFilter !== "all") {

        filteredMembers = allMembers.filter(
            member => member.status === currentFilter
        );

    }


    // Empty list message

    if (filteredMembers.length === 0) {

        showMessage("No members found in this section.");

        return;
    }

    showMessage("");


    // Create member cards

    filteredMembers.forEach(member => {

        const card = document.createElement("article");

        card.className = "member-card";


        // Member information

        const top = document.createElement("div");

        top.className = "member-top";


        // Member avatar

        const avatar = document.createElement("div");

        avatar.className = "member-avatar";

        avatar.textContent =
            (member.display_name || "M").charAt(0).toUpperCase();


        // Member name and joining date

        const info = document.createElement("div");

        info.className = "member-info";


        const name = document.createElement("h3");

        name.textContent = member.display_name || "New member";


        const date = document.createElement("p");

        date.textContent = "Joined: " +
            new Date(member.created_at).toLocaleDateString();


        info.append(name, date);

        top.append(avatar, info);


        // Membership status

        const status = document.createElement("span");

        status.className = "member-status " + member.status;

        status.textContent = member.status;

        card.append(top, status);


        // Action buttons for pending requests

        if (member.status === "pending") {

            const actions = document.createElement("div");

            actions.className = "member-actions";


            // Approve button

            const approveButton = document.createElement("button");

            approveButton.className = "approve-button";

            approveButton.textContent = "✓ Approve";

            approveButton.addEventListener("click", () => {

                updateMemberStatus(member.id, "approved");

            });


            // Reject button

            const rejectButton = document.createElement("button");

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


// =====================================
// 9. APPROVE OR REJECT MEMBERS
// =====================================

async function updateMemberStatus(memberId, newStatus) {

    if (!currentAdminId) return;

    if (!["approved", "rejected"].includes(newStatus)) return;


    const action = newStatus === "approved"
        ? "approve"
        : "reject";


    const confirmed = window.confirm(
        `Are you sure you want to ${action} this membership request?`
    );

    if (!confirmed) return;


    showMessage("Updating membership...");


    try {

        const { data, error } = await supabase
            .from("profiles")
            .update({ status: newStatus })
            .eq("id", memberId)
            .eq("status", "pending")
            .neq("role", "admin")
            .select("id")
            .maybeSingle();


        if (error) {

            console.error("Membership update error:", error);

            showMessage(
                "Could not update membership. Check administrator permissions."
            );

            return;
        }


        if (!data) {

            showMessage("This request has already changed. Refreshing...");

            await loadMembers();

            return;
        }


        showMessage(
            newStatus === "approved"
                ? "Member approved successfully!"
                : "Membership request rejected."
        );


        await loadMembers();

    } catch (error) {

        console.error(error);

        showMessage("Something went wrong. Please try again.");

    }

}


// =====================================
// 10. FILTER BUTTONS
// =====================================

filterButtons.forEach(button => {

    button.addEventListener("click", () => {

        currentFilter = button.dataset.filter;

        filterButtons.forEach(item => {

            item.classList.remove("active");

        });

        button.classList.add("active");

        displayMembers();

    });

});


// =====================================
// 11. REFRESH DASHBOARD
// =====================================

refreshButton?.addEventListener("click", () => {

    if (dashboardStarted) {
        loadMembers();
    }

});


// =====================================
// 12. ANNOUNCEMENT FORM
// =====================================

announcementForm?.addEventListener(
    "submit",
    publishAnnouncement
);


// =====================================
// 13. SIGN OUT
// =====================================

logoutButton?.addEventListener("click", async () => {

    const confirmed = window.confirm(
        "Are you sure you want to sign out?"
    );

    if (!confirmed) return;


    const { error } = await supabase.auth.signOut();


    if (error) {

        showMessage("Could not sign out. Please try again.");

        return;
    }


    window.location.replace("./login.html");

});


// =====================================
// 14. START ADMIN DASHBOARD
// =====================================

async function startDashboard() {

    const isAdmin = await checkAdminAccess();

    if (!isAdmin) return;


    dashboardStarted = true;

    showMessage("Administrator verified. Loading dashboard...");

    await loadMembers();

}


startDashboard();
