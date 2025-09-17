// You can add more complex functionality later
console.log("Telemedicine Dashboard Loaded");
function changeLanguage(lang) {
    alert("Language changed to: " + lang);
    // Later you can add translations here
}
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("profileForm");

    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();

            const name = document.getElementById("name").value.trim();
            const phone = document.getElementById("phone").value.trim();

            if (!name || !phone) {
                alert("Name and Phone Number are compulsory!");
                return;
            }

            alert("Profile saved successfully!");
            form.reset();
        });
    }
});
