import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, onSnapshot, addDoc, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Set log level for debugging
setLogLevel('debug');

// Global variables provided by the canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
let userId = null;

const navItems = document.querySelectorAll('.nav-item');

// Function to highlight active navigation item based on current page
function setActiveNav() {
    const currentPath = window.location.pathname.split('/').pop();
    navItems.forEach(item => {
        // Remove old active classes
        item.classList.remove('active');
        item.classList.add('text-gray-600', 'hover:bg-blue-50', 'hover:text-blue-600'); // Ensure default styles are present
        
        const href = item.getAttribute('href').split('/').pop();
        if (href === currentPath || (currentPath === '' && href === 'index.html')) {
            // Apply new active classes (using CSS class 'active' defined in style.css)
            item.classList.add('active');
            item.classList.remove('text-gray-600', 'hover:bg-blue-50', 'hover:text-blue-600');
        }
    });
}


// Show a custom modal message
function showMessage(title, message) {
    const modal = document.getElementById('custom-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    modal.classList.remove('hidden');
    // Animate it in
    setTimeout(() => {
        modal.querySelector('div').classList.remove('scale-95', 'opacity-0');
        modal.querySelector('div').classList.add('scale-100', 'opacity-100');
    }, 10);
}

// NOTE: closeModal is now defined in a script block outside the module for global access, 
// but is kept here for completeness and module-internal use (if any)
/*
function closeModal() {
    const modal = document.getElementById('custom-modal');
    modal.querySelector('div').classList.remove('scale-100', 'opacity-100');
    modal.querySelector('div').classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300); // Wait for the transition to finish
}
*/

// Initial view load and active nav setup
document.addEventListener('DOMContentLoaded', () => {
    setActiveNav();
});

// Set up auth state listener
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userId = user.uid;
        const userIdDisplay = document.getElementById('user-id-display');
        if (userIdDisplay) {
            userIdDisplay.querySelector('span').textContent = userId;
        }
        console.log("User authenticated with UID:", userId);
        
        // Fetch data based on the current page
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'index.html' || currentPage === '') {
            await fetchProfile();
        } else if (currentPage === 'profile.html') {
            await fetchProfile();
        } else if (currentPage === 'prescriptions.html') {
            await fetchPrescriptions();
        } else if (currentPage === 'support.html') {
            await setupChatListener();
        }
        
    } else {
        console.log("No user authenticated. Signing in anonymously...");
        userId = crypto.randomUUID(); // Use a random UUID for anonymous users
        const userIdDisplay = document.getElementById('user-id-display');
        if (userIdDisplay) {
            userIdDisplay.querySelector('span').textContent = userId;
        }
        await signInAnonymously(auth);
    }
});

// Function to fetch and display user profile from Firestore
async function fetchProfile() {
    if (!userId) {
        console.error("User ID is not set. Cannot fetch profile.");
        return;
    }
    try {
        const docRef = doc(db, `/artifacts/${appId}/users/${userId}/private/profile`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const profileNameInput = document.getElementById('profile-name');
            if (profileNameInput) profileNameInput.value = data.name || '';
            const profilePhoneInput = document.getElementById('profile-phone');
            if (profilePhoneInput) profilePhoneInput.value = data.phone || '';
            const profileAadhaarInput = document.getElementById('profile-aadhaar');
            if (profileAadhaarInput) profileAadhaarInput.value = data.aadhaar || '';
            const profileBloodInput = document.getElementById('profile-blood');
            if (profileBloodInput) profileBloodInput.value = data.blood || '';
            const profileAddressInput = document.getElementById('profile-address');
            if (profileAddressInput) profileAddressInput.value = data.address || '';
            
            const userNameSpan = document.getElementById('user-name');
            if (userNameSpan) userNameSpan.textContent = data.name || 'Guest';

            console.log("Profile loaded successfully.");
        } else {
            console.log("No profile found for this user.");
        }
    } catch (e) {
        console.error("Error fetching profile:", e);
        showMessage('Error', 'Failed to load your profile. Please try again later.');
    }
}

// Function to fetch and display prescriptions
async function fetchPrescriptions() {
    if (!userId) {
        console.error("User ID is not set. Cannot fetch prescriptions.");
        return;
    }
    const container = document.getElementById('prescriptions-container');
    if (!container) return;
    
    container.innerHTML = `<p class="text-gray-500">Loading prescriptions...</p>`;
    const prescriptionsRef = collection(db, `/artifacts/${appId}/users/${userId}/private/prescriptions`);
    const q = query(prescriptionsRef, orderBy('date', 'desc')); // Order by date descending

    // Use onSnapshot for real-time updates
    onSnapshot(q, (querySnapshot) => {
        if (querySnapshot.empty) {
            container.innerHTML = `<p class="text-gray-500">No prescriptions found. Book a consultation to get started!</p>`;
            return;
        }
        container.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const prescription = doc.data();
            // Convert Firestore Timestamp or string date to local string, defaulting to N/A
            const dateStr = prescription.date 
                ? (prescription.date.toDate ? prescription.date.toDate().toLocaleDateString() : new Date(prescription.date).toLocaleDateString())
                : 'N/A';

            const card = `
                <div class="bg-gray-50 p-4 rounded-xl shadow-sm border border-gray-200 mb-4">
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="font-semibold text-lg text-gray-800">Prescription from Dr. ${prescription.doctor || 'Unknown'}</h4>
                        <span class="text-sm text-gray-500">${dateStr}</span>
                    </div>
                    <p class="text-gray-700 font-medium">${prescription.medication || 'No medication details'}</p>
                    <p class="text-gray-500 text-sm mt-1">Notes: ${prescription.notes || 'No notes'}</p>
                </div>
            `;
            container.innerHTML += card;
        });
    }, (error) => {
        console.error("Error fetching prescriptions:", error);
        container.innerHTML = `<p class="text-red-500">Error loading prescriptions. Please try again.</p>`;
    });
}

