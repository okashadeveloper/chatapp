import {
    auth,
    db,
    sendEmailVerification,
    sendPasswordResetEmail,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    signOut,
    onAuthStateChanged,
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    deleteDoc,
    doc,
    updateDoc,
    setDoc,
    where,
    limit,
    getDoc
} from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";


console.log("Initializing Okasha ChatApp...");

const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const mainBox = document.getElementById('mainBox');
const signUpForm = document.getElementById('signUpForm');
const signInForm = document.getElementById('signInForm');
const forgotPassLink = document.querySelector('.login-box a.forgot-pass');
const chatSection = document.getElementById('chatSection');
const messagesBox = document.getElementById('messagesBox');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const userDisplay = document.getElementById('displayUserName');
const chatLogoutBtn = document.getElementById('chatLogoutBtn');
const typingIndicator = document.getElementById('typingIndicator');

// Logic variables
let typingTimeout = null;
let currentChatListener = null;
let currentTypingListener = null;

async function updateUserStatus(status) {
    if (!auth.currentUser) return;
    const userRef = doc(db, "users", auth.currentUser.uid);
    try {
        await updateDoc(userRef, {
            status: status,
            lastSeen: serverTimestamp()
        });
        console.log(`User status updated to: ${status}`);
    } catch (err) {
        await setDoc(userRef, { 
            status: status, 
            lastSeen: serverTimestamp(),
            userName: auth.currentUser.displayName || "User"
        }, { merge: true });
    }
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // --- EMAIL VERIFICATION CHECK ---
        if (!user.emailVerified && user.email) {
            console.log("User email not verified.");
            Swal.fire({
                icon: 'warning',
                title: 'Email Not Verified',
                text: 'Please verify your email before accessing the chat.',
                background: '#0a0a0a',
                color: '#ffd700'
            });
            await signOut(auth);
            if(mainBox) mainBox.style.display = "block";
            if(chatSection) chatSection.style.display = "none";
            return;
        }

        console.log("User detected and verified:", user.uid);
        if(mainBox) mainBox.style.display = "none";
        if(chatSection) chatSection.style.display = "flex";
        
        const userName = user.displayName || user.email || user.phoneNumber;
      
userDisplay.innerHTML = `꧁♡𝑜𝓀𝒶𝓈𝒽𝒶 𝒸𝒽𝒶𝓉𝒶𝓅𝓅 ♡꧂`;

        Swal.fire({
            title: 'Welcome',
            text: `Glad to see you again in ♡𝑜𝓀𝒶𝓈𝒽𝒶 𝒸𝒽𝒶𝓉𝒶𝓅𝓅 ♡`,
            icon: 'success',
            background: '#0a0a0a',
            color: '#ffd700',
            showConfirmButton: false,
            timer: 2000
        });

        await updateUserStatus("online");
        listenForMessages();
        listenForTyping();
        listenForOnlineUsers();
    } else {
        console.log("No user session active.");
        if(mainBox) mainBox.style.display = "block";
        if(chatSection) chatSection.style.display = "none";
        
        if(currentChatListener) currentChatListener();
        if(currentTypingListener) currentTypingListener();
    }
});

// ==========================================
// --- TYPING INDICATOR LOGIC ---
// ==========================================
messageInput.addEventListener('input', () => {
    if (!auth.currentUser) return;
    setTypingStatus(true);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        setTypingStatus(false);
    }, 2500);
});

async function setTypingStatus(isTyping) {
    try {
        if (!auth.currentUser) return; // Guard for null user
        const userRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userRef, {
            isTyping: isTyping,
            userName: auth.currentUser.displayName || "User"
        });
    } catch (err) {
        console.error("Typing Update Fail:", err);
    }
}

function listenForTyping() {
    const q = query(collection(db, "users"), where("isTyping", "==", true));
    currentTypingListener = onSnapshot(q, (snapshot) => {
        const typers = [];
        snapshot.forEach((doc) => {
            if (auth.currentUser && doc.id !== auth.currentUser.uid) {
                typers.push(doc.data().userName);
            }
        });

        if (typers.length > 0) {
            typingIndicator.innerHTML = `
                <div class="typing-box">
                    ${typers.join(', ')} is typing 
                    <span class="typing-dot">.</span>
                    <span class="typing-dot">.</span>
                    <span class="typing-dot">.</span>
                </div>
            `;
        } else {
            typingIndicator.innerHTML = "";
        }
    });
}

// ==========================================
// --- CORE AUTH LOGIC (SIGNUP/SIGNIN) ---
// ==========================================

if (signUpButton) {
    signUpButton.addEventListener('click', () => {
        mainBox.classList.add("slider-active");
    });
}

