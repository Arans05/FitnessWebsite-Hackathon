import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
    const workoutModal = document.getElementById('workout-modal');
    const mealModal = document.getElementById('meal-modal');
    const waterModal = document.getElementById('water-modal');

    const pages = ['dashboard', 'workouts', 'progress', 'nutrition'];
    let userId = null;
    let unsubscribeWorkouts, unsubscribeNutrition, unsubscribeWater, unsubscribeProgress;
    let weightChart, bodyfatChart;

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
            setupListeners();
        } else {
            userId = null;
            appContainer.classList.remove('active');
            loginContainer.classList.add('active');
            if (unsubscribeWorkouts) unsubscribeWorkouts();
            if (unsubscribeNutrition) unsubscribeNutrition();
            if (unsubscribeWater) unsubscribeWater();
            if (unsubscribeProgress) unsubscribeProgress();
        }
    });

    function setupListeners() {
        if (!userId) return;
        
        const workoutsQuery = query(collection(db, "users", userId, "workouts"));
        unsubscribeWorkouts = onSnapshot(workoutsQuery, (snapshot) => {
            const workouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            renderWorkouts(workouts);
            updateDashboardWorkouts(workouts);
        });

        const nutritionQuery = query(collection(db, "users", userId, "nutrition"));
        unsubscribeNutrition = onSnapshot(nutritionQuery, (snapshot) => {
            const meals = snapshot.docs.map(doc => doc.data());
            updateDashboardCalories(meals);
        });

        const waterQuery = query(collection(db, "users", userId, "water"));
        unsubscribeWater = onSnapshot(waterQuery, (snapshot) => {
            const waterLogs = snapshot.docs.map(doc => doc.data());
            updateWaterIntake(waterLogs);
        });

        const progressQuery = query(collection(db, "users", userId, "progress"));
        unsubscribeProgress = onSnapshot(progressQuery, (snapshot) => {
            const progressData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
            renderProgressCharts(progressData);
        });
    }

    function renderWorkouts(workouts) {
        const workoutListEl = document.getElementById('workout-list');
        if (!workoutListEl) return;
        workoutListEl.innerHTML = workouts.length === 0 
            ? `<tr><td colspan="4" class="text-center p-4 text-gray-500">No workouts logged yet.</td></tr>` 
            : workouts.map(w => `
                <tr class="border-b border-gray-700 hover:bg-gray-700/50">
                    <td class="p-4">${new Date(w.timestamp?.seconds * 1000).toLocaleDateString()}</td>
                    <td class="p-4">${w.type || 'N/A'}</td>
                    <td class="p-4">${w.duration || 'N/A'} min</td>
                    <td class="p-4">${w.notes || ''}</td>
                </tr>`).join('');
    }

    function renderProgressCharts(progressData) {
        const weightData = progressData.filter(d => d.weight);
        const bodyfatData = progressData.filter(d => d.bodyfat);

        const weightLabels = weightData.map(d => new Date(d.timestamp?.seconds * 1000).toLocaleDateString());
        const weightValues = weightData.map(d => d.weight);

        const bodyfatLabels = bodyfatData.map(d => new Date(d.timestamp?.seconds * 1000).toLocaleDateString());
        const bodyfatValues = bodyfatData.map(d => d.bodyfat);

        if (weightChart) weightChart.destroy();
        const weightCtx = document.getElementById('weight-chart').getContext('2d');
        weightChart = new Chart(weightCtx, {
            type: 'line',
            data: {
                labels: weightLabels,
                datasets: [{
                    label: 'Weight (lbs)',
                    data: weightValues,
                    borderColor: 'rgb(59, 130, 246)',
                    tension: 0.1
                }]
            }
        });

        if (bodyfatChart) bodyfatChart.destroy();
        const bodyfatCtx = document.getElementById('bodyfat-chart').getContext('2d');
        bodyfatChart = new Chart(bodyfatCtx, {
            type: 'line',
            data: {
                labels: bodyfatLabels,
                datasets: [{
                    label: 'Body Fat %',
                    data: bodyfatValues,
                    borderColor: 'rgb(239, 68, 68)',
                    tension: 0.1
                }]
            }
        });
    }

    function updateDashboardWorkouts(workouts) {
        const statusEl = document.getElementById('workout-status');
        if (!statusEl) return;

        const todayWorkouts = workouts.filter(w => new Date(w.timestamp?.seconds * 1000).toLocaleDateString() === new Date().toLocaleDateString());

        if (todayWorkouts.length > 0) {
            const totalDuration = todayWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);
            statusEl.textContent = `Yes (${totalDuration} min)`;
        } else {
            statusEl.textContent = 'No';
        }
    }

    function updateDashboardCalories(meals) {
        const totalCalories = meals
            .filter(m => new Date(m.timestamp?.seconds * 1000).toLocaleDateString() === new Date().toLocaleDateString())
            .reduce((sum, m) => sum + (m.calories || 0), 0);
        document.getElementById('calories-burned').textContent = totalCalories;
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

    // Modal Handling
    document.getElementById('log-workout-btn').addEventListener('click', () => workoutModal.style.display = 'flex');
    document.getElementById('add-workout-page-btn').addEventListener('click', () => workoutModal.style.display = 'flex');
    document.getElementById('close-workout-modal-btn').addEventListener('click', () => workoutModal.style.display = 'none');
    
    document.getElementById('add-meal-btn').addEventListener('click', () => mealModal.style.display = 'flex');
    document.getElementById('close-meal-modal-btn').addEventListener('click', () => mealModal.style.display = 'none');

    document.getElementById('add-water-btn').addEventListener('click', () => waterModal.style.display = 'flex');
    document.getElementById('close-water-modal-btn').addEventListener('click', () => waterModal.style.display = 'none');

    document.getElementById('save-workout-btn').addEventListener('click', async () => {
        if (!userId) return;
        const type = document.getElementById('workout-type-input').value;
        const duration = document.getElementById('workout-duration-input').value;
        const notes = document.getElementById('workout-notes-input').value;

        if (type && duration) {
            try {
                await addDoc(collection(db, "users", userId, "workouts"), {
                    type,
                    duration: parseInt(duration),
                    notes,
                    timestamp: serverTimestamp()
                });
                document.getElementById('workout-type-input').value = '';
                document.getElementById('workout-duration-input').value = '';
                document.getElementById('workout-notes-input').value = '';
                workoutModal.style.display = 'none';
            } catch (error) {
                console.error("Error adding workout:", error);
            }
        }
    });

    document.getElementById('save-meal-btn').addEventListener('click', async () => {
        if (!userId) return;
        const name = document.getElementById('meal-name-input').value;
        const calories = document.getElementById('meal-calories-input').value;

        if (name && calories) {
            try {
                await addDoc(collection(db, "users", userId, "nutrition"), {
                    name,
                    calories: parseInt(calories),
                    timestamp: serverTimestamp()
                });
                document.getElementById('meal-name-input').value = '';
                document.getElementById('meal-calories-input').value = '';
                mealModal.style.display = 'none';
            } catch (error) {
                console.error("Error adding meal:", error);
            }
        }
    });

    document.getElementById('save-water-btn').addEventListener('click', async () => {
        if (!userId) return;
        const amount = document.getElementById('water-amount-input').value;

        if (amount) {
            try {
                await addDoc(collection(db, "users", userId, "water"), {
                    amount: parseInt(amount),
                    timestamp: serverTimestamp()
                });
                document.getElementById('water-amount-input').value = '';
                waterModal.style.display = 'none';
            } catch (error) {
                console.error("Error adding water:", error);
            }
        }
    });

    document.getElementById('log-weight-btn').addEventListener('click', async () => {
        if (!userId) return;
        const weight = document.getElementById('weight-input').value;
        if (weight) {
            try {
                await addDoc(collection(db, "users", userId, "progress"), {
                    weight: parseFloat(weight),
                    timestamp: serverTimestamp()
                });
                document.getElementById('weight-input').value = '';
            } catch (error) {
                console.error("Error logging weight:", error);
            }
        }
    });

    document.getElementById('log-bodyfat-btn').addEventListener('click', async () => {
        if (!userId) return;
        const bodyfat = document.getElementById('bodyfat-input').value;
        if (bodyfat) {
            try {
                await addDoc(collection(db, "users", userId, "progress"), {
                    bodyfat: parseFloat(bodyfat),
                    timestamp: serverTimestamp()
                });
                document.getElementById('bodyfat-input').value = '';
            } catch (error) {
                console.error("Error logging body fat:", error);
            }
        }
    });
});