// Save profile data to Firestore
const profileForm = document.getElementById('profileForm');
if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!userId) {
            showMessage('Error', 'Authentication failed. Please refresh the page.');
            return;
        }
        try {
            const formData = new FormData(e.target);
            const profileData = Object.fromEntries(formData.entries());
            const docRef = doc(db, `/artifacts/${appId}/users/${userId}/private/profile`);
            await setDoc(docRef, profileData, { merge: true });
            
            const userNameSpan = document.getElementById('user-name');
            if (userNameSpan) userNameSpan.textContent = profileData.name || 'Guest';
            
            showMessage('Success', 'Profile saved successfully!');
        } catch (e) {
            console.error("Error saving profile:", e);
            showMessage('Error', 'Failed to save profile. Please try again.');
        }
    });
}

// Save consultation request to Firestore
const consultationForm = document.getElementById('consultationForm');
if (consultationForm) {
    consultationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!userId) {
            showMessage('Error', 'Authentication failed. Please refresh the page.');
            return;
        }
        try {
            const formData = new FormData(e.target);
            const consultationData = Object.fromEntries(formData.entries());
            consultationData.createdAt = serverTimestamp();
            consultationData.status = 'pending';
            consultationData.userId = userId;

            const colRef = collection(db, `/artifacts/${appId}/users/${userId}/private/consultations`);
            await addDoc(colRef, consultationData);
            showMessage('Success', 'Your consultation request has been submitted! A doctor will be in touch soon.');
            e.target.reset(); // Clear the form
        } catch (e) {
            console.error("Error submitting consultation:", e);
            showMessage('Error', 'Failed to submit request. Please try again.');
        }
    });
}

// Voice Search functionality
const setupVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const searchInput = document.getElementById('search-input');
    const voiceSearchBtn = document.getElementById('voice-search-btn');
    if (!SpeechRecognition || !voiceSearchBtn) {
        if (voiceSearchBtn) {
            voiceSearchBtn.style.display = 'none';
        }
        console.warn("Web Speech API is not supported or element not found.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-IN'; // Changed to Indian English for potentially better recognition
    recognition.interimResults = false;

    recognition.onstart = () => {
        voiceSearchBtn.classList.add('listening-pulse');
        searchInput.placeholder = "Listening...";
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        searchInput.value = transcript;
        searchInput.placeholder = "Search...";
        // Optional: Trigger a search on result
        // if (transcript) { document.getElementById('search-form').submit(); } 
    };

    recognition.onend = () => {
        voiceSearchBtn.classList.remove('listening-pulse');
        searchInput.placeholder = "Search...";
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        showMessage('Voice Search Error', 'Something went wrong with voice search. Please try again.');
        voiceSearchBtn.classList.remove('listening-pulse');
        searchInput.placeholder = "Search...";
    };

    voiceSearchBtn.addEventListener('click', () => {
        try {
            recognition.start();
        } catch (e) {
            console.error('Recognition already started or error:', e);
        }
    });
};


// Chat functionality
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

const addMessageToChat = (message, isSender) => {
    const messageEl = document.createElement('div');
    messageEl.className = `flex ${isSender ? 'justify-end' : 'justify-start'}`;
    messageEl.innerHTML = `
        <div class="p-3 rounded-lg shadow-sm max-w-xs ${isSender ? 'bg-blue-600 text-white rounded-bl-lg' : 'bg-gray-200 text-gray-800 rounded-br-lg'}" style="white-space: pre-wrap;">
            <p>${message}</p>
        </div>
    `;
    if (chatMessages) {
        chatMessages.appendChild(messageEl);
        // Scroll to the bottom on new message
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
};

const setupChatListener = async () => {
    if (!userId) return;
    if (!chatMessages) return;

    // Use a fixed public collection for support chat visible to all users
    const chatRef = collection(db, `/artifacts/${appId}/public/data/supportChat`);
    const q = query(chatRef, orderBy('createdAt', 'asc')); // Order by timestamp ascending

    // Set a placeholder while listening
    chatMessages.innerHTML = `<p class="text-center text-gray-500 py-4">Connecting to Support...</p>`;

    onSnapshot(q, (querySnapshot) => {
        chatMessages.innerHTML = ''; // Clear existing messages
        querySnapshot.forEach((doc) => {
            const message = doc.data();
            const isSender = message.userId === userId;
            addMessageToChat(message.text, isSender);
        });
    }, (error) => {
        console.error("Error fetching chat messages:", error);
        chatMessages.innerHTML = `<p class="text-center text-red-500 py-4">Failed to load chat. Please refresh.</p>`;
    });
};

if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (text === '') return;

        try {
            const chatRef = collection(db, `/artifacts/${appId}/public/data/supportChat`);
            await addDoc(chatRef, {
                text: text,
                userId: userId,
                createdAt: serverTimestamp()
            });
            chatInput.value = ''; // Clear the input
        } catch (e) {
            console.error("Error sending message:", e);
            showMessage('Error', 'Failed to send message. Please try again.');
        }
    });
}

// Initialize voice search
window.onload = setupVoiceSearch;