if (signInButton) {
    signInButton.addEventListener('click', () => {
        mainBox.classList.remove("slider-active");
    });
}

signUpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signUpUsername').value.trim();
    const contact = document.getElementById('signUpContact').value.trim();
    const password = document.getElementById('signUpPassword').value;

    if (password.length < 6) {
        Swal.fire({ icon: 'error', title: 'Weak Password', text: 'Min 6 characters required!' });
        return;
    }

    Swal.fire({ title: 'Processing...', background: '#000', color: '#fff', didOpen: () => Swal.showLoading() });

    try {
        if (contact.includes('@')) {
            const userCredential = await createUserWithEmailAndPassword(auth, contact, password);
            const newUser = userCredential.user; // Store user reference before any logout
            
            await updateProfile(newUser, { displayName: name });
            
            // Fixed: Using newUser.uid instead of auth.currentUser to prevent null error
            await setDoc(doc(db, "users", newUser.uid), {
                userName: name,
                email: contact,
                isTyping: false,
                status: "offline" // Offline because verification is pending
            });

            // Fixed: Using newUser instead of auth.currentUser
            await sendEmailVerification(newUser);
            
            Swal.fire({ 
                icon: 'warning', 
                title: 'Check Email', 
                text: 'Verification link sent. Please verify your email before logging in.',
                background: '#111', color: '#fff' 
            });
            signUpForm.reset();
            mainBox.classList.remove("slider-active"); 
        } else {
            let phone = contact.replace(/\D/g, '');
            if (!phone.startsWith('92')) phone = '92' + phone;
            window.sendOTP('+' + phone);
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Signup Error', text: error.message });
    }
});

signInForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const contact = document.getElementById('signInContact').value.trim();
    const password = document.getElementById('signInPassword').value;

    Swal.fire({ title: 'Signing In...', background: '#000', color: '#fff', didOpen: () => Swal.showLoading() });

    try {
        if (contact.includes('@')) {
            const res = await signInWithEmailAndPassword(auth, contact, password);
            if (!res.user.emailVerified) {
                Swal.fire({ icon: 'error', title: 'Not Verified', text: 'Please verify email first.' });
                await signOut(auth);
            }
        } else {
            let phone = contact.replace(/\D/g, '');
            if (!phone.startsWith('92')) phone = '92' + phone;
            window.sendOTP('+' + phone);
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Login Failed', text: err.message });
    }
});

// ==========================================
// --- MESSAGE CRUD OPERATIONS ---
// ==========================================

messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (text === "") return;

    if (auth.currentUser) {
        const tempText = text;
        messageInput.value = ""; 

        try {
            await addDoc(collection(db, "chats"), {
                message: tempText,
                senderId: auth.currentUser.uid,
                senderName: auth.currentUser.displayName || "Anonymous",
                createdAt: serverTimestamp(),
                isEdited: false
            });
            setTypingStatus(false);
        } catch (error) {
            messageInput.value = tempText;
            Swal.fire({ icon: 'error', title: 'Network Error', text: 'Could not send message.' });
        }
    }
});

function listenForMessages() {
    const q = query(collection(db, "chats"), orderBy("createdAt", "asc"), limit(100));
    currentChatListener = onSnapshot(q, (snapshot) => {
        messagesBox.innerHTML = "";
        snapshot.forEach((doc) => {
            displaySingleMessage(doc.id, doc.data());
        });
        messagesBox.scrollTop = messagesBox.scrollHeight;
    });
}

function displaySingleMessage(id, data) {
    const messageDiv = document.createElement('div');
    const isMine = auth.currentUser && data.senderId === auth.currentUser.uid;

    messageDiv.classList.add('msg');
    messageDiv.classList.add(isMine ? 'sent' : 'received');
    
    if (isMine) {
        messageDiv.style.alignSelf = "flex-end";
        messageDiv.style.marginLeft = "auto";
        messageDiv.style.backgroundColor = "#ff0000"; 
    } else {
        messageDiv.style.alignSelf = "flex-start";
        messageDiv.style.marginRight = "auto";
        messageDiv.style.backgroundColor = "#333"; 
    }
    
    const sender = data.senderName || "Guest User";
    const time = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...';

    messageDiv.innerHTML = `
        <div class="msg-header" style="display:flex; justify-content:space-between; align-items:center; gap: 15px;">
            <small style="color: #ffd700; font-weight: bold; font-size: 10px;">${sender}</small>
            <span style="font-size:8px; opacity:0.6; color:#fff;">${time}</span>
        </div>
        <div class="msg-content" style="margin-top: 5px; word-break: break-word; color: #fff;">
            ${data.message}
            ${data.isEdited ? '<span style="font-size:8px; opacity:0.5; font-style:italic;"> (edited)</span>' : ''}
        </div>
    `;

    if (isMine) {
        addMessageActions(messageDiv, id, data.message);
    }
    messagesBox.appendChild(messageDiv);
}

