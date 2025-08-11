# Mind Spark 🧠✨

Mind Spark is a full-stack, multimodal AI application that provides users with text, image, and audio explanations for any topic. It features secure user authentication, a personalized search history, and real-time text streaming to create a seamless and interactive learning experience.

---

## 🚀 Live Demo

https://mindspark7.netlify.app

---

## ✨ Features

* **Real-Time AI Explanations:** Get instant, AI-generated text that streams to the screen word-by-word, powered by the Google Gemini API.
* **Dynamic Image Generation:** A unique, relevant image is created for every topic to provide visual context.
* **Audio Playback:** Listen to any explanation with built-in text-to-speech functionality.
* **Secure User Authentication:** Sign in with your Google account using Firebase Authentication.
* **Personalized Search History:** All searches are saved to your personal account in a Firestore database and can be revisited with a single click.
* **Responsive UI:** A clean and modern user interface that works seamlessly on both desktop and mobile devices.

---

## 🛠️ Tech Stack

* **Frontend:** React.js
* **Backend:** Node.js, Express
* **Database:** Google Firestore
* **Authentication:** Firebase Authentication
* **AI Model:** Google Gemini API
* **Styling:** CSS

---

##  local-setup How to Run Locally

To run this project on your own machine:

1.  **Clone the repository.**
2.  **Backend Setup:**
    * Navigate to the `brain` folder.
    * Run `npm install`.
    * Create a `.env` file and add your `GOOGLE_API_KEY`.
    * Add your `firebase-service-account.json` file.
    * Run `node index.js`.
3.  **Frontend Setup:**
    * Navigate to the `body` folder.
    * Run `npm install`.
    * Create a `src/firebase.js` file with your Firebase config keys.
    * Run `npm start`.
