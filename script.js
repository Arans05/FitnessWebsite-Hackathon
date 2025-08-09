import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDqQGsIz-mnJiMNZmkM0gL5eOhQV6jTAh0",
  authDomain: "fitnessapp-721d9.firebaseapp.com",
  projectId: "fitnessapp-721d9",
  storageBucket: "fitnessapp-721d9.appspot.com",
  messagingSenderId: "339656705043",
  appId: "1:339656705043:web:b5dbd141d09398014a2be6",
  measurementId: "G-XFQYPFN6GR"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const userEmailDisplay = document.getElementById('user-email-display');
    const userEmailDisplayMobile = document.getElementById('user-email-display-mobile');
    const profileDropdown = document.getElementById('profile-dropdown');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenuOpenIcon = document.getElementById('mobile-menu-open-icon');
    const mobileMenuCloseIcon = document.getElementById('mobile-menu-close-icon');
    const welcomeMessage = document.getElementById('welcome-message');
    const motivationalQuoteEl = document.getElementById('motivational-quote');

    const pages = ['dashboard', 'workouts', 'progress', 'nutrition'];
    let userId = null;

    function showPage(pageId) {
        pages.forEach(page => {
            document.getElementById(`${page}-content`).classList.remove('active');
            document.getElementById(`nav-${page}`).classList.remove('active');
            document.getElementById(`mobile-nav-${page}`)?.classList.remove('active');
        });
        document.getElementById(`${pageId}-content`).classList.add('active');
        document.getElementById(`nav-${pageId}`).classList.add('active');
        document.getElementById(`mobile-nav-${pageId}`)?.classList.add('active');
    }

    pages.forEach(pageId => {
        document.getElementById(`nav-${pageId}`).addEventListener('click', (e) => {
            e.preventDefault();
            showPage(pageId);
        });
        document.getElementById(`mobile-nav-${pageId}`)?.addEventListener('click', (e) => {
            e.preventDefault();
            showPage(pageId);
            mobileMenu.classList.add('hidden');
            mobileMenuOpenIcon.classList.remove('hidden');
            mobileMenuCloseIcon.classList.add('hidden');
        });
    });

    document.getElementById('nav-logo').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('dashboard');
    });

    onAuthStateChanged(auth, (user) => {
        if (user) {
            userId = user.uid;
            if (userEmailDisplay) userEmailDisplay.textContent = user.email;
            if (userEmailDisplayMobile) userEmailDisplayMobile.textContent = user.email;
            if (welcomeMessage) welcomeMessage.textContent = `Hi ${user.email}, here’s your summary today.`;
            
            loginContainer.classList.remove('active');
            appContainer.classList.add('active');
            showPage('dashboard');
            setMotivationalQuote();
            loadDashboardData();
        } else {
            userId = null;
            appContainer.classList.remove('active');
            loginContainer.classList.add('active');
        }
    });

    async function loadDashboardData() {
        if (!userId) return;
        try {
            const workoutsQuery = query(collection(db, "users", userId, "workouts"));
            const waterQuery = query(collection(db, "users", userId, "water"));

            const [workoutsSnapshot, waterSnapshot] = await Promise.all([
                getDocs(workoutsQuery),
                getDocs(waterQuery)
            ]);

            updateDashboardWorkouts(workoutsSnapshot.docs.map(doc => doc.data()));
            updateWaterIntake(waterSnapshot.docs.map(doc => doc.data()));
        } catch (error) {
            console.error("Error loading dashboard data:", error);
        }
    }

    function updateDashboardWorkouts(workouts) {
        const sortedWorkouts = workouts.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        const statusEl = document.getElementById('workout-status');
        if (!statusEl) return;

        if (sortedWorkouts.length > 0) {
            const last = sortedWorkouts[0];
            const date = new Date(last.timestamp?.seconds * 1000).toLocaleDateString();
            if (date === new Date().toLocaleDateString()) {
                statusEl.textContent = `Yes (${last.duration} min)`;
            } else {
                statusEl.textContent = 'No';
            }
        } else {
            statusEl.textContent = 'No';
        }
    }

    function updateWaterIntake(logs) {
        const total = logs
            .filter(l => new Date(l.timestamp?.seconds * 1000).toLocaleDateString() === new Date().toLocaleDateString())
            .reduce((sum, l) => sum + (l.amount || 0), 0);
        
        document.getElementById('water-intake').textContent = `${total} / 64 oz`;
    }

    function setMotivationalQuote() {
        const quotes = ["The only bad workout is the one that didn't happen.", "Success isn't always about greatness. It's about consistency.", "Your body can stand almost anything. It’s your mind that you have to convince."];
        if (motivationalQuoteEl) {
            motivationalQuoteEl.textContent = quotes[Math.floor(Math.random() * quotes.length)];
        }
    }

    document.getElementById('user-menu-button').addEventListener('click', () => {
        profileDropdown.classList.toggle('hidden');
    });

    mobileMenuButton.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
        mobileMenuOpenIcon.classList.toggle('hidden');
        mobileMenuCloseIcon.classList.toggle('hidden');
    });

    document.getElementById('show-signup').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('login-form').style.display = 'none'; document.getElementById('signup-form').style.display = 'block'; });
    document.getElementById('show-login').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('signup-form').style.display = 'none'; document.getElementById('login-form').style.display = 'block'; });

    const handleAuthAction = async (action, email, password, errorEl) => {
        errorEl.textContent = '';
        try {
            await action(auth, email, password);
        } catch (error) { 
            errorEl.textContent = error.message; 
        }
    };

    document.getElementById('login-btn').addEventListener('click', () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        handleAuthAction(signInWithEmailAndPassword, email, password, errorEl);
    });

    document.getElementById('signup-btn').addEventListener('click', () => {
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const errorEl = document.getElementById('signup-error');
        handleAuthAction(createUserWithEmailAndPassword, email, password, errorEl);
    });

    document.getElementById('sign-out-btn').addEventListener('click', () => signOut(auth));
    document.getElementById('sign-out-btn-mobile').addEventListener('click', () => signOut(auth));
});
