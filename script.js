import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query, addDoc, serverTimestamp, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
 
// IMPORTANT: REPLACE WITH YOUR FIREBASE CONFIG
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
    // --- Theme Management ---
    const themeToggle = document.getElementById('theme-toggle');
    const themeIconDark = document.getElementById('theme-icon-dark');
    const themeIconLight = document.getElementById('theme-icon-light');
 
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            themeIconDark.classList.remove('hidden');
            themeIconLight.classList.add('hidden');
        } else {
            document.documentElement.classList.remove('dark');
            themeIconDark.classList.add('hidden');
            themeIconLight.classList.remove('hidden');
        }
    };
 
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
 
    themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        const newTheme = isDark ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
 
        // Update chart colors
        const chartTextColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary');
        Object.values(charts).forEach(chart => {
            if (chart.options.scales) {
                chart.options.scales.x.ticks.color = chartTextColor;
                chart.options.scales.y.ticks.color = chartTextColor;
            }
            if (chart.options.plugins.legend) {
                chart.options.plugins.legend.labels.color = chartTextColor;
            }
            chart.update();
        });
    });
 
    // --- DOM Elements ---
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const userDisplayMobile = document.getElementById('user-display-mobile');
    const profileDropdown = document.getElementById('profile-dropdown');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenuOpenIcon = document.getElementById('mobile-menu-open-icon');
    const mobileMenuCloseIcon = document.getElementById('mobile-menu-close-icon');
    const welcomeMessage = document.getElementById('welcome-message');
    const motivationalQuoteEl = document.getElementById('motivational-quote');
 
    const pages = ['dashboard', 'workouts', 'progress', 'nutrition', 'profile', 'community', 'settings'];
    let userId = null;
    let unsubscribers = [];
    let charts = {};
    let dailyCaloriesBurned = { workouts: 0, steps: 0 };
    let userProfileData = {};
    let customWorkoutExercises = [];
    let allWorkouts = [];
    let allSteps = [];
    let allProfiles = [];
    let currentLeaderboardType = 'workouts';
    let currentTimeframe = 'daily';
 
    // --- Page Navigation ---
    function showPage(pageId) {
        pages.forEach(page => {
            document.getElementById(`${page}-content`)?.classList.remove('active');
            document.querySelectorAll(`.nav-link[id*="${page}"]`).forEach(el => el.classList.remove('active'));
        });
        document.getElementById(`${pageId}-content`)?.classList.add('active');
        document.querySelectorAll(`.nav-link[id*="${pageId}"]`).forEach(el => el.classList.add('active'));
    }
 
    pages.forEach(pageId => {
        document.getElementById(`nav-${pageId}`)?.addEventListener('click', (e) => { e.preventDefault(); showPage(pageId); });
        document.getElementById(`mobile-nav-${pageId}`)?.addEventListener('click', (e) => { e.preventDefault(); showPage(pageId); mobileMenu.classList.add('hidden'); });
    });
    
    // --- Other UI Listeners ---
    document.getElementById('nav-logo').addEventListener('click', (e) => { e.preventDefault(); showPage('dashboard'); });
    document.getElementById('nav-profile-dropdown').addEventListener('click', (e) => { e.preventDefault(); showPage('profile'); profileDropdown.classList.add('hidden'); });
    document.getElementById('nav-settings-dropdown').addEventListener('click', (e) => { e.preventDefault(); showPage('settings'); profileDropdown.classList.add('hidden'); });
    document.getElementById('mobile-nav-profile-dropdown').addEventListener('click', (e) => { e.preventDefault(); showPage('profile'); mobileMenu.classList.add('hidden'); });
    document.getElementById('mobile-nav-settings-dropdown').addEventListener('click', (e) => { e.preventDefault(); showPage('settings'); mobileMenu.classList.add('hidden'); });
    document.getElementById('user-menu-button').addEventListener('click', () => profileDropdown.classList.toggle('hidden'));
    mobileMenuButton.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
        mobileMenuOpenIcon.classList.toggle('hidden');
        mobileMenuCloseIcon.classList.toggle('hidden');
    });
    document.getElementById('show-signup').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('login-form').style.display = 'none'; document.getElementById('signup-form').style.display = 'block'; });
    document.getElementById('show-login').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('signup-form').style.display = 'none'; document.getElementById('login-form').style.display = 'block'; });
 
    // --- Community Page Tab Listeners ---
    const leaderboardTabWorkouts = document.getElementById('leaderboard-tab-workouts');
    const leaderboardTabSteps = document.getElementById('leaderboard-tab-steps');
    const leaderboardWorkoutsContent = document.getElementById('leaderboard-workouts-content');
    const leaderboardStepsContent = document.getElementById('leaderboard-steps-content');
    const timeframeButtons = document.querySelectorAll('.timeframe-btn');
 
    function switchLeaderboardType(type) {
        currentLeaderboardType = type;
        if (type === 'workouts') {
            leaderboardWorkoutsContent.style.display = 'block';
            leaderboardStepsContent.style.display = 'none';
            leaderboardTabWorkouts.classList.add('active');
            leaderboardTabSteps.classList.remove('active');
        } else {
            leaderboardWorkoutsContent.style.display = 'none';
            leaderboardStepsContent.style.display = 'block';
            leaderboardTabSteps.classList.add('active');
            leaderboardTabWorkouts.classList.remove('active');
        }
        renderLeaderboard();
    }
 
    leaderboardTabWorkouts.addEventListener('click', () => switchLeaderboardType('workouts'));
    leaderboardTabSteps.addEventListener('click', () => switchLeaderboardType('steps'));
 
    timeframeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            timeframeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTimeframe = btn.id.replace('timeframe-', '');
            renderLeaderboard();
        });
    });
 
 
    // --- Authentication ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userId = user.uid;
            loginContainer.classList.remove('active');
            appContainer.classList.add('active');
            await setupListeners(userId);
            showPage('dashboard');
            setMotivationalQuote();
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
                // Create public profile for leaderboards
                await setDoc(doc(db, "profiles", userId), { 
                    username, 
                    email, 
                    workoutCount: 0, 
                    totalSteps: 0 
                });
                // Create private, detailed user profile
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
        if (!username) { errorEl.textContent = "Please enter a username."; return; }
        handleAuthAction(createUserWithEmailAndPassword, email, password, errorEl, username);
    });
 
    document.getElementById('sign-out-btn').addEventListener('click', () => signOut(auth));
    document.getElementById('sign-out-btn-mobile').addEventListener('click', () => signOut(auth));
 
    // --- Firestore Listeners Setup ---
    async function setupListeners(uid) {
        unsubscribers.forEach(unsub => unsub());
        unsubscribers = [];
        const addListener = (q, callback) => unsubscribers.push(onSnapshot(q, callback));
        
        const profileSnap = await getDoc(doc(db, "profiles", uid));
        const profileData = profileSnap.data() || {};
        const username = profileData.username || auth.currentUser.email;
        if (welcomeMessage) welcomeMessage.innerHTML = `Welcome back, <span class="font-bold">${username}</span>!`;
        if (userDisplayMobile) userDisplayMobile.textContent = username;
 
        const defaultProfile = {
            weight: 0, height: 0, age: 0,
            gender: 'Male', bio: '', fitnessLevel: 'Beginner',
            streak: 0, achievements: [], personalBests: {},
            profilePicUrl: ''
        };
 
        addListener(doc(db, "users", uid, "profile", "data"), snapshot => {
            userProfileData = { ...defaultProfile, ...snapshot.data() };
            updateProfileUI(userProfileData);
            updateNutritionGoals();
        });
 
        addListener(query(collection(db, "users", uid, "workouts")), snapshot => {
            const workouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(w => w.timestamp).sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
            renderWorkouts(workouts);
            updateDashboardWorkouts(workouts);
            calculateStreak(workouts);
            checkAchievements({ workouts });
            updateLeaderboard(workouts.length);
            updatePersonalBests(workouts);
        });
        
        addListener(query(collection(db, "users", uid, "steps")), snapshot => {
            const steps = snapshot.docs.map(doc => doc.data());
            updateDashboardSteps(steps);
            updateStepsLeaderboard(steps);
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
            const progressData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(d => d.timestamp).sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);
            renderProgressCharts(progressData);
        });
        
        addListener(query(collection(db, "users", uid, "workout_plans")), snapshot => {
            const plans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderWorkoutPlans(plans);
        });
 
        // Listen to all users' workouts and steps for leaderboards
        addListener(query(collection(db, "workouts")), snapshot => {
            allWorkouts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            renderLeaderboard();
        });
 
        addListener(query(collection(db, "steps")), snapshot => {
            allSteps = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            renderLeaderboard();
        });
 
        addListener(query(collection(db, "profiles")), snapshot => {
            allProfiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderLeaderboard();
        });
    }
 
    // --- Helper Functions ---
    // **FIX #1: Rewritten Date helpers to be more robust and avoid timezone bugs.**
    const isToday = (firestoreTimestamp) => {
        if (!firestoreTimestamp?.seconds) return false;
        const date = new Date(firestoreTimestamp.seconds * 1000);
        const today = new Date();
        return date.getFullYear() === today.getFullYear() &&
               date.getMonth() === today.getMonth() &&
               date.getDate() === today.getDate();
    };
 
    const isThisWeek = (firestoreTimestamp) => {
        if (!firestoreTimestamp?.seconds) return false;
        const date = new Date(firestoreTimestamp.seconds * 1000);
        const today = new Date();
        
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Sunday = 0, so this finds the most recent Sunday
        weekStart.setHours(0, 0, 0, 0); // Start of the day
 
        return date >= weekStart;
    };
    
    function showNotification(message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
 
    // --- UI Update & Rendering Functions ---
    function updateProfileUI(profile) {
        if (!profile) return;
        document.getElementById('profile-username').textContent = profile.username || 'User';
        document.getElementById('profile-fitness-level').textContent = profile.fitnessLevel || 'N/A';
        document.getElementById('profile-bio').textContent = profile.bio || 'No bio set.';
        document.getElementById('profile-streak-display').textContent = profile.streak || 0;
        
        renderAchievements(profile.achievements || []);
        renderPersonalBests(profile.personalBests || {});
 
        const profilePics = [document.getElementById('profile-pic-nav'), document.getElementById('profile-pic-main'), document.getElementById('profile-pic-nav-mobile')];
        profilePics.forEach(el => {
            if(el) el.src = profile.profilePicUrl || `https://placehold.co/96x96/1e293b/FFF?text=${(profile.username || 'U').charAt(0).toUpperCase()}`;
        });
 
        // Pre-fill settings form
        document.getElementById('profile-bio-input').value = profile.bio ?? '';
        document.getElementById('fitness-level').value = profile.fitnessLevel ?? 'Beginner';
        document.getElementById('user-gender-select').value = profile.gender ?? 'Male';
        document.getElementById('user-weight-input').value = profile.weight ?? '';
        document.getElementById('user-height-input').value = profile.height ?? '';
        document.getElementById('user-age-input').value = profile.age ?? '';
    }
 
    function renderWorkouts(workouts) {
        const workoutListEl = document.getElementById('workout-list');
        if (!workoutListEl) return;
        
        const totalWorkouts = workouts.length;
        const totalTime = workouts.reduce((sum, w) => sum + (w.duration || 0), 0);
        const totalCalories = workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
 
        document.getElementById('total-workouts').textContent = totalWorkouts;
        document.getElementById('total-time').textContent = totalTime;
        document.getElementById('total-calories-burned-workouts').textContent = totalCalories;
 
        workoutListEl.innerHTML = workouts.length === 0 
            ? `<tr><td colspan="5" class="text-center p-4 text-gray-500">No workouts logged yet.</td></tr>` 
            : workouts.map(w => `
                <tr class="border-b border-gray-700 hover:bg-gray-700/50">
                    <td class="p-4">${new Date(w.timestamp.seconds * 1000).toLocaleDateString()}</td>
                    <td class="p-4">${w.type || 'N/A'}</td>
                    <td class="p-4">${w.duration || 'N/A'} min</td>
                    <td class="p-4">${w.caloriesBurned || 'N/A'}</td>
                    <td class="p-4">${w.notes || ''}</td>
                </tr>`).join('');
    }
    
    function renderWorkoutPlans(plans) {
        const plansListEl = document.getElementById('custom-plans-list');
        if (!plansListEl) return;
        plansListEl.innerHTML = plans.length === 0
            ? `<p class="text-gray-500">No custom plans created yet.</p>`
            : plans.map(plan => `
                <div class="plan-card">
                    <h4 class="font-bold text-lg">${plan.name}</h4>
                    <ul class="list-disc list-inside mt-2">
                        ${plan.exercises.map(ex => `<li>${ex.name}: ${ex.sets} sets of ${ex.reps} reps</li>`).join('')}
                    </ul>
                </div>
            `).join('');
    }
 
    function renderMeals(meals) {
        const mealListEl = document.getElementById('meal-list');
        if (!mealListEl) return;
        const todayMeals = meals.filter(m => m.timestamp && isToday(m.timestamp)).sort((a,b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
 
        mealListEl.innerHTML = todayMeals.length === 0
            ? `<p class="text-gray-500">No meals logged today.</p>`
            : todayMeals.map(m => `
                <li class="meal-item">
                    <div class="meal-details">
                        <p>${m.name}</p>
                        <p>${m.calories} kcal</p>
                    </div>
                    <div class="meal-macros">
                        <p>P: <span>${m.protein}g</span></p>
                        <p>C: <span>${m.carbs}g</span></p>
                        <p>F: <span>${m.fat}g</span></p>
                    </div>
                </li>`).join('');
    }
    
    function renderProgressCharts(progressData) {
        const chartTextColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary');
        const weightData = progressData.filter(d => d.weight);
        const bodyfatData = progressData.filter(d => d.bodyfat);
        const chartOptions = { 
            plugins: { legend: { display: false } }, 
            scales: { 
                y: { ticks: { color: chartTextColor } }, 
                x: { ticks: { color: chartTextColor } } 
            } 
        };
 
        const createOrUpdateChart = (id, data, labels, borderColor) => {
            const ctx = document.getElementById(id)?.getContext('2d');
            if(!ctx) return;
            if (charts[id]) {
                charts[id].data.labels = labels;
                charts[id].data.datasets[0].data = data;
                charts[id].update();
            } else {
                charts[id] = new Chart(ctx, {
                    type: 'line',
                    data: { labels, datasets: [{ data, borderColor, tension: 0.1, pointBackgroundColor: 'white', pointRadius: 4 }] },
                    options: chartOptions
                });
            }
        };
 
        createOrUpdateChart('weight-chart', weightData.map(d => d.weight), weightData.map(d => new Date(d.timestamp.seconds * 1000).toLocaleDateString()), '#a78bfa');
        createOrUpdateChart('bodyfat-chart', bodyfatData.map(d => d.bodyfat), bodyfatData.map(d => new Date(d.timestamp.seconds * 1000).toLocaleDateString()), '#f472b6');
    }
 
    function renderMacroChart(meals) {
        const chartTextColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary');
        const todayMeals = meals.filter(m => m.timestamp && isToday(m.timestamp));
        const macros = todayMeals.reduce((acc, meal) => {
            acc.protein += meal.protein || 0;
            acc.carbs += meal.carbs || 0;
            acc.fat += meal.fat || 0;
            return acc;
        }, { protein: 0, carbs: 0, fat: 0 });
 
        const ctx = document.getElementById('macro-chart')?.getContext('2d');
        if(!ctx) return;
        if (charts.macro) {
            charts.macro.data.datasets[0].data = [macros.protein, macros.carbs, macros.fat];
            charts.macro.update();
        } else {
            charts.macro = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['Protein (g)', 'Carbs (g)', 'Fat (g)'],
                    datasets: [{
                        data: [macros.protein, macros.carbs, macros.fat],
                        backgroundColor: ['#3b82f6', '#16a34a', '#ef4444'],
                        borderWidth: 0,
                        hoverOffset: 8
                    }]
                },
                options: {
                    plugins: {
                        legend: {
                            labels: {
                                color: chartTextColor
                            }
                        }
                    }
                }
            });
        }
    }
 
                  function renderLeaderboard() {
                                    if (allProfiles.length === 0) {
                                                      return; // Don't run if profiles aren't loaded yet
                                    }
 
                                    const workoutBody = document.getElementById('leaderboard-body-workouts');
                                    const stepsBody = document.getElementById('leaderboard-body-steps');
                                    
                                    let dataToRender;
                                    let key; 
 
                                    if (currentTimeframe === 'all') {
                                                      dataToRender = allProfiles;
                                                      key = (currentLeaderboardType === 'workouts') ? 'workoutCount' : 'totalSteps';
                                    } else {
            // **FIX #2: Added console.log for debugging if the issue persists.**
                                                      console.log(`DEBUG: Filtering for timeframe "${currentTimeframe}". Data received:`, allWorkouts);
 
                                                      if (currentLeaderboardType === 'workouts') {
                                                                        const filteredWorkouts = allWorkouts.filter(w => {
                                                                                          return (currentTimeframe === 'daily') ? isToday(w.timestamp) : isThisWeek(w.timestamp);
                                                                        });
                console.log(`DEBUG: Found ${filteredWorkouts.length} workouts after filtering.`);
                                                                        const workoutCounts = filteredWorkouts.reduce((acc, workout) => {
                                                                                          acc[workout.userId] = (acc[workout.userId] || 0) + 1;
                                                                                          return acc;
                                                                        }, {});
                                                                        dataToRender = allProfiles.map(p => ({ ...p, count: workoutCounts[p.id] || 0 }));
                                                                        key = 'count';
                                                      } else { // Steps
                                                                        const filteredSteps = allSteps.filter(s => {
                                                                                          return (currentTimeframe === 'daily') ? isToday(s.timestamp) : isThisWeek(s.timestamp);
                                                                        });
                                                                        const stepCounts = filteredSteps.reduce((acc, step) => {
                                                                                          acc[step.userId] = (acc[step.userId] || 0) + step.amount;
                                                                                          return acc;
                                                                        }, {});
                                                                        dataToRender = allProfiles.map(p => ({ ...p, count: stepCounts[p.id] || 0 }));
                                                                        key = 'count';
                                                      }
                                    }
 
                                    const renderTable = (bodyEl, data, valueKey) => {
                                                      if (!bodyEl) return;
                                                      
                                                      const sorted = [...data]
                                                                        .sort((a, b) => (b[valueKey] || 0) - (a[valueKey] || 0));
 
                                                      if (sorted.every(p => !p[valueKey] || p[valueKey] === 0)) {
                                                                        bodyEl.innerHTML = `<tr><td colspan="3" class="px-6 py-4 text-center text-gray-500">No data for this period yet.</td></tr>`;
                                                                        return;
                                                      }
                                                      
                                                      bodyEl.innerHTML = sorted.map((p, i) => `
                                                                        <tr>
                                                                                          <td class="px-6 py-4">${i + 1}</td>
                                                                                          <td class="px-6 py-4">${p.username}</td>
                                                                                          <td class="px-6 py-4">${p[valueKey] || 0}</td>
                                                                        </tr>
                                                      `).join('');
                                    };
                                    
                                    if (currentLeaderboardType === 'workouts') {
                                                      renderTable(workoutBody, dataToRender, key);
                                    } else {
                                                      renderTable(stepsBody, dataToRender, key);
                                    }
                  }
 
    function updateDashboardWorkouts(workouts) {
        const todayWorkouts = workouts.filter(w => w.timestamp && isToday(w.timestamp));
        dailyCaloriesBurned.workouts = todayWorkouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
        updateTotalCaloriesBurned();
    }
 
    function updateDashboardSteps(steps) {
        const todaySteps = steps.filter(s => s.timestamp && isToday(s.timestamp));
        const totalSteps = todaySteps.reduce((sum, s) => sum + (s.amount || 0), 0);
        document.getElementById('steps-taken').textContent = totalSteps;
        dailyCaloriesBurned.steps = totalSteps * 0.04; // Average calorie burn per step
        updateTotalCaloriesBurned();
    }
 
    function updateDashboardCaloriesFromMeals(meals) {
        const totalCalories = meals.filter(m => m.timestamp && isToday(m.timestamp)).reduce((sum, m) => sum + (m.calories || 0), 0);
        document.getElementById('calories-consumed').textContent = totalCalories;
    }
 
    function updateWaterIntake(logs) {
        const total = logs.filter(l => l.timestamp && isToday(l.timestamp)).reduce((sum, l) => sum + (l.amount || 0), 0);
        const totalLiters = (total / 1000).toFixed(1);
        document.getElementById('water-intake').textContent = totalLiters;
    }
 
    function updateTotalCaloriesBurned() {
        const total = Math.round(dailyCaloriesBurned.workouts + dailyCaloriesBurned.steps);
        document.getElementById('total-calories-burned-dash').textContent = total;
    }
 
    function setMotivationalQuote() {
        const quotes = ["The only bad workout is the one that didn't happen.", "Success isn't always about greatness. It's about consistency.", "Your body can stand almost anything. It’s your mind that you have to convince."];
        if (motivationalQuoteEl) {
            motivationalQuoteEl.textContent = quotes[Math.floor(Math.random() * quotes.length)];
        }
    }
    
    // --- Nutrition Goal Calculation ---
    function updateNutritionGoals() {
        const { weight, height, age, gender, fitnessLevel } = userProfileData;
        const contentEl = document.getElementById('nutrition-goals-content');
        if (!contentEl) return;
 
        if (weight <= 0 || height <= 0 || age <= 0 || !gender || !fitnessLevel) {
            contentEl.innerHTML = `<p class="text-gray-400 col-span-2">Please complete your profile in Settings to calculate your nutrition goals.</p>`;
            return;
        }
 
        const weightKg = weight / 2.20462;
        
        let bmr = (10 * weightKg) + (6.25 * height) - (5 * age);
        bmr += (gender === 'Male' ? 5 : -161);
        
        const activityFactors = { 'Beginner': 1.375, 'Intermediate': 1.55, 'Advanced': 1.725 };
        const tdee = bmr * (activityFactors[fitnessLevel] || 1.2);
 
        const gainMuscleCalories = Math.round(tdee + 400);
        const proteinIntake = Math.round(weightKg * 1.8);
 
        contentEl.innerHTML = `
            <div class="nutrition-goal-card">
                <h4 class="font-bold text-lg text-green-400">Gain Muscle</h4>
                <p class="mt-1 text-sm text-gray-400">Est. gain: ~0.25-0.5 kg/month</p>
                <p class="mt-2">Calories: <span class="font-bold text-xl">${gainMuscleCalories}</span> kcal/day</p>
                <p>Protein: <span class="font-bold text-xl">${proteinIntake}</span> g/day</p>
            </div>
            <div class="nutrition-goal-card">
                <h4 class="font-bold text-lg text-red-400">Lose Weight</h4>
                <p class="mt-1 text-sm text-gray-400">Est. loss: 0.5 kg/week</p>
                <p class="mt-2">Calories: <span class="font-bold text-xl">${Math.round(tdee - 500)}</span> kcal/day</p>
                <p>Protein: <span class="font-bold text-xl">${proteinIntake}</span> g/day</p>
            </div>
        `;
    }
 
    // --- Gamification ---
    async function calculateStreak(workouts) {
        if (!userId || workouts.length === 0) return;
        const workoutDays = [...new Set(workouts.map(w => new Date(w.timestamp.seconds * 1000).toISOString().split('T')[0]))].sort((a,b) => b.localeCompare(a));
        let streak = 0;
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (workoutDays[0] === todayStr || workoutDays[0] === yesterdayStr) {
            streak = 1;
            for (let i = 0; i < workoutDays.length - 1; i++) {
                const currentDay = new Date(workoutDays[i]);
                const prevDay = new Date(workoutDays[i+1]);
                if ((currentDay.getTime() - prevDay.getTime()) / 86400000 === 1) {
                    streak++;
                } else { break; }
            }
        }
        await setDoc(doc(db, "users", userId, "profile", "data"), { streak }, { merge: true });
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
        if (data.workouts.length >= 1 && !earnedAchievements.includes('FIRST_WORKOUT')) newAchievements.push('FIRST_WORKOUT');
        if (data.workouts.length >= 5 && !earnedAchievements.includes('FIVE_WORKOUTS')) newAchievements.push('FIVE_WORKOUTS');
        if (newAchievements.length > 0) {
            await setDoc(profileRef, { achievements: [...earnedAchievements, ...newAchievements] }, { merge: true });
        }
    }
 
    function renderAchievements(earnedIds) {
        const container = document.getElementById('badges-display');
        if (!container) return;
        container.innerHTML = earnedIds.length === 0
            ? `<p class="text-gray-500 col-span-3">No achievements yet.</p>`
            : earnedIds.map(id => `<div class="text-center" title="${achievements[id].description}"><div class="text-4xl">🏆</div><p class="text-sm font-semibold">${achievements[id].name}</p></div>`).join('');
    }
 
    async function updateLeaderboard(workoutCount) {
        if (!userId) return;
        const profileRef = doc(db, "profiles", userId);
        const profileSnap = await getDoc(profileRef);
        if (!profileSnap.exists()) return;
        const username = profileSnap.data()?.username || auth.currentUser.email;
        await setDoc(profileRef, { username, workoutCount }, { merge: true });
    }
    
    async function updateStepsLeaderboard(steps) {
        if (!userId) return;
        const totalSteps = steps.reduce((sum, s) => sum + (s.amount || 0), 0);
        const profileRef = doc(db, "profiles", userId);
        if (! (await getDoc(profileRef)).exists()) return;
        await setDoc(profileRef, { totalSteps }, { merge: true });
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
        const bestsHtml = Object.entries(bests).map(([exercise, data]) => `<div class="p-2 bg-gray-700 rounded-md"><p class="font-bold capitalize">${exercise}</p><p>${data.weight} lbs x ${data.reps} reps <span class="text-gray-400 text-sm">(${data.date})</span></p></div>`).join('');
        container.innerHTML = bestsHtml || `<p class="text-gray-500">No personal bests yet.</p>`;
    }
    
    // --- Modal Handling ---
    function setupModal(openBtnIds, modalId, closeBtnId, saveBtnId, saveAction) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
 
        const closeModal = () => modal.style.display = 'none';
 
        openBtnIds.forEach(id => document.getElementById(id)?.addEventListener('click', () => modal.style.display = 'flex'));
        document.getElementById(closeBtnId)?.addEventListener('click', closeModal);
        if (saveBtnId && saveAction) {
            document.getElementById(saveBtnId).addEventListener('click', saveAction);
        }
 
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
 
    function getWorkoutCalories(type, duration) {
        const metValues = { 'Cardio': 7, 'Strength': 4, 'Yoga': 2.5, 'Running': 11, 'Walking': 3.5, 'Jogging': 7, 'Swimming': 8 };
        const met = metValues[type] || 5;
        const weightInKg = (userProfileData.weight || 150) / 2.2;
        return Math.round((met * 3.5 * weightInKg) / 200 * duration);
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
        let workoutData = { type, duration, notes, timestamp: serverTimestamp() };
        if (type === 'Strength') {
            workoutData.exerciseName = document.getElementById('exercise-name-input').value;
            workoutData.weight = parseInt(document.getElementById('exercise-weight-input').value);
            workoutData.reps = parseInt(document.getElementById('exercise-reps-input').value);
        }
        if (type && duration) {
            workoutData.caloriesBurned = manualCalories ? parseInt(manualCalories) : getWorkoutCalories(type, duration);
            try {
                await addDoc(collection(db, "users", userId, "workouts"), workoutData);
                await addDoc(collection(db, "workouts"), { ...workoutData, userId: userId });
                document.getElementById('workout-modal').style.display = 'none';
                ['workout-duration-input', 'workout-calories-input', 'workout-notes-input', 'exercise-name-input', 'exercise-weight-input', 'exercise-reps-input'].forEach(id => document.getElementById(id).value = '');
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
                await addDoc(collection(db, "users", userId, "nutrition"), { name, calories: parseInt(calories), protein: parseInt(protein), carbs: parseInt(carbs), fat: parseInt(fat), timestamp: serverTimestamp() });
                ['meal-name-input', 'meal-calories-input', 'meal-protein-input', 'meal-carbs-input', 'meal-fat-input'].forEach(id => document.getElementById(id).value = '');
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
                const stepData = { amount: parseInt(amount), timestamp: serverTimestamp() };
                await addDoc(collection(db, "users", userId, "steps"), stepData);
                await addDoc(collection(db, "steps"), { ...stepData, userId: userId });
                document.getElementById('steps-amount-input').value = '';
                document.getElementById('steps-modal').style.display = 'none';
            } catch (error) { console.error("Error adding steps:", error); }
        }
    });
 
    // Custom Plan Modal
    setupModal(['create-plan-btn'], 'plan-modal', 'close-plan-modal-btn');
 
    document.getElementById('add-exercise-to-plan-btn').addEventListener('click', () => {
        const name = document.getElementById('plan-exercise-name-input').value;
        const sets = document.getElementById('plan-exercise-sets-input').value;
        const reps = document.getElementById('plan-exercise-reps-input').value;
        
        if (name && sets && reps) {
            customWorkoutExercises.push({ name, sets, reps });
            renderPlanExercises();
            document.getElementById('plan-exercise-name-input').value = '';
            document.getElementById('plan-exercise-sets-input').value = '';
            document.getElementById('plan-exercise-reps-input').value = '';
        }
    });
 
    function renderPlanExercises() {
        const listEl = document.getElementById('plan-exercises-list');
        listEl.innerHTML = customWorkoutExercises.map(ex => `<li>${ex.name}: ${ex.sets}x${ex.reps}</li>`).join('');
    }
 
    document.getElementById('save-plan-btn').addEventListener('click', async () => {
        const planName = document.getElementById('plan-name-input').value;
        if (planName && customWorkoutExercises.length > 0) {
            try {
                await addDoc(collection(db, "users", userId, "workout_plans"), {
                    name: planName,
                    exercises: customWorkoutExercises,
                    createdAt: serverTimestamp()
                });
                document.getElementById('plan-modal').style.display = 'none';
                document.getElementById('plan-name-input').value = '';
                customWorkoutExercises = [];
                renderPlanExercises();
            } catch (error) {
                console.error("Error saving plan:", error);
            }
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
 
        const parseNumericInput = (elementId, parseFunc, fallbackValue) => {
            const valueString = document.getElementById(elementId).value;
            const safeFallback = fallbackValue ?? 0;
            if (valueString.trim() === '') return safeFallback;
            const value = parseFunc(valueString);
            return !isNaN(value) ? value : safeFallback;
        };
 
        const newProfileData = {
            weight: parseNumericInput('user-weight-input', parseFloat, userProfileData.weight),
            height: parseNumericInput('user-height-input', parseInt, userProfileData.height),
            age: parseNumericInput('user-age-input', parseInt, userProfileData.age),
            profilePicUrl: document.querySelector('.avatar-selected')?.dataset.url || userProfileData.profilePicUrl,
            bio: document.getElementById('profile-bio-input').value,
            fitnessLevel: document.getElementById('fitness-level').value,
            gender: document.getElementById('user-gender-select').value
        };
 
        try {
            await setDoc(doc(db, "users", userId, "profile", "data"), newProfileData, { merge: true });
            showNotification("Settings saved!");
        } catch (error) { 
            console.error("Error saving settings:", error);
            showNotification("Error saving settings.");
        }
    });
});

