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
    updateDoc // <--- Update ke liye zaroori
} from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --- Form Elements ---
const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const mainBox = document.getElementById('mainBox');
const signUpForm = document.getElementById('signUpForm');
const signInForm = document.getElementById('signInForm');
const forgotPassLink = document.querySelector('.login-box a');

// --- Chat Elements ---
const chatSection = document.getElementById('chatSection');
const messagesBox = document.getElementById('messagesBox');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const userDisplay = document.getElementById('displayUserName');
const chatLogoutBtn = document.getElementById('chatLogoutBtn');

// --- Recaptcha Setup ---
window.recaptchaVerifier = new RecaptchaVerifier(
    auth,
    'recaptcha-container',
    {
        size: 'invisible',
        callback: () => { }
    }
);

// --- Auth State Listener ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        if(mainBox) mainBox.style.display = "none";
        if(chatSection) chatSection.style.display = "flex";
        userDisplay.innerText = user.email || user.phoneNumber;
        listenForMessages();
    } else {
        if(mainBox) mainBox.style.display = "block";
        if(chatSection) chatSection.style.display = "none";
    }
});

// --- Phone Auth Logic ---
window.sendOTP = function (phoneNumber) {
    const appVerifier = window.recaptchaVerifier;
    signInWithPhoneNumber(auth, phoneNumber, appVerifier)
        .then((confirmationResult) => {
            window.confirmationResult = confirmationResult;
            Swal.fire({
                title: 'Phone Verification',
                text: 'Enter the 6-digit OTP sent to your phone',
                input: 'text',
                inputAttributes: { maxlength: 6 },
                showCancelButton: true,
                confirmButtonText: 'Verify OTP',
                confirmButtonColor: '#ff0000',
                background: '#0a0a0a',
                color: '#ffd700'
            }).then((result) => {
                if (result.value) {
                    verifyOTP(result.value);
                }
            });
        })
        .catch((error) => {
            Swal.fire({
                icon: 'error',
                title: 'SMS Error',
                text: error.message,
                background: '#111',
                color: '#fff'
            });
        });
};

function verifyOTP(code) {
    window.confirmationResult.confirm(code)
        .then(() => {
            Swal.fire({
                icon: 'success',
                title: 'Phone Verified!',
                background: '#111',
                color: '#fff'
            });
        })
        .catch(() => {
            Swal.fire({
                icon: 'error',
                title: 'Invalid OTP',
                background: '#111',
                color: '#fff'
            });
        });
}

// --- UI Slider Logic ---
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

// --- Signup Logic ---
signUpForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const contact = document.getElementById('signUpContact').value.trim();
    const password = document.getElementById('signUpPassword').value;

    Swal.fire({
        title: 'Processing...',
        background: '#000',
        color: '#fff',
        didOpen: () => Swal.showLoading()
    });

    if (contact.includes('@')) {
        createUserWithEmailAndPassword(auth, contact, password)
            .then(() => {
                sendEmailVerification(auth.currentUser);
                Swal.fire({
                    icon: 'warning',
                    title: 'Email Verification Required',
                    text: 'Verification link sent to your email.',
                    background: '#111',
                    color: '#fff'
                });
                signUpForm.reset();
            })
            .catch((error) => {
                Swal.fire({ icon: 'error', title: 'Signup Error', text: error.message, background: '#111', color: '#fff' });
            });
        return;
    }

    let phone = contact.replace(/\D/g, '');
    if (!phone.startsWith('92')) phone = '92' + phone;
    phone = '+' + phone;
    window.sendOTP(phone);
});

// --- Sign-in Logic ---
signInForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const contact = document.getElementById('signInContact').value.trim();
    const password = document.getElementById('signInPassword').value;

    Swal.fire({
        title: 'Authenticating...',
        background: '#000',
        color: '#fff',
        didOpen: () => Swal.showLoading()
    });

    if (contact.includes('@')) {
        signInWithEmailAndPassword(auth, contact, password)
            .then((userCredential) => {
                if (userCredential.user.emailVerified) {
                    Swal.fire({ icon: 'success', title: 'Login Successful!', background: '#111', color: '#fff' });
                } else {
                    Swal.fire({ icon: 'error', title: 'Email Not Verified', text: 'Check your inbox.', background: '#111', color: '#fff' });
                    signOut(auth);
                }
            })
            .catch((err) => {
                Swal.fire({ icon: 'error', title: 'Login Failed', text: err.message, background: '#111', color: '#fff' });
            });
    } else {
        let phone = contact.replace(/\D/g, '');
        if (!phone.startsWith('92')) phone = '92' + phone;
        phone = '+' + phone;
        window.sendOTP(phone);
    }
});

