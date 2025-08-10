import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query, addDoc, serverTimestamp, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    // Your Firebase config details here
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
    // --- State Variables ---
    let userId = null;
    let userProfileData = { weight: 150 }; // Default weight
    let dailyCaloriesBurned = { workouts: 0, steps: 0 };
    let charts = {};
    let unsubscribers = [];

    // --- DOM Elements ---
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const navLinks = document.querySelectorAll('.nav-link');
    const pageContents = document.querySelectorAll('.page-content');

    // --- Mobile Navigation ---
    mobileMenuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('open');
    });
    mainContent.addEventListener('click', () => {
        sidebar.classList.remove('open');
    });


    // --- Page Navigation ---
    function showPage(targetId) {
        // Hide all pages
        pageContents.forEach(page => page.classList.remove('active'));
        // Deactivate all nav links
        navLinks.forEach(link => link.classList.remove('active'));

        // Show target page
        const targetPage = document.getElementById(`${targetId}-content`);
        if (targetPage) targetPage.classList.add('active');

        // Activate nav link
        const targetLink = document.getElementById(`nav-${targetId}`);
        if (targetLink) targetLink.classList.add('active');

        sidebar.classList.remove('open'); // Close sidebar on navigation
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.id.replace('nav-', '');
            if (pageId !== 'logo' && pageId !== 'sign-out-btn') {
                showPage(pageId);
            }
        });
    });
    document.getElementById('nav-logo').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('dashboard');
    });


    // --- Authentication ---
    onAuthStateChanged(auth, user => {
        if (user) {
            userId = user.uid;
            loginContainer.classList.remove('active');
            appContainer.classList.add('active');
            setupListeners(userId);
            showPage('dashboard');
        } else {
            userId = null;
            appContainer.classList.remove('active');
            loginContainer.classList.add('active');
            unsubscribers.forEach(unsub => unsub());
            unsubscribers = [];
        }
    });

    const handleAuthAction = async (action, email, password, errorEl, username) => {
        errorEl.textContent = '';
        try {
            const userCredential = await action(auth, email, password);
            if (action === createUserWithEmailAndPassword) {
                const userId = userCredential.user.uid;
                // Create a public profile and a private user data doc
                await setDoc(doc(db, "profiles", userId), { username, email, workoutCount: 0, totalSteps: 0 });
                await setDoc(doc(db, "users", userId, "profile", "data"), {
                    username, email,
                    weight: 0, height: 0, age: 0,
                    gender: 'Male', bio: '', fitnessLevel: 'Beginner',
                    streak: 0, achievements: [], personalBests: {},
                    profilePicUrl: `https://placehold.co/96x96/1e293b/FFF?text=${username.charAt(0).toUpperCase()}`
                });
            }
        } catch (error) {
            errorEl.textContent = error.message.replace('Firebase: ', '');
        }
    };

    document.getElementById('login-btn').addEventListener('click', () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        handleAuthAction(signInWithEmailAndPassword, email, password, document.getElementById('login-error'));
    });

    document.getElementById('signup-btn').addEventListener('click', () => {
        const username = document.getElementById('signup-username').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const errorEl = document.getElementById('signup-error');
        if (!username) {
            errorEl.textContent = "Please enter a username.";
            return;
        }
        handleAuthAction(createUserWithEmailAndPassword, email, password, errorEl, username);
    });

    document.getElementById('sign-out-btn').addEventListener('click', () => signOut(auth));

    // --- Firestore Listeners Setup ---
    function setupListeners(uid) {
        // Clear previous listeners
        unsubscribers.forEach(unsub => unsub());
        unsubscribers = [];

        const addListener = (q, callback) => unsubscribers.push(onSnapshot(q, callback));

        addListener(doc(db, "users", uid, "profile", "data"), snapshot => {
            userProfileData = snapshot.data() || { weight: 150 };
            updateProfileUI(userProfileData);
        });

        addListener(query(collection(db, "users", uid, "workouts")), snapshot => {
            const workouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(w => w.timestamp)
                .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
            renderWorkouts(workouts);
            updateDashboardWorkouts(workouts);
            calculateStreak(workouts);
        });
        
        addListener(query(collection(db, "users", uid, "steps")), snapshot => {
            const steps = snapshot.docs.map(doc => doc.data());
            updateDashboardSteps(steps);
        });
        
        addListener(query(collection(db, "users", uid, "nutrition")), snapshot => {
            const meals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderMeals(meals);
            updateDashboardCaloriesFromMeals(meals);
            renderMacroChart(meals);
        });

        addListener(query(collection(db, "users", uid, "water")), snapshot => {
            const waterLogs = snapshot.docs.map(doc => doc.data());
            updateWaterIntake(waterLogs);
        });

        addListener(query(collection(db, "users", uid, "progress")), snapshot => {
            const progressData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);
            renderProgressCharts(progressData);
        });
        
        addListener(query(collection(db, "profiles")), snapshot => {
            const profiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderLeaderboard(profiles);
        });
    }
    
    // --- UI Update & Rendering Functions ---
    
    function updateProfileUI(profile) {
        document.getElementById('welcome-message').textContent = `Welcome, ${profile.username}!`;
        document.getElementById('profile-username').textContent = profile.username;
        document.getElementById('profile-fitness-level').textContent = profile.fitnessLevel || 'N/A';
        document.getElementById('profile-bio').textContent = profile.bio || 'No bio set.';
        document.getElementById('profile-streak-display').textContent = profile.streak || 0;
        
        const profilePics = [document.getElementById('profile-pic-nav'), document.getElementById('profile-pic-main')];
        profilePics.forEach(el => el.src = profile.profilePicUrl || `https://placehold.co/96x96/1e293b/FFF?text=${profile.username.charAt(0).toUpperCase()}`);

        // Settings page
        document.getElementById('profile-bio-input').value = profile.bio || '';
        document.getElementById('fitness-level').value = profile.fitnessLevel || 'Beginner';
        document.getElementById('user-gender-select').value = profile.gender || 'Male';
        document.getElementById('user-weight-input').value = profile.weight || '';
        document.getElementById('user-height-input').value = profile.height || '';
        document.getElementById('user-age-input').value = profile.age || '';
    }

    function renderWorkouts(workouts) {
        const workoutListEl = document.getElementById('workout-list');
        const totalWorkoutsEl = document.getElementById('total-workouts');
        const totalTimeEl = document.getElementById('total-time');
        const totalCaloriesEl = document.getElementById('total-calories-burned-workouts');

        totalWorkoutsEl.textContent = workouts.length;
        totalTimeEl.textContent = workouts.reduce((sum, w) => sum + (w.duration || 0), 0);
        totalCaloriesEl.textContent = workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
        
        workoutListEl.innerHTML = workouts.length === 0 
            ? `<tr><td colspan="5" class="text-center p-8 text-gray-500">No workouts logged yet.</td></tr>`
            : workouts.map(w => `
                <tr class="border-b border-gray-800 hover:bg-gray-800">
                    <td class="p-4">${new Date(w.timestamp.seconds * 1000).toLocaleDateString()}</td>
                    <td class="p-4 font-semibold">${w.type}</td>
                    <td class="p-4">${w.duration} min</td>
                    <td class="p-4 text-red-400">${w.caloriesBurned}</td>
                    <td class="p-4 text-gray-400">${w.notes || ''}</td>
                </tr>`).join('');
    }

    function renderMeals(meals) {
        const mealListEl = document.getElementById('meal-list');
        const today = new Date().toDateString();
        const todayMeals = meals.filter(m => new Date(m.timestamp.seconds * 1000).toDateString() === today);

        mealListEl.innerHTML = todayMeals.length === 0
            ? `<li class="text-center p-8 text-gray-500">No meals logged today.</li>`
            : todayMeals.map(m => `
                <li class="bg-gray-800 p-4 rounded-lg">
                    <p class="font-semibold">${m.name}</p>
                    <p class="text-sm text-gray-400">${m.calories} kcal - P:${m.protein}g, C:${m.carbs}g, F:${m.fat}g</p>
                </li>`).join('');
    }

    function renderLeaderboard(profiles) {
        const workoutLeaderboardBody = document.getElementById('leaderboard-body-workouts');
        const stepsLeaderboardBody = document.getElementById('leaderboard-body-steps');

        const renderTable = (bodyEl, data, key, unit) => {
            const sortedData = [...data].sort((a, b) => (b[key] || 0) - (a[key] || 0));
            bodyEl.innerHTML = sortedData.slice(0, 10).map((p, index) => `
                <tr class="border-b border-gray-800">
                    <td class="p-4 w-16 text-center font-bold">${index + 1}</td>
                    <td class="p-4 font-semibold">${p.username}</td>
                    <td class="p-4 text-cyan-400 font-bold">${p[key] || 0} ${unit}</td>
                </tr>
            `).join('');
        };

        renderTable(workoutLeaderboardBody, profiles, 'workoutCount', 'workouts');
        renderTable(stepsLeaderboardBody, profiles, 'totalSteps', 'steps');
    }

    // --- Dashboard Updates ---
    const toDateString = (d) => d.toISOString().split('T')[0];
    const isToday = (d) => toDateString(new Date(d.seconds * 1000)) === toDateString(new Date());

    function updateDashboardWorkouts(workouts) {
        const todayWorkouts = workouts.filter(w => w.timestamp && isToday(w.timestamp));
        dailyCaloriesBurned.workouts = todayWorkouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
        updateTotalCaloriesBurned();
        renderWeeklyActivityChart(workouts);
    }
    
    function updateDashboardSteps(steps) {
        const todaySteps = steps.filter(s => s.timestamp && isToday(s.timestamp));
        const totalSteps = todaySteps.reduce((sum, s) => sum + (s.amount || 0), 0);
        document.getElementById('steps-taken').textContent = totalSteps;
        dailyCaloriesBurned.steps = totalSteps * 0.04; // avg calories per step
        updateTotalCaloriesBurned();
    }

    function updateDashboardCaloriesFromMeals(meals) {
        const todayMeals = meals.filter(m => m.timestamp && isToday(m.timestamp));
        const totalCalories = todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
        document.getElementById('calories-consumed').textContent = totalCalories;
    }
    
    function updateWaterIntake(logs) {
        const todayLogs = logs.filter(l => l.timestamp && isToday(l.timestamp));
        const total = todayLogs.reduce((sum, l) => sum + (l.amount || 0), 0);
        document.getElementById('water-intake').textContent = `${(total / 1000).toFixed(1)}/2L`;
    }

    function updateTotalCaloriesBurned() {
        const total = Math.round(dailyCaloriesBurned.workouts + dailyCaloriesBurned.steps);
        document.getElementById('total-calories-burned-dash').textContent = total;
    }

    // --- Charting Functions ---
    function createOrUpdateChart(id, type, data, options) {
        const ctx = document.getElementById(id).getContext('2d');
        if (charts[id]) {
            charts[id].data = data;
            charts[id].options = options;
            charts[id].update();
        } else {
            charts[id] = new Chart(ctx, { type, data, options });
        }
    }

    function renderProgressCharts(progressData) {
        const weightData = progressData.filter(d => d.weight);
        const bodyfatData = progressData.filter(d => d.bodyfat);
        const chartOptions = { plugins: { legend: { display: false } }, scales: { y: { ticks: { color: '#9ca3af' } }, x: { ticks: { color: '#9ca3af' } } } };

        createOrUpdateChart('weight-chart', 'line', {
            labels: weightData.map(d => new Date(d.timestamp.seconds * 1000).toLocaleDateString()),
            datasets: [{ data: weightData.map(d => d.weight), borderColor: '#3b82f6', tension: 0.2 }]
        }, chartOptions);

        createOrUpdateChart('bodyfat-chart', 'line', {
            labels: bodyfatData.map(d => new Date(d.timestamp.seconds * 1000).toLocaleDateString()),
            datasets: [{ data: bodyfatData.map(d => d.bodyfat), borderColor: '#16a34a', tension: 0.2 }]
        }, chartOptions);
    }

    function renderMacroChart(meals) {
        const todayMeals = meals.filter(m => m.timestamp && isToday(m.timestamp));
        const macros = todayMeals.reduce((acc, meal) => {
            acc.protein += meal.protein || 0;
            acc.carbs += meal.carbs || 0;
            acc.fat += meal.fat || 0;
            return acc;
        }, { protein: 0, carbs: 0, fat: 0 });

        createOrUpdateChart('macro-chart', 'doughnut', {
            labels: ['Protein (g)', 'Carbs (g)', 'Fat (g)'],
            datasets: [{
                data: [macros.protein, macros.carbs, macros.fat],
                backgroundColor: ['#3b82f6', '#16a34a', '#ef4444'],
                borderWidth: 0
            }]
        }, { plugins: { legend: { position: 'bottom', labels: { color: '#9ca3af' } } } });
    }

    function renderWeeklyActivityChart(workouts) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weeklyData = Array(7).fill(0);
        const today = new Date();
        const startOfWeek = today.getDate() - today.getDay();
        
        workouts.forEach(w => {
            const workoutDate = new Date(w.timestamp.seconds * 1000);
            if (workoutDate >= new Date(today.setDate(startOfWeek))) {
                weeklyData[workoutDate.getDay()] += w.duration || 0;
            }
        });

        createOrUpdateChart('weekly-activity-chart', 'bar', {
            labels: days,
            datasets: [{
                label: 'Minutes',
                data: weeklyData,
                backgroundColor: '#3b82f6',
                borderRadius: 4
            }]
        }, { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: '#9ca3af' } }, x: { ticks: { color: '#9ca3af' } } } });
    }
    
    // --- Gamification ---
    async function calculateStreak(workouts) {
        if (workouts.length === 0) return;
        const workoutDays = [...new Set(workouts.map(w => toDateString(new Date(w.timestamp.seconds * 1000))))].sort((a,b) => b.localeCompare(a));
        
        let streak = 0;
        const todayStr = toDateString(new Date());
        const yesterdayStr = toDateString(new Date(Date.now() - 86400000));

        if (workoutDays[0] === todayStr || workoutDays[0] === yesterdayStr) {
            streak = 1;
            for (let i = 0; i < workoutDays.length - 1; i++) {
                const currentDay = new Date(workoutDays[i]);
                const prevDay = new Date(workoutDays[i+1]);
                if ((currentDay - prevDay) / 86400000 === 1) {
                    streak++;
                } else {
                    break;
                }
            }
        }
        await setDoc(doc(db, "users", userId, "profile", "data"), { streak }, { merge: true });
    }

    // --- Modal Handling ---
    function setupModal(openBtnIds, modalId, closeBtnId, saveBtnId, saveAction, resetAction) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        const openModal = () => modal.style.display = 'flex';
        const closeModal = () => {
            modal.style.display = 'none';
            if(resetAction) resetAction();
        };

        openBtnIds.forEach(id => document.getElementById(id)?.addEventListener('click', openModal));
        document.getElementById(closeBtnId)?.addEventListener('click', closeModal);
        if(saveBtnId) document.getElementById(saveBtnId)?.addEventListener('click', async () => {
            await saveAction();
            closeModal();
        });
    }
    
    // Workout Modal
    setupModal(['log-workout-btn', 'add-workout-page-btn'], 'workout-modal', 'close-workout-modal-btn', 'save-workout-btn', 
        async () => {
            const type = document.getElementById('workout-type-select').value;
            const duration = parseInt(document.getElementById('workout-duration-input').value);
            const manualCalories = document.getElementById('workout-calories-input').value;
            
            if (!type || !duration) return;

            const caloriesBurned = manualCalories ? parseInt(manualCalories) : Math.round(( ( { 'Cardio': 7, 'Strength': 4, 'Yoga': 2.5, 'Running': 11, 'Walking': 3.5, 'Jogging': 7, 'Swimming': 8 }[type] || 5 ) * 3.5 * (userProfileData.weight / 2.2)) / 200 * duration);
            
            let workoutData = {
                type, duration, caloriesBurned,
                notes: document.getElementById('workout-notes-input').value,
                timestamp: serverTimestamp()
            };
            
            if (type === 'Strength') {
                workoutData.exerciseName = document.getElementById('exercise-name-input').value;
                workoutData.weight = parseInt(document.getElementById('exercise-weight-input').value);
                workoutData.reps = parseInt(document.getElementById('exercise-reps-input').value);
            }
            await addDoc(collection(db, "users", userId, "workouts"), workoutData);
        },
        () => { // Reset form
            document.getElementById('workout-modal').querySelector('form')?.reset();
            document.getElementById('strength-inputs').classList.add('hidden');
        }
    );
    document.getElementById('workout-type-select').addEventListener('change', (e) => {
        document.getElementById('strength-inputs').classList.toggle('hidden', e.target.value !== 'Strength');
    });

    // --- Other Event Listeners ---
    document.getElementById('save-settings-btn').addEventListener('click', async () => {
        const profileData = {
            bio: document.getElementById('profile-bio-input').value,
            fitnessLevel: document.getElementById('fitness-level').value,
            gender: document.getElementById('user-gender-select').value,
            weight: parseFloat(document.getElementById('user-weight-input').value) || 0,
            height: parseInt(document.getElementById('user-height-input').value) || 0,
            age: parseInt(document.getElementById('user-age-input').value) || 0,
        };
        await setDoc(doc(db, "users", userId, "profile", "data"), profileData, { merge: true });
        alert("Settings Saved!");
    });
    
    document.getElementById('log-weight-btn').addEventListener('click', () => {
        const weight = parseFloat(document.getElementById('weight-input').value);
        if(weight) addDoc(collection(db, "users", userId, "progress"), { weight, timestamp: serverTimestamp() });
    });
    
    document.getElementById('log-bodyfat-btn').addEventListener('click', () => {
        const bodyfat = parseFloat(document.getElementById('bodyfat-input').value);
        if(bodyfat) addDoc(collection(db, "users", userId, "progress"), { bodyfat, timestamp: serverTimestamp() });
    });

    // Leaderboard Tabs
    const workoutTab = document.getElementById('leaderboard-tab-workouts');
    const stepsTab = document.getElementById('leaderboard-tab-steps');
    const workoutContent = document.getElementById('leaderboard-workouts-content');
    const stepsContent = document.getElementById('leaderboard-steps-content');

    workoutTab.addEventListener('click', () => {
        workoutTab.classList.add('active');
        stepsTab.classList.remove('active');
        workoutContent.style.display = 'block';
        stepsContent.style.display = 'none';
    });
    stepsTab.addEventListener('click', () => {
        stepsTab.classList.add('active');
        workoutTab.classList.remove('active');
        stepsContent.style.display = 'block';
        workoutContent.style.display = 'none';
    });

    // --- Initial Load ---
    showPage('dashboard');
    setMotivationalQuote();
    
    function setMotivationalQuote() {
        const quotes = [
            "The only bad workout is the one that didn't happen.",
            "Success isn't always about greatness. It's about consistency.",
            "Your body can stand almost anything. It’s your mind that you have to convince."
        ];
        document.getElementById('motivational-quote').textContent = quotes[Math.floor(Math.random() * quotes.length)];
    }
});
