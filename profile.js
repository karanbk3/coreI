
import { supabase } from "./supabase.js";

// =========================================
// 1. PAGE ELEMENTS
// =========================================

// Profile elements

const profilePhoto = document.getElementById("profilePhoto");
const profileName = document.getElementById("profileName");
const profileMemberCode = document.getElementById("profileMemberCode");
const profileBio = document.getElementById("profileBio");

// Personal information

const infoDisplayName = document.getElementById("infoDisplayName");
const infoMemberCode = document.getElementById("infoMemberCode");
const infoStatus = document.getElementById("infoStatus");
const infoJoinedDate = document.getElementById("infoJoinedDate");

// Member ideas

const myIdeasList = document.getElementById("myIdeasList");

// Admin dashboard

const adminDashboardButton =
    document.getElementById("adminDashboardButton");


// =========================================
// 2. DEFAULT SETTINGS
// =========================================

const DEFAULT_AVATAR = "./images/default-profile.png";

let currentUser = null;
let currentProfile = null;


// =========================================
// 3. SHOW PROFILE MESSAGE
// =========================================

function showProfileError(message) {

    if (profileName) {
        profileName.textContent = "Profile unavailable";
    }

    if (profileBio) {
        profileBio.textContent = message;
    }

    if (myIdeasList) {
        myIdeasList.textContent = message;
    }

    if (adminDashboardButton) {
        adminDashboardButton.hidden = true;
    }
}


// =========================================
// 4. CHECK MEMBER LOGIN
// =========================================

async function checkLogin() {

    const {
        data: authData,
        error: authError
    } = await supabase.auth.getUser();


    if (authError || !authData.user) {

        window.location.href = "./login.html";

        return false;
    }


    currentUser = authData.user;

    return true;
}


// =========================================
// 5. LOAD MEMBER PROFILE
// =========================================

async function loadProfile() {

    try {

        // First check login.

        const isLoggedIn = await checkLogin();

        if (!isLoggedIn) return;


        // Load profile from Supabase.

        const {
            data: profile,
            error: profileError
        } = await supabase
            .from("profiles")
            .select(`
                display_name,
                member_code,
                status,
                role,
                created_at,
                bio,
                avatar_url
            `)
            .eq("id", currentUser.id)
            .single();


        if (profileError || !profile) {

            console.error(
                "Profile loading error:",
                profileError
            );

            showProfileError(
                "We could not load your profile information."
            );

            return;
        }


        currentProfile = profile;


        // Display profile information.

        displayProfile(profile);


        // Display administrator button when permitted.

        displayAdminButton(profile);


        // Load member's ideas.

        await loadMyIdeas(currentUser.id);

    } catch (error) {

        console.error("Profile error:", error);

        showProfileError(
            "Something went wrong while loading your profile."
        );

    }

}


// =========================================
// 6. DISPLAY PROFILE INFORMATION
// =========================================

function displayProfile(profile) {

    // Member name.

    if (profileName) {

        profileName.textContent =
            profile.display_name || "coreI Member";

    }


    // Member ID.

    if (profileMemberCode) {

        profileMemberCode.textContent =
            profile.member_code || "Member ID unavailable";

    }


    // Profile picture.

    if (profilePhoto) {

        profilePhoto.src =
            profile.avatar_url || DEFAULT_AVATAR;

        profilePhoto.alt =
            `${profile.display_name || "Member"}'s profile picture`;


        // Use default picture if saved image fails.

        profilePhoto.onerror = () => {

            profilePhoto.onerror = null;

            profilePhoto.src = DEFAULT_AVATAR;

        };

    }


    // Member bio.

    if (profileBio) {

        profileBio.textContent =
            profile.bio ||
            "A member of the coreI creative community.";

    }


    // =====================================
    // PERSONAL INFORMATION
    // =====================================

    if (infoDisplayName) {

        infoDisplayName.textContent =
            profile.display_name || "Not provided";

    }


    if (infoMemberCode) {

        infoMemberCode.textContent =
            profile.member_code || "Not available";

    }


    if (infoStatus) {

        infoStatus.textContent =
            profile.status || "Unknown";

    }


    if (infoJoinedDate) {

        infoJoinedDate.textContent =
            profile.created_at
                ? new Date(profile.created_at).toLocaleDateString()
                : "Not available";

    }

}


// =========================================
// 7. ADMIN DASHBOARD BUTTON
// =========================================

function displayAdminButton(profile) {

    if (!adminDashboardButton) return;


    // Only approved administrators see this button.

    const isApprovedAdmin =
        profile.role === "admin" &&
        profile.status === "approved";


    adminDashboardButton.hidden = !isApprovedAdmin;

}


// =========================================
// 8. ADMIN DASHBOARD NAVIGATION
// =========================================

if (adminDashboardButton) {

    adminDashboardButton.addEventListener("click", () => {

        if (
            currentProfile?.role !== "admin" ||
            currentProfile?.status !== "approved"
        ) {

            adminDashboardButton.hidden = true;

            return;
        }


        window.location.href = "./admin.html";

    });

}


// =========================================
// 9. LOAD MY SHARED IDEAS
// =========================================

async function loadMyIdeas(memberId) {

    if (!myIdeasList) return;


    myIdeasList.textContent = "Loading your ideas...";


    const {
        data: ideas,
        error
    } = await supabase
        .from("ideas")
        .select(`
            id,
            title,
            content,
            created_at
        `)
        .eq("member_id", memberId)
        .order("created_at", { ascending: false });


    if (error) {

        console.error(
            "My ideas loading error:",
            error
        );

        myIdeasList.textContent =
            "We could not load your ideas. Please try again.";

        return;
    }


    myIdeasList.replaceChildren();


    // =====================================
    // NO IDEAS AVAILABLE
    // =====================================

    if (!ideas || ideas.length === 0) {

        const emptyCard = document.createElement("div");

        emptyCard.className = "empty-card";


        const icon = document.createElement("div");

        icon.className = "empty-icon";

        icon.textContent = "✧";


        const heading = document.createElement("h3");

        heading.textContent = "No ideas shared yet";


        const description = document.createElement("p");

        description.textContent =
            "Your published ideas will appear here.";


        emptyCard.append(
            icon,
            heading,
            description
        );


        myIdeasList.appendChild(emptyCard);

        return;
    }


    // =====================================
    // DISPLAY MEMBER IDEAS
    // =====================================

    ideas.forEach(idea => {

        const card = document.createElement("article");

        card.className = "idea-card";


        // Publication date.

        const date = document.createElement("small");

        date.className = "idea-date";

        date.textContent = idea.created_at
            ? new Date(idea.created_at).toLocaleDateString()
            : "";


        // Idea title.

        const title = document.createElement("h3");

        title.textContent =
            idea.title || "Untitled idea";


        // Idea description.

        const content = document.createElement("p");

        content.className = "idea-content";

        content.textContent = idea.content || "";


        // Add idea content.

        card.append(
            date,
            title,
            content
        );


        myIdeasList.appendChild(card);

    });

}


// =========================================
// 10. START PROFILE PAGE
// =========================================

async function startProfilePage() {

    // Hide admin button until account is checked.

    if (adminDashboardButton) {
        adminDashboardButton.hidden = true;
    }


    // Load profile and member ideas.

    await loadProfile();

}


// Start profile page.

startProfilePage();