function addMessageActions(container, id, currentText) {
    const actionWrap = document.createElement('div');
    actionWrap.className = 'action-icons-container';
    actionWrap.style.cssText = `
        position: absolute; top: -15px; right: 0; display: none; 
        gap: 12px; background: #000; padding: 4px 12px; 
        border-radius: 15px; border: 1px solid #ff0000; z-index: 100;
    `;

    const editBtn = document.createElement('span');
    editBtn.innerHTML = "✏️";
    editBtn.style.cursor = "pointer";
    editBtn.onclick = () => triggerEdit(id, currentText);

    const delBtn = document.createElement('span');
    delBtn.innerHTML = "🗑️";
    delBtn.style.cursor = "pointer";
    delBtn.onclick = () => triggerDelete(id);

    actionWrap.append(editBtn, delBtn);
    container.appendChild(actionWrap);
    container.onmouseenter = () => actionWrap.style.display = "flex";
    container.onmouseleave = () => actionWrap.style.display = "none";
}

async function triggerEdit(id, oldText) {
    const { value: newText } = await Swal.fire({
        title: 'Edit Message',
        input: 'text',
        inputValue: oldText,
        showCancelButton: true,
        confirmButtonColor: '#ff0000',
        background: '#0a0a0a',
        color: '#fff'
    });

    if (newText && newText !== oldText) {
        try {
            await updateDoc(doc(db, "chats", id), {
                message: newText,
                isEdited: true,
                editedAt: serverTimestamp()
            });
        } catch (err) {
            Swal.fire("Error", "Could not edit", "error");
        }
    }
}

async function triggerDelete(id) {
    const confirmation = await Swal.fire({
        title: 'Delete?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ff0000',
        background: '#0a0a0a',
        color: '#fff'
    });

    if (confirmation.isConfirmed) {
        try {
            await deleteDoc(doc(db, "chats", id));
        } catch (err) {
            Swal.fire("Error", "Delete failed", "error");
        }
    }
}

// ==========================================
// --- EXTRA UTILITIES ---
// ==========================================

function listenForOnlineUsers() {
    const q = query(collection(db, "users"), where("status", "==", "online"));
    onSnapshot(q, (snapshot) => {
        console.log(`Active users: ${snapshot.size}`);
    });
}

chatLogoutBtn.addEventListener('click', async () => {
    const confirmLogout = await Swal.fire({
        title: 'Sign Out?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#ff0000',
        background: '#0a0a0a',
        color: '#fff'
    });

    if (confirmLogout.isConfirmed) {
        await updateUserStatus("offline");
        signOut(auth);
    }
});

if (forgotPassLink) {
    forgotPassLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const { value: email } = await Swal.fire({
            title: 'Reset Password',
            input: 'email',
            background: '#111', color: '#fff'
        });

        if (email) {
            try {
                await sendPasswordResetEmail(auth, email);
                Swal.fire("Success", "Reset link sent!", "success");
            } catch (err) {
                Swal.fire("Error", err.message, "error");
            }
        }
    });
}

window.sendOTP = function (phoneNumber) {
    const appVerifier = window.recaptchaVerifier;
    signInWithPhoneNumber(auth, phoneNumber, appVerifier)
        .then((confirmationResult) => {
            window.confirmationResult = confirmationResult;
            Swal.fire({
                title: 'Enter OTP',
                input: 'text',
                background: '#0a0a0a', color: '#ffd700'
            }).then((otp) => {
                if (otp.value) {
                    window.confirmationResult.confirm(otp.value)
                        .then(() => console.log("Success"))
                        .catch(err => Swal.fire("Invalid OTP", err.message, "error"));
                }
            });
        }).catch((error) => {
            Swal.fire("SMS Error", error.message, "error");
        });
};


// Mobile switch logic fix
document.addEventListener('click', (e) => {
    // Check if the clicked element is the 'Sign In' or 'Sign Up' link/text
    if (e.target.innerText.toLowerCase().includes("sign in")) {
        mainBox.classList.remove("slider-active");
        console.log("Switching to Sign In");
    } else if (e.target.innerText.toLowerCase().includes("sign up")) {
        mainBox.classList.add("slider-active");
        console.log("Switching to Sign Up");
    }
});

console.log("꧁♡𝑜𝓀𝒶𝓈𝒽𝒶 𝒸𝒽𝒶𝓉𝒶𝓓𝓅 ♡꧂ Script Loaded Successfully.");
// ==========================================
// --- END OF SCRIPT.JS ---
// ==========================================