// --- CRUD: Create Message ---
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    const text = messageInput.value.trim();

    if (text !== "" && auth.currentUser) {
        try {
            await addDoc(collection(db, "chats"), {
                message: text,
                senderId: auth.currentUser.uid,
                senderName: auth.currentUser.email || auth.currentUser.phoneNumber,
                createdAt: serverTimestamp()
            });
            messageInput.value = "";
            messageInput.focus(); 
        } catch (error) {
            console.error("Database Error: ", error);
            Swal.fire({
                icon: 'error',
                title: 'Message Not Sent',
                text: 'Check Firebase Rules or Internet Connection',
                background: '#111',
                color: '#fff'
            });
        }
    }
});

// --- CRUD: Read Messages ---
function listenForMessages() {
    const q = query(collection(db, "chats"), orderBy("createdAt", "asc"));

    onSnapshot(q, (snapshot) => {
        messagesBox.innerHTML = ""; 
        snapshot.forEach((doc) => {
            const data = doc.data();
            displaySingleMessage(doc.id, data);
        });
        messagesBox.scrollTo(0, messagesBox.scrollHeight);
    }, (error) => {
        console.error("Listener Error: ", error);
    });
}

// --- Display Message with Hover Icons (EDIT & DELETE) ---
function displaySingleMessage(id, data) {
    const messageDiv = document.createElement('div');
    const isMine = auth.currentUser && data.senderId === auth.currentUser.uid;

    messageDiv.classList.add('msg');
    messageDiv.classList.add(isMine ? 'sent' : 'received');
    messageDiv.style.position = "relative"; // Icons ki position ke liye

    const nameToShow = data.senderName ? data.senderName.split('@')[0] : "User";
    
    // Message Body
    messageDiv.innerHTML = `
        <small style="color: #ffd700; font-size: 10px; font-weight: bold;">${nameToShow}</small>
        <div class="msg-content" style="margin-top: 5px; color: white;">${data.message}</div>
    `;

    // Agar message mera hai toh Edit/Delete options dikhao
    if (isMine) {
        // Icons Container (Default hidden)
        const actionIcons = document.createElement('div');
        actionIcons.style.cssText = `
            position: absolute;
            top: -15px;
            right: 0;
            display: none;
            gap: 10px;
            background: rgba(0,0,0,0.8);
            padding: 5px 10px;
            border-radius: 20px;
            border: 1px solid #ff0000;
            z-index: 10;
        `;

        // Delete Icon
        const delIcon = document.createElement('span');
        delIcon.innerHTML = "🗑️";
        delIcon.style.cursor = "pointer";
        delIcon.title = "Delete";
        delIcon.onclick = () => deleteMessage(id);

        // Edit Icon
        const editIcon = document.createElement('span');
        editIcon.innerHTML = "✏️";
        editIcon.style.cursor = "pointer";
        editIcon.title = "Edit";
        editIcon.onclick = () => editMessage(id, data.message);

        actionIcons.appendChild(editIcon);
        actionIcons.appendChild(delIcon);
        messageDiv.appendChild(actionIcons);

        // Hover Effect
        messageDiv.onmouseenter = () => actionIcons.style.display = "flex";
        messageDiv.onmouseleave = () => actionIcons.style.display = "none";
    }

    messagesBox.appendChild(messageDiv);
}

// --- CRUD: DELETE Function ---
async function deleteMessage(id) {
    const result = await Swal.fire({
        title: 'Delete Message?',
        text: "Yeh wapas nahi ayega!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ff0000',
        confirmButtonText: 'Yes, delete!',
        background: '#0a0a0a',
        color: '#fff'
    });

    if (result.isConfirmed) {
        await deleteDoc(doc(db, "chats", id));
    }
}

// --- CRUD: UPDATE (EDIT) Function ---
async function editMessage(id, oldMessage) {
    const { value: newMessage } = await Swal.fire({
        title: 'Edit Your Message',
        input: 'text',
        inputValue: oldMessage,
        showCancelButton: true,
        confirmButtonColor: '#ff0000',
        background: '#0a0a0a',
        color: '#fff',
        inputValidator: (value) => {
            if (!value) return 'Kuch toh likho bhai!'
        }
    });

    if (newMessage && newMessage !== oldMessage) {
        try {
            const msgRef = doc(db, "chats", id);
            await updateDoc(msgRef, {
                message: newMessage,
                lastEdit: serverTimestamp()
            });
        } catch (error) {
            console.error("Update Error: ", error);
        }
    }
}

// --- Logout Logic ---
if (chatLogoutBtn) {
    chatLogoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            Swal.fire({ icon: 'success', title: 'Logged Out', background: '#111', color: '#fff' });
        });
    });
}

// Reset Password Logic
if (forgotPassLink) {
    forgotPassLink.addEventListener('click', (e) => {
        e.preventDefault();
        Swal.fire({
            title: 'Reset Password',
            input: 'email',
            background: '#111',
            color: '#fff',
            confirmButtonColor: '#ff0000'
        }).then((result) => {
            if (result.value) {
                sendPasswordResetEmail(auth, result.value);
            }
        });
    });
}