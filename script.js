
// =====================================
// coreI — WEBSITE INTERACTIONS
// =====================================

// Find the menu button and navigation links
const menuButton = document.getElementById("menuButton");
const navLinks = document.getElementById("navLinks");

// Open and close the mobile navigation
menuButton.addEventListener("click", () => {

    const isOpen = navLinks.classList.toggle("open");

    menuButton.classList.toggle("active", isOpen);

    menuButton.setAttribute("aria-expanded", isOpen);

});

// Close the menu after clicking a navigation link
const navigationItems = navLinks.querySelectorAll("a");

navigationItems.forEach((item) => {

    item.addEventListener("click", () => {

        navLinks.classList.remove("open");
        menuButton.classList.remove("active");

        menuButton.setAttribute("aria-expanded", "false");

    });

});

// Close the menu when the user presses Escape
document.addEventListener("keydown", (event) => {

    if (event.key === "Escape") {

        navLinks.classList.remove("open");
        menuButton.classList.remove("active");

        menuButton.setAttribute("aria-expanded", "false");

    }

});

console.log("Welcome to coreI!");
