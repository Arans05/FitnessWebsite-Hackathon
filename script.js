import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query, addDoc, serverTimestamp, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
    // --- DOM Elements ---
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const userDisplay = document.getElementById('user-display');
    const userDisplayMobile = document.getElementById('user-display-mobile');
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
    const stepsModal = document.getElementById('steps-modal');

    const pages = ['dashboard', 'workouts', 'progress', 'nutrition', 'profile', 'community', 'settings'];
    let userId = null;
    let unsubscribeWorkouts, unsubscribeNutrition, unsubscribeWater, unsubscribeProgress, unsubscribeProfile, unsubscribeLeaderboard, unsubscribeSteps;
    let weightChart, bodyfatChart, macroChart;
    let dailyCaloriesBurned = { workouts: 0, steps: 0 };
    let userWeight = 150; // Default weight

    // --- Page Navigation ---
    function showPage(pageId) {
        pages.forEach(page => {
            document.getElementById(`${page}-content`)?.classList.remove('active');
            document.getElementById(`nav-${page}`)?.classList.remove('active');
            document.getElementById(`mobile-nav-${page}`)?.classList.remove('active');
        });
        document.getElementById(`${pageId}-content`)?.classList.add('active');
        document.getElementById(`nav-${pageId}`)?.classList.add('active');
        document.getElementById(`mobile-nav-${pageId}`)?.classList.add('active');
    }

    pages.forEach(pageId => {
        document.getElementById(`nav-${pageId}`)?.addEventListener('click', (e) => {
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
    document.getElementById('nav-profile-dropdown').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('profile');
        profileDropdown.classList.add('hidden');
    });
    document.getElementById('nav-settings-dropdown').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('settings');
        profileDropdown.classList.add('hidden');
    });

    // --- Authentication ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userId = user.uid;
            const profileSnap = await getDoc(doc(db, "profiles", userId));
            const profileData = profileSnap.data() || {};
            const username = profileData.username || user.email;
            userWeight = profileData.weight || 150;

            if (userDisplay) userDisplay.textContent = username;
            if (userDisplayMobile) userDisplayMobile.textContent = username;
            if (welcomeMessage) welcomeMessage.textContent = `Hi ${username}, here’s your summary today.`;
            
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
            if (unsubscribeProfile) unsubscribeProfile();
            if (unsubscribeLeaderboard) unsubscribeLeaderboard();
            if (unsubscribeSteps) unsubscribeSteps();
        }
    });

    // --- Firestore Listeners ---
    function setupListeners() {
        if (!userId) return;
        
        const workoutsQuery = query(collection(db, "users", userId, "workouts"));
        unsubscribeWorkouts = onSnapshot(workoutsQuery, (snapshot) => {
            const workouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            renderWorkouts(workouts);
            updateDashboardWorkouts(workouts);
            checkAchievements({ workouts });
            updateLeaderboard(workouts.length);
            updateChallengeProgress(workouts);
            updatePersonalBests(workouts);
        });

        const nutritionQuery = query(collection(db, "users", userId, "nutrition"));
        unsubscribeNutrition = onSnapshot(nutritionQuery, (snapshot) => {
            const meals = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
            renderMeals(meals);
            updateDashboardCaloriesFromMeals(meals);
            renderMacroChart(meals);
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

        const profileDocRef = doc(db, "users", userId, "profile", "data");
        unsubscribeProfile = onSnapshot(profileDocRef, (snapshot) => {
            const profileData = snapshot.data() || {};
            renderAchievements(profileData.achievements || []);
            renderPersonalBests(profileData.personalBests || {});
            document.getElementById('user-weight-input').value = profileData.weight || '';
        });

        const leaderboardQuery = query(collection(db, "profiles"));
        unsubscribeLeaderboard = onSnapshot(leaderboardQuery, (snapshot) => {
            const profiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderLeaderboard(profiles);
        });

        const stepsQuery = query(collection(db, "users", userId, "steps"));
        unsubscribeSteps = onSnapshot(stepsQuery, (snapshot) => {
            const steps = snapshot.docs.map(doc => doc.data());
            updateDashboardSteps(steps);
        });
    }

    // --- Helper Functions ---
    const isToday = (date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    };

    // --- Rendering Functions ---
    function renderWorkouts(workouts) {
        const workoutListEl = document.getElementById('workout-list');
        if (!workoutListEl) return;
        workoutListEl.innerHTML = workouts.length === 0 
            ? `<tr><td colspan="5" class="text-center p-4 text-gray-500">No workouts logged yet.</td></tr>` 
            : workouts.map(w => `
                <tr class="border-b border-gray-700 hover:bg-gray-700/50">
                    <td class="p-4">${w.timestamp ? new Date(w.timestamp.seconds * 1000).toLocaleDateString() : 'Pending...'}</td>
                    <td class="p-4">${w.type || 'N/A'}</td>
                    <td class="p-4">${w.duration || 'N/A'} min</td>
                    <td class="p-4">${w.caloriesBurned || 'N/A'}</td>
                    <td class="p-4">${w.notes || ''}</td>
                </tr>`).join('');
    }

    function renderMeals(meals) {
        const mealListEl = document.getElementById('meal-list');
        if (!mealListEl) return;
        const todayMeals = meals.filter(m => m.timestamp && isToday(new Date(m.timestamp.seconds * 1000)))
            .sort((a,b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));

        mealListEl.innerHTML = todayMeals.length === 0
            ? `<li class="text-gray-500">No meals logged today.</li>`
            : todayMeals.map(m => `
                <li class="p-4 rounded-md bg-gray-700">
                    <p class="font-semibold text-white">${m.name}</p>
                    <p class="text-sm text-gray-400">${m.calories} kcal - P:${m.protein}g, C:${m.carbs}g, F:${m.fat}g</p>
                </li>`).join('');
    }

    function renderProgressCharts(progressData) {
        const weightData = progressData.filter(d => d.weight).sort((a,b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
        const bodyfatData = progressData.filter(d => d.bodyfat).sort((a,b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));

        const weightLabels = weightData.map(d => new Date(d.timestamp?.seconds * 1000).toLocaleDateString());
        const weightValues = weightData.map(d => d.weight);

        const bodyfatLabels = bodyfatData.map(d => new Date(d.timestamp?.seconds * 1000).toLocaleDateString());
        const bodyfatValues = bodyfatData.map(d => d.bodyfat);

        if (weightChart) weightChart.destroy();
        const weightCtx = document.getElementById('weight-chart').getContext('2d');
        weightChart = new Chart(weightCtx, {
            type: 'line',
            data: { labels: weightLabels, datasets: [{ label: 'Weight (lbs)', data: weightValues, borderColor: 'rgb(59, 130, 246)', tension: 0.1 }] }
        });

        if (bodyfatChart) bodyfatChart.destroy();
        const bodyfatCtx = document.getElementById('bodyfat-chart').getContext('2d');
        bodyfatChart = new Chart(bodyfatCtx, {
            type: 'line',
            data: { labels: bodyfatLabels, datasets: [{ label: 'Body Fat %', data: bodyfatValues, borderColor: 'rgb(239, 68, 68)', tension: 0.1 }] }
        });
    }
    
    function renderMacroChart(meals) {
        const todayMeals = meals.filter(m => m.timestamp && isToday(new Date(m.timestamp.seconds * 1000)));
        const totalProtein = todayMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
        const totalCarbs = todayMeals.reduce((sum, m) => sum + (m.carbs || 0), 0);
        const totalFat = todayMeals.reduce((sum, m) => sum + (m.fat || 0), 0);

        if (macroChart) macroChart.destroy();
        const macroCtx = document.getElementById('macro-chart').getContext('2d');
        macroChart = new Chart(macroCtx, {
            type: 'pie',
            data: {
                labels: ['Protein (g)', 'Carbs (g)', 'Fat (g)'],
                datasets: [{
                    data: [totalProtein, totalCarbs, totalFat],
                    backgroundColor: ['rgb(59, 130, 246)', 'rgb(239, 68, 68)', 'rgb(251, 191, 36)'],
                }]
            }
        });
    }

    function renderLeaderboard(profiles) {
        const leaderboardBody = document.getElementById('leaderboard-body');
        if (!leaderboardBody) return;
        const sortedProfiles = profiles.sort((a, b) => (b.workoutCount || 0) - (a.workoutCount || 0));
        leaderboardBody.innerHTML = sortedProfiles.map((p, index) => `
            <tr class="bg-gray-800 border-b border-gray-700">
                <td class="px-6 py-4 font-medium whitespace-nowrap">${index + 1}</td>
                <td class="px-6 py-4">${p.username || p.email}</td>
                <td class="px-6 py-4">${p.workoutCount || 0}</td>
            </tr>
        `).join('');
    }

    function updateDashboardWorkouts(workouts) {
        const statusEl = document.getElementById('workout-status');
        if (!statusEl) return;
        const todayWorkouts = workouts.filter(w => w.timestamp && isToday(new Date(w.timestamp.seconds * 1000)));
        if (todayWorkouts.length > 0) {
            const totalDuration = todayWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);
            statusEl.textContent = `Yes (${totalDuration} min)`;
        } else {
            statusEl.textContent = 'No';
        }
        calculateStreak(workouts);
        updateDashboardCaloriesFromWorkouts(workouts);
    }

    function updateTotalCaloriesBurned() {
        const total = Math.round(dailyCaloriesBurned.workouts + dailyCaloriesBurned.steps);
        const caloriesEl = document.getElementById('calories-burned');
        if (caloriesEl) {
            caloriesEl.textContent = total;
        }
    }

    function updateDashboardCaloriesFromMeals(meals) {
        const totalCalories = meals
            .filter(m => m.timestamp && isToday(new Date(m.timestamp.seconds * 1000)))
            .reduce((sum, m) => sum + (m.calories || 0), 0);
        const caloriesConsumedEl = document.getElementById('calories-consumed');
        if(caloriesConsumedEl) caloriesConsumedEl.textContent = totalCalories;
    }

    function updateDashboardCaloriesFromWorkouts(workouts) {
        const todayWorkouts = workouts.filter(w => w.timestamp && isToday(new Date(w.timestamp.seconds * 1000)));
        const totalCalories = todayWorkouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
        dailyCaloriesBurned.workouts = totalCalories;
        updateTotalCaloriesBurned();
    }

    function updateWaterIntake(logs) {
        const total = logs
            .filter(l => l.timestamp && isToday(new Date(l.timestamp.seconds * 1000)))
            .reduce((sum, l) => sum + (l.amount || 0), 0);
        document.getElementById('water-intake').textContent = `${total} / 2000 ml`;
    }
    
    function updateDashboardSteps(steps) {
        const stepsEl = document.getElementById('steps-taken');
        if (!stepsEl) return;
        
        const totalSteps = steps
            .filter(s => s.timestamp && isToday(new Date(s.timestamp.seconds * 1000)))
            .reduce((sum, s) => sum + (s.amount || 0), 0);
        
        stepsEl.textContent = totalSteps;
        dailyCaloriesBurned.steps = totalSteps * 0.04; // Approx. 0.04 calories per step
        updateTotalCaloriesBurned();
    }

    function setMotivationalQuote() {
        const quotes = ["The only bad workout is the one that didn't happen.", "Success isn't always about greatness. It's about consistency.", "Your body can stand almost anything. It’s your mind that you have to convince."];
        if (motivationalQuoteEl) {
            motivationalQuoteEl.textContent = quotes[Math.floor(Math.random() * quotes.length)];
        }
    }

    // --- Gamification ---
    function calculateStreak(workouts) {
        const validWorkouts = workouts.filter(w => w.timestamp && w.timestamp.seconds);
        if (validWorkouts.length === 0) {
            updateStreakDisplay(0);
            return;
        }

        const toDateString = (date) => date.toISOString().split('T')[0];
    
        const workoutDays = [...new Set(validWorkouts.map(w => toDateString(new Date(w.timestamp.seconds * 1000))))]
            .sort((a, b) => b.localeCompare(a));

        let streak = 0;
        const todayStr = toDateString(new Date());
        const yesterdayStr = toDateString(new Date(Date.now() - 86400000));

        if (workoutDays[0] === todayStr || workoutDays[0] === yesterdayStr) {
            streak = 1;
            for (let i = 0; i < workoutDays.length - 1; i++) {
                const currentDay = new Date(workoutDays[i]);
                const prevDay = new Date(workoutDays[i+1]);
                const expectedPrevDay = new Date(currentDay);
                expectedPrevDay.setDate(currentDay.getDate() - 1);

                if (toDateString(prevDay) === toDateString(expectedPrevDay)) {
                    streak++;
                } else {
                    break;
                }
            }
        }
        updateStreakDisplay(streak);
    }

    function updateStreakDisplay(streak) {
        document.getElementById('streak-display').textContent = streak;
        document.getElementById('profile-streak-display').textContent = streak;
    }

    const achievements = {
        FIRST_WORKOUT: { name: 'First Step', description: 'Log your first workout' },
        FIVE_WORKOUTS: { name: 'Getting Started', description: 'Log 5 workouts' },
    };

    async function checkAchievements(data) {
        if (!userId) return;
        const profileRef = doc(db, "users", userId, "profile", "data");
        const profileSnap = await getDoc(profileRef);
        const earnedAchievements = profileSnap.data()?.achievements || [];

        const newAchievements = [];

        // First Workout
        if (data.workouts.length >= 1 && !earnedAchievements.includes('FIRST_WORKOUT')) {
            newAchievements.push('FIRST_WORKOUT');
        }
        // Five Workouts
        if (data.workouts.length >= 5 && !earnedAchievements.includes('FIVE_WORKOUTS')) {
            newAchievements.push('FIVE_WORKOUTS');
        }

        if (newAchievements.length > 0) {
            await setDoc(profileRef, { achievements: [...earnedAchievements, ...newAchievements] }, { merge: true });
        }
    }

    function renderAchievements(earnedIds) {
        const container = document.getElementById('badges-display');
        if (!container) return;
        container.innerHTML = earnedIds.length === 0
            ? `<p class="text-gray-500 col-span-3">No achievements yet. Keep going!</p>`
            : earnedIds.map(id => {
                const achievement = achievements[id];
                return `
                    <div class="text-center" title="${achievement.description}">
                        <div class="text-4xl">🏆</div>
                        <p class="text-sm font-semibold">${achievement.name}</p>
                    </div>
                `;
            }).join('');
    }

    async function updateLeaderboard(workoutCount) {
        if (!userId) return;
        const profileRef = doc(db, "profiles", userId);
        const profileSnap = await getDoc(profileRef);
        const username = profileSnap.data()?.username || auth.currentUser.email;
        await setDoc(profileRef, { username, workoutCount }, { merge: true });
    }
    
    function updateChallengeProgress(workouts) {
        const challengeGoal = 120; // 120 minutes of cardio
        const today = new Date();
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        startOfWeek.setHours(0,0,0,0);

        const thisWeekCardio = workouts
            .filter(w => w.timestamp && w.timestamp.toDate() >= startOfWeek && w.type?.toLowerCase() === 'cardio')
            .reduce((sum, w) => sum + w.duration, 0);
        
        const progress = Math.min((thisWeekCardio / challengeGoal) * 100, 100);
        document.getElementById('challenge-progress-bar').style.width = `${progress}%`;
        document.getElementById('challenge-progress-text').textContent = `${thisWeekCardio} / ${challengeGoal} minutes`;
    }

    async function updatePersonalBests(workouts) {
        if (!userId) return;
        const strengthWorkouts = workouts.filter(w => w.type === 'Strength' && w.exerciseName && w.weight && w.reps);
        if (strengthWorkouts.length === 0) return;

        const profileRef = doc(db, "users", userId, "profile", "data");
        const profileSnap = await getDoc(profileRef);
        const currentBests = profileSnap.data()?.personalBests || {};

        let updated = false;
        strengthWorkouts.forEach(workout => {
            const exercise = workout.exerciseName.toLowerCase();
            const weight = workout.weight;
            if (!currentBests[exercise] || weight > currentBests[exercise].weight) {
                currentBests[exercise] = { weight: weight, reps: workout.reps, date: new Date(workout.timestamp.seconds * 1000).toLocaleDateString() };
                updated = true;
            }
        });

        if (updated) {
            await setDoc(profileRef, { personalBests: currentBests }, { merge: true });
        }
    }

    function renderPersonalBests(bests) {
        const container = document.getElementById('personal-bests-display');
        if (!container) return;
        const bestsHtml = Object.entries(bests).map(([exercise, data]) => `
            <div class="p-2 bg-gray-700 rounded-md">
                <p class="font-bold capitalize">${exercise}</p>
                <p>${data.weight} lbs x ${data.reps} reps <span class="text-gray-400 text-sm">(${data.date})</span></p>
            </div>
        `).join('');
        container.innerHTML = bestsHtml || `<p class="text-gray-500">No personal bests yet. Log a strength workout!</p>`;
    }


    // --- UI Event Listeners ---
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

    const handleAuthAction = async (action, email, password, errorEl, username) => {
        errorEl.textContent = '';
        try {
            const userCredential = await action(auth, email, password);
            if (action === createUserWithEmailAndPassword) {
                const userId = userCredential.user.uid;
                await setDoc(doc(db, "profiles", userId), { username, email, workoutCount: 0 });
            }
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
    document.getElementById('sign-out-btn-mobile').addEventListener('click', () => signOut(auth));

    // --- Modal Handling ---
    function setupModal(openBtnIds, modalId, closeBtnId, saveBtnId, saveAction) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        openBtnIds.forEach(id => {
            document.getElementById(id)?.addEventListener('click', () => modal.style.display = 'flex');
        });

        document.getElementById(closeBtnId)?.addEventListener('click', () => modal.style.display = 'none');
        document.getElementById(saveBtnId)?.addEventListener('click', saveAction);
    }

    function getWorkoutCalories(type, duration) {
        const metValues = { 'Cardio': 7, 'Strength': 4, 'Yoga': 2.5, 'Running': 11, 'Walking': 3.5, 'Jogging': 7, 'Swimming': 8 };
        const met = metValues[type] || 5;
        return Math.round((met * 3.5 * (userWeight / 2.2)) / 200 * duration);
    }

    document.getElementById('workout-type-select').addEventListener('change', (e) => {
        document.getElementById('strength-inputs').classList.toggle('hidden', e.target.value !== 'Strength');
    });

    setupModal(['log-workout-btn', 'add-workout-page-btn'], 'workout-modal', 'close-workout-modal-btn', 'save-workout-btn', async () => {
        if (!userId) return;
        const type = document.getElementById('workout-type-select').value;
        const duration = parseInt(document.getElementById('workout-duration-input').value);
        const notes = document.getElementById('workout-notes-input').value;
        const manualCalories = document.getElementById('workout-calories-input').value;
        const heartRate = document.getElementById('heart-rate-input').value;
        
        let workoutData = { type, duration, notes, timestamp: serverTimestamp() };
        if (heartRate) workoutData.heartRate = parseInt(heartRate);

        if (type === 'Strength') {
            workoutData.exerciseName = document.getElementById('exercise-name-input').value;
            workoutData.weight = parseInt(document.getElementById('exercise-weight-input').value);
            workoutData.reps = parseInt(document.getElementById('exercise-reps-input').value);
        }

        if (type && duration) {
            workoutData.caloriesBurned = manualCalories ? parseInt(manualCalories) : getWorkoutCalories(type, duration);
            try {
                await addDoc(collection(db, "users", userId, "workouts"), workoutData);
                document.getElementById('workout-modal').style.display = 'none';
                // Reset form
                document.getElementById('workout-type-select').selectedIndex = 0;
                document.getElementById('strength-inputs').classList.add('hidden');
                ['workout-duration-input', 'workout-calories-input', 'workout-notes-input', 'heart-rate-input', 'exercise-name-input', 'exercise-weight-input', 'exercise-reps-input'].forEach(id => document.getElementById(id).value = '');
            } catch (error) { console.error("Error adding workout:", error); }
        }
    });

    setupModal(['add-meal-btn', 'add-meal-page-btn'], 'meal-modal', 'close-meal-modal-btn', 'save-meal-btn', async () => {
        if (!userId) return;
        const name = document.getElementById('meal-name-input').value;
        const calories = document.getElementById('meal-calories-input').value;
        const protein = document.getElementById('meal-protein-input').value;
        const carbs = document.getElementById('meal-carbs-input').value;
        const fat = document.getElementById('meal-fat-input').value;

        if (name && calories && protein && carbs && fat) {
            try {
                await addDoc(collection(db, "users", userId, "nutrition"), { 
                    name, 
                    calories: parseInt(calories), 
                    protein: parseInt(protein),
                    carbs: parseInt(carbs),
                    fat: parseInt(fat),
                    timestamp: serverTimestamp() 
                });
                document.getElementById('meal-name-input').value = '';
                document.getElementById('meal-calories-input').value = '';
                document.getElementById('meal-protein-input').value = '';
                document.getElementById('meal-carbs-input').value = '';
                document.getElementById('meal-fat-input').value = '';
                document.getElementById('meal-modal').style.display = 'none';
            } catch (error) { console.error("Error adding meal:", error); }
        }
    });

    setupModal(['add-water-btn'], 'water-modal', 'close-water-modal-btn', 'save-water-btn', async () => {
        if (!userId) return;
        const amount = document.getElementById('water-amount-input').value;

        if (amount) {
            try {
                await addDoc(collection(db, "users", userId, "water"), { amount: parseInt(amount), timestamp: serverTimestamp() });
                document.getElementById('water-amount-input').value = '';
                document.getElementById('water-modal').style.display = 'none';
            } catch (error) { console.error("Error adding water:", error); }
        }
    });

    setupModal(['log-steps-btn'], 'steps-modal', 'close-steps-modal-btn', 'save-steps-btn', async () => {
        if (!userId) return;
        const amount = document.getElementById('steps-amount-input').value;

        if (amount) {
            try {
                await addDoc(collection(db, "users", userId, "steps"), { amount: parseInt(amount), timestamp: serverTimestamp() });
                document.getElementById('steps-amount-input').value = '';
                document.getElementById('steps-modal').style.display = 'none';
            } catch (error) { console.error("Error adding steps:", error); }
        }
    });

    document.getElementById('log-weight-btn')?.addEventListener('click', async () => {
        if (!userId) return;
        const weight = document.getElementById('weight-input').value;
        if (weight) {
            try {
                await addDoc(collection(db, "users", userId, "progress"), { weight: parseFloat(weight), timestamp: serverTimestamp() });
                document.getElementById('weight-input').value = '';
            } catch (error) { console.error("Error logging weight:", error); }
        }
    });

    document.getElementById('log-bodyfat-btn')?.addEventListener('click', async () => {
        if (!userId) return;
        const bodyfat = document.getElementById('bodyfat-input').value;
        if (bodyfat) {
            try {
                await addDoc(collection(db, "users", userId, "progress"), { bodyfat: parseFloat(bodyfat), timestamp: serverTimestamp() });
                document.getElementById('bodyfat-input').value = '';
            } catch (error) { console.error("Error logging body fat:", error); }
        }
    });

    document.getElementById('save-settings-btn').addEventListener('click', async () => {
        if (!userId) return;
        const newWeight = document.getElementById('user-weight-input').value;
        if (newWeight) {
            try {
                const profileRef = doc(db, "users", userId, "profile", "data");
                await setDoc(profileRef, { weight: parseFloat(newWeight) }, { merge: true });
                userWeight = parseFloat(newWeight);
                alert("Settings saved!");
            } catch (error) {
                console.error("Error saving settings:", error);
            }
        }
    });
});
