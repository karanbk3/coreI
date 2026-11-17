
import { supabase } from "./supabase.js";

// =========================================
// 1. PAGE ELEMENTS
// =========================================

// Navigation

const navigationButtons = document.querySelectorAll(".nav-button");
const pageSections = document.querySelectorAll(".page-section");

const exploreIdeasButton =
    document.getElementById("exploreIdeasButton");

// Idea elements

const ideaForm = document.getElementById("ideaForm");
const ideaTitle = document.getElementById("ideaTitle");
const ideaContent = document.getElementById("ideaContent");

const publishIdeaButton =
    document.getElementById("publishIdeaButton");

const ideaFormMessage =
    document.getElementById("ideaFormMessage");

const ideasList = document.getElementById("ideasList");

const featuredIdeasList =
    document.getElementById("featuredIdeasList");

// Announcement elements

const announcementsList =
    document.getElementById("announcementsList");


// =========================================
// 2. MEMBER INFORMATION
// =========================================

let currentUser = null;
let currentProfile = null;

const DEFAULT_AVATAR = "./images/default-profile.png";


// =========================================
// 3. MESSAGE DISPLAY
// =========================================

function showMessage(message, type = "") {

    if (!ideaFormMessage) return;

    ideaFormMessage.textContent = message;

    ideaFormMessage.className = "form-message";

    if (type) {
        ideaFormMessage.classList.add(type);
    }
}


// =========================================
// 4. PAGE NAVIGATION
// =========================================

