# FitnessWebsite-Hackathon




A personal fitness dashboard built from scratch with vanilla HTML, CSS, and JavaScript, powered by a Google Firebase backend. This project was created for the **CodeSprout Hackathon (August 2025)**.

**Live Demo:** 
https://arans05.github.io/FitnessWebsite-Hackathon/
---

## 💡 About The Project

FitTrack is a web application designed to help users track their fitness journey in a simple and intuitive way. It includes features for logging workouts and nutrition, visualizing progress with charts, and engaging with a community through leaderboards.

The primary goal was to build a dynamic, real-time, multi-user application without relying on any front-end frameworks like React or Vue, demonstrating the power of modern vanilla JavaScript.

---

## ✨ Key Features

-   **User Authentication:** Secure sign-up and login for personal accounts.
-   **Dynamic Dashboard:** At-a-glance view of daily calories, workouts, steps, and water intake.
-   **Workout Logging:** Log different types of workouts with details like duration, calories, and notes.
-   **Progress Tracking:** Visualize weight and body fat percentage changes over time with charts.
-   **Community Leaderboards:** Compete with other users on daily, weekly, and all-time leaderboards for workouts and steps.
-   ** Dark/Light Theme:** A sleek, modern UI with a theme toggle for user preference.

---

## 🛠️ Tech Stack

This project was built using only vanilla technologies as per the hackathon rules:

-   **Front-End:**
    -   HTML5
    -   CSS3 (with CSS Variables for theming)
    -   JavaScript (ES6+)
-   **Back-End & Database:**
    -   **Google Firebase:**
        -   **Firestore:** Real-time NoSQL database for storing all user data.
        -   **Firebase Authentication:** For handling user accounts.
-   **Libraries:**
    -   **Chart.js:** For rendering the progress charts.
    -   **Tailwind CSS:** For utility-first styling (via CDN).

---

## 🤝 Team Collaboration

Our team adopted a component-based workflow, dividing the project into four key areas to ensure parallel development and clear ownership.

* **Aran - Backend & Core Logic:**
    * Set up the entire Firebase project, including Firestore database structure and security rules.
    * Implemented all user authentication logic (signup, login, logout, and session management).
    * Wrote the core `setupListeners` function that connects the front-end to the live database.

* **Raheem - Data Visualization & Nutrition:**
    * Built the "Progress" page, integrating Chart.js to create dynamic, responsive charts for weight and body fat tracking.
    * Developed the "Nutrition" page, including the UI for logging meals and the macro-tracking pie chart.
    * Wrote the helper functions for date and time calculations (`isToday`, `isThisWeek`).

* **Hashim - UI/UX & Community Features:**
    * Designed the overall user interface, including the dark/light mode theme switcher and the main navigation shell.
    * Developed the "Community" page, implementing the logic for the leaderboards, including the tabbing and timeframe filtering system.
    * Was responsible for the overall CSS structure and ensuring a consistent, modern look and feel.

* **Arif - User Interaction & Gamification:**
    * Built the "My Workouts" and "Profile" pages.
    * Developed all the pop-up modals for data entry (logging workouts, meals, water, etc.) and handled the form submission logic.
    * Implemented the gamification features, including the workout streak calculation and the achievement system.

---


