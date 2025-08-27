// Custom context menu
const contextMenuTrigger = document.querySelector(".context-menu-trigger");
const contextMenu = document.querySelector(".context-menu");

contextMenuTrigger.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  
    // Show the context menu with a smooth opacity transition
    contextMenu.style.visibility = "visible";
    contextMenu.classList.add("cc-show");
});

document.body.addEventListener("click", function () {
    // Delay the removal of the "cc-show" class
    setTimeout(function () {
        contextMenu.classList.remove("cc-show"); // Remove the class to hide the menu
  
        // Wait for the opacity transition to finish before hiding the element
        setTimeout(function () {
            contextMenu.style.visibility = "hidden";
        }, 400); // Match the duration of the opacity transition
    }, 200); // Delay before removing the class
});

// Function to get a local storage item with expiry check
function getItemWithExpiry(key) {
    const dataString = localStorage.getItem(key);
    if (!dataString) {
        return null; // No item found
    }
    const data = JSON.parse(dataString);
    const currentTime = Date.now();

    if (currentTime > data.expiry) {
        localStorage.removeItem(key); // Remove expired item
        return null; // Expired item
    }
    return data.value; // Return valid item
}

// Check the flag and toggle visibility of the Webflow migrate CTA
const webflowElement = document.querySelector('#migrateWebflow');
const generalElement = document.querySelector('#migrateGeneral');

if (webflowElement && generalElement) {
    const visited = getItemWithExpiry('visitedWebflowMigrationPage');
    if (visited) {
        // User has visited the specific page
        webflowElement.style.display = 'block'; // Show Webflow migrate CTA
        generalElement.style.display = 'none'; // Hide general migrate CTA
    } else {
        // User has NOT visited or the visit data has expired
        webflowElement.style.display = 'none'; // Hide Webflow migrate CTA
    }
}

// Change navbar padding on scroll
window.addEventListener("scroll", () => {
    let scrolled = window.scrollY > 0;
  
    gsap.to(document.documentElement, {
        duration: 0.2,
        "--component-navbar--padding-top": scrolled ? "0.5rem" : "1.5rem",
        "--component-navbar--padding-top-xs": scrolled ? "0.5rem" : "1rem",
        "--component-navbar--background-color": scrolled ? "#ffffffcc" : "#ffffff33", // Hex with alpha
        ease: "power1.out"
    });
});
  
  