function openSection(sectionId) {

    if (!sectionId) return;

    const selectedSection =
        document.getElementById(sectionId);

    if (!selectedSection) return;

    pageSections.forEach(section => {

        section.classList.remove("active");
        section.hidden = true;

    });

    navigationButtons.forEach(button => {

        button.classList.remove("active");

    });

    selectedSection.hidden = false;
    selectedSection.classList.add("active");

    const selectedButton = document.querySelector(
        `.nav-button[data-page="${sectionId}"]`
    );

    if (selectedButton) {
        selectedButton.classList.add("active");
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// =========================================
// 5. NAVIGATION BUTTON EVENTS
// =========================================

navigationButtons.forEach(button => {

    // Links to other pages work normally.

    if (!button.dataset.page) return;

    button.addEventListener("click", () => {

        openSection(button.dataset.page);

    });

});


if (exploreIdeasButton) {

    exploreIdeasButton.addEventListener("click", () => {

        openSection("ideasSection");

    });

}


// Open home page by default.

openSection("homeSection");


// =========================================
// 6. CHECK MEMBER ACCESS
// =========================================

async function checkMemberAccess() {

    try {

        // Check logged-in user.

        const {
            data: authData,
            error: authError
        } = await supabase.auth.getUser();


        if (authError || !authData.user) {

            currentUser = null;
            currentProfile = null;

            showMessage(
                "Please sign in to share ideas.",
                "error"
            );

            if (ideaForm) {
                ideaForm.hidden = true;
            }

            if (ideasList) {
                ideasList.textContent =
                    "Please sign in to view community ideas.";
            }

            if (featuredIdeasList) {
                featuredIdeasList.textContent =
                    "Please sign in to explore community ideas.";
            }

            return false;
        }


        currentUser = authData.user;


        // Load member profile.

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

            currentProfile = null;

            showMessage(
                "We could not load your member profile.",
                "error"
            );

            if (ideaForm) {
                ideaForm.hidden = true;
            }

            if (ideasList) {
                ideasList.textContent =
                    "Your profile could not be loaded.";
            }

            return false;
        }


        currentProfile = profile;


        // Check approval status.

        if (profile.status !== "approved") {

            showMessage(
                "Your membership is waiting for approval.",
                "error"
            );

            if (ideaForm) {
                ideaForm.hidden = true;
            }

            if (ideasList) {
                ideasList.textContent =
                    "Only approved members can access community ideas.";
            }

            return false;
        }


        // Approved member.

        if (ideaForm) {
            ideaForm.hidden = false;
        }

        return true;

    } catch (error) {

        console.error("Member access error:", error);

        showMessage(
            "Something went wrong while checking your account.",
            "error"
        );

        if (ideaForm) {
            ideaForm.hidden = true;
        }

        return false;
    }
}


// =========================================
// 7. CREATE IDEA CARD
// =========================================

function createIdeaCard(idea) {

    const card = document.createElement("article");

    card.className = "idea-card";


    // Author information.

    const author = idea.profiles || {};

    const authorName =
        author.display_name || "coreI Member";

    const memberCode =
        author.member_code || "Member ID unavailable";

    const authorPhoto =
        author.avatar_url || DEFAULT_AVATAR;


    // Star information.

    const stars = idea.idea_stars || [];

    const starCount = stars.length;

    const hasStarred = stars.some(star => {

        return star.member_id === currentUser.id;

    });


    // =====================================
    // AUTHOR PROFILE
    // =====================================

    const authorArea = document.createElement("div");

    authorArea.className = "idea-author";


    // Profile picture.

    const authorImage = document.createElement("img");

    authorImage.className = "idea-author-photo";

    authorImage.src = authorPhoto;

    authorImage.alt = `${authorName}'s profile picture`;

    authorImage.onerror = () => {

        authorImage.onerror = null;

        authorImage.src = DEFAULT_AVATAR;

    };


    // Author details.

    const authorDetails = document.createElement("div");

    authorDetails.className = "idea-author-details";


    const authorNameElement = document.createElement("strong");

    authorNameElement.textContent = authorName;


    const memberCodeElement = document.createElement("small");

    memberCodeElement.textContent = memberCode;


    authorDetails.append(
        authorNameElement,
        memberCodeElement
    );


    authorArea.append(
        authorImage,
        authorDetails
    );


    // =====================================
    // IDEA DATE
    // =====================================

    const dateElement = document.createElement("small");

    dateElement.className = "idea-date";

    dateElement.textContent = idea.created_at
        ? new Date(idea.created_at).toLocaleDateString()
        : "";


    // =====================================
    // IDEA TITLE
    // =====================================

    const titleElement = document.createElement("h3");

    titleElement.textContent =
        idea.title || "Untitled idea";


    // =====================================
    // IDEA DESCRIPTION
    // =====================================

    const contentElement = document.createElement("p");

    contentElement.className = "idea-content";

    contentElement.textContent = idea.content || "";


    // =====================================
    // IDEA ACTIONS
    // =====================================

    const actions = document.createElement("div");

    actions.className = "idea-actions";


    // =====================================
    // STAR BUTTON
    // =====================================

    const starButton = document.createElement("button");

    starButton.type = "button";

    starButton.className = "star-button";

    starButton.textContent =
        `${hasStarred ? "★" : "☆"} ${starCount}`;

    starButton.setAttribute(
        "aria-label",
        hasStarred
            ? "Remove your star"
            : "Give this idea a star"
    );


    starButton.addEventListener("click", async () => {

        starButton.disabled = true;

        try {

            let result;

            if (hasStarred) {

                // Remove existing star.

                result = await supabase
                    .from("idea_stars")
                    .delete()
                    .eq("idea_id", idea.id)
                    .eq("member_id", currentUser.id);

            } else {

                // Add a new star.

                result = await supabase
                    .from("idea_stars")
                    .insert({
                        idea_id: idea.id,
                        member_id: currentUser.id
                    });

            }


            if (result.error) {

                console.error(
                    "Star update error:",
                    result.error
                );

                alert(
                    "Could not update your star. Please try again."
                );

                return;
            }


            await loadIdeas();

        } catch (error) {

            console.error("Star error:", error);

            alert(
                "Something went wrong while updating your star."
            );

        } finally {

            starButton.disabled = false;

        }

    });


    actions.appendChild(starButton);


    // =====================================
    // DELETE BUTTON
    // =====================================

    const isOwner =
        idea.member_id === currentUser.id;

    const isAdmin =
        currentProfile?.role === "admin";


    if (isOwner || isAdmin) {

        const deleteButton = document.createElement("button");

        deleteButton.type = "button";

        deleteButton.className = "delete-idea-button";

        deleteButton.textContent = "Delete";


        deleteButton.addEventListener("click", async () => {

            const confirmed = window.confirm(
                "Are you sure you want to delete this idea?"
            );

            if (!confirmed) return;


            deleteButton.disabled = true;

            try {

                const { error } = await supabase
                    .from("ideas")
                    .delete()
                    .eq("id", idea.id);


                if (error) {

                    console.error(
                        "Idea deletion error:",
                        error
                    );

                    alert(
                        "You do not have permission to delete this idea."
                    );

                    return;
                }


                await loadIdeas();

            } catch (error) {

                console.error("Delete error:", error);

                alert(
                    "Something went wrong while deleting this idea."
                );

            } finally {

                deleteButton.disabled = false;

            }

        });


        actions.appendChild(deleteButton);

    }


    // =====================================
    // COMPLETE IDEA CARD
    // =====================================

    card.append(
        authorArea,
        dateElement,
        titleElement,
        contentElement,
        actions
    );

    return card;
}


// =========================================
// 8. LOAD COMMUNITY IDEAS
// =========================================

async function loadIdeas() {

    if (!ideasList || !currentUser) return;

    ideasList.textContent = "Loading ideas...";


    // Get ideas, authors and stars.

    const { data: ideas, error } = await supabase
        .from("ideas")
        .select(`
            id,
            member_id,
            title,
            content,
            created_at,

            profiles!ideas_member_id_fkey (
                display_name,
                member_code,
                avatar_url
            ),

            idea_stars (
                member_id
            )
        `)
        .order("created_at", { ascending: false });


    if (error) {

        console.error("Ideas loading error:", error);

        ideasList.textContent =
            "We could not load ideas. Please try again.";

        if (featuredIdeasList) {
            featuredIdeasList.textContent =
                "Featured ideas could not be loaded.";
        }

        return;
    }


    // =====================================
    // COMMUNITY IDEAS
    // =====================================

    ideasList.replaceChildren();


    if (!ideas || ideas.length === 0) {

        const emptyMessage = document.createElement("div");

        emptyMessage.className = "empty-card";

        emptyMessage.textContent =
            "No ideas have been shared yet. Be the first to share one!";

        ideasList.appendChild(emptyMessage);

    } else {

        ideas.forEach(idea => {

            ideasList.appendChild(
                createIdeaCard(idea)
            );

        });

    }


    // =====================================
    // FEATURED IDEAS
    // =====================================

    if (featuredIdeasList) {

        featuredIdeasList.replaceChildren();


        if (!ideas || ideas.length === 0) {

            const emptyMessage = document.createElement("div");

            emptyMessage.className = "empty-card";

            emptyMessage.textContent =
                "Ideas are waiting to be shared.";

            featuredIdeasList.appendChild(emptyMessage);

        } else {

            // Display the latest three ideas.

            ideas.slice(0, 3).forEach(idea => {

                featuredIdeasList.appendChild(
                    createIdeaCard(idea)
                );

            });

        }

    }

}


// =========================================
// 9. PUBLISH A NEW IDEA
// =========================================

if (ideaForm) {

    ideaForm.addEventListener("submit", async event => {

        event.preventDefault();


        if (!currentUser || !currentProfile) {

            showMessage(
                "Please sign in first.",
                "error"
            );

            return;
        }


        if (currentProfile.status !== "approved") {

            showMessage(
                "Your membership must be approved before publishing.",
                "error"
            );

            return;
        }


        const title = ideaTitle?.value.trim() || "";

        const content = ideaContent?.value.trim() || "";


        // Validate title.

        if (title.length < 3 || title.length > 120) {

            showMessage(
                "Your title must contain 3 to 120 characters.",
                "error"
            );

            return;
        }


        // Validate description.

        if (content.length < 10 || content.length > 5000) {

            showMessage(
                "Your idea must contain 10 to 5000 characters.",
                "error"
            );

            return;
        }


        if (publishIdeaButton) {

            publishIdeaButton.disabled = true;

            publishIdeaButton.textContent = "Publishing...";

        }


        showMessage("Publishing your idea...");


        try {

            const { error } = await supabase
                .from("ideas")
                .insert({
                    member_id: currentUser.id,
                    title: title,
                    content: content
                });


            if (error) {

                console.error(
                    "Idea publishing error:",
                    error
                );

                showMessage(
                    "Your idea could not be published. Please try again.",
                    "error"
                );

                return;
            }


            // Clear form.

            ideaForm.reset();


            showMessage(
                "Your idea has been published!",
                "success"
            );


            // Refresh ideas.

            await loadIdeas();

        } catch (error) {

            console.error("Publishing error:", error);

            showMessage(
                "Something went wrong while publishing.",
                "error"
            );

        } finally {

            if (publishIdeaButton) {

                publishIdeaButton.disabled = false;

                publishIdeaButton.textContent = "✧ Publish idea";

            }

        }

    });

}


// =========================================
// 10. LOAD COMMUNITY ANNOUNCEMENTS
// =========================================

async function loadAnnouncements() {

    if (!announcementsList) return;

    announcementsList.replaceChildren();


    const loadingMessage = document.createElement("p");

    loadingMessage.textContent = "Loading community updates...";

    announcementsList.appendChild(loadingMessage);


    const { data, error } = await supabase
        .from("announcements")
        .select(`
            id,
            title,
            description,
            created_at
        `)
        .eq("is_published", true)
        .order("created_at", { ascending: false });


    if (error) {

        console.error(
            "Announcement loading error:",
            error
        );

        announcementsList.replaceChildren();

        const message = document.createElement("p");

        message.textContent =
            "Unable to load community updates.";

        announcementsList.appendChild(message);

        return;
    }


    announcementsList.replaceChildren();


    // =====================================
    // NO ANNOUNCEMENTS
    // =====================================

    if (!data || data.length === 0) {

        const emptyCard = document.createElement("div");

        emptyCard.className = "empty-card";


        const icon = document.createElement("div");

        icon.className = "empty-icon";

        icon.textContent = "✦";


        const heading = document.createElement("h3");

        heading.textContent = "Nothing new yet";


        const description = document.createElement("p");

        description.textContent =
            "Important community announcements will appear here.";


        emptyCard.append(
            icon,
            heading,
            description
        );

        announcementsList.appendChild(emptyCard);

        return;
    }


    // =====================================
    // CREATE ANNOUNCEMENT CARDS
    // No suggestions or questions.
    // =====================================

    data.forEach(announcement => {

        const card = document.createElement("article");

        card.className = "announcement-card";


        // Announcement title.

        const heading = document.createElement("h3");

        heading.textContent =
            announcement.title || "Community update";


        // Announcement description.

        const description = document.createElement("p");

        description.textContent =
            announcement.description || "";


        // Publication date.

        const date = document.createElement("small");

        date.className = "announcement-date";

        date.textContent = announcement.created_at
            ? new Date(
                announcement.created_at
            ).toLocaleDateString()
            : "";


        // Add only these three elements.

        card.append(
            heading,
            description,
            date
        );


        announcementsList.appendChild(card);

    });

}


// =========================================
// 11. START APPLICATION
// =========================================

async function startApplication() {

    // First check member access.

    const hasAccess = await checkMemberAccess();

    if (!hasAccess) return;


    // Load announcements for approved members.

    await loadAnnouncements();


    // Load community and featured ideas.

    await loadIdeas();

}


// Start coreI.

startApplication();
