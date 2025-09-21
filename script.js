console.log("Telemedicine Dashboard Loaded");

// Language change (basic alert for now)
function changeLanguage(lang) {
  alert("Language changed to: " + lang);
}

// New function for voice search
function setupVoiceSearch() {
  // Check if the browser supports the Web Speech API
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition) {
    const searchInput = document.getElementById('search-input');
    const voiceSearchBtn = document.getElementById('voice-search-btn');

    // Create a new SpeechRecognition instance
    const recognition = new SpeechRecognition();

    // Set properties
    recognition.continuous = false; // Only a single result
    recognition.lang = 'en-US'; // Set the language
    recognition.interimResults = false; // We only want the final result

    // Event handler for when the recognition starts
    recognition.onstart = () => {
      voiceSearchBtn.classList.add('listening-pulse');
      searchInput.placeholder = "Listening...";
    };

    // Event handler for when a result is received
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      searchInput.value = transcript;
      searchInput.placeholder = "Search...";
    };

    // Event handler for when recognition ends
    recognition.onend = () => {
      voiceSearchBtn.classList.remove('listening-pulse');
      searchInput.placeholder = "Search...";
    };

    // Event handler for errors
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      searchInput.placeholder = "Error. Try again.";
    };

    // Add click event listener to the voice search button
    voiceSearchBtn.addEventListener('click', () => {
      try {
        recognition.start();
      } catch (e) {
        console.error('Recognition already started or error:', e);
      }
    });

  } else {
    // If API is not supported, hide the voice search button
    const voiceSearchBtn = document.getElementById('voice-search-btn');
    if (voiceSearchBtn) {
      voiceSearchBtn.style.display = 'none';
    }
    console.warn("Web Speech API is not supported in this browser.");
  }
}

// Call the function to set up voice search
document.addEventListener('DOMContentLoaded', setupVoiceSearch);
