/**
 * Common JavaScript functions shared across all pages
 * Kitab Hikmah - Digital Archive
 */

/**
 * Toggle scholar biography visibility
 * Used in index.html and topic pages (power, context, identity, light)
 * @param {string} id - The scholar ID to toggle (e.g., 'ibnkathir-1', 'saadi', 'tabari')
 */
function toggleScholar(id) {
    const bio = document.getElementById(`bio-${id}`);
    const icon = document.getElementById(`icon-${id}`);

    if (!bio || !icon) {
        console.warn(`Scholar elements not found for id: ${id}`);
        return;
    }

    // Use getComputedStyle to handle both inline and CSS display values
    const isHidden = window.getComputedStyle(bio).display === "none";

    if (isHidden) {
        bio.style.display = "block";
        icon.style.transform = "rotate(180deg)";
    } else {
        bio.style.display = "none";
        icon.style.transform = "rotate(0deg)";
    }
}
