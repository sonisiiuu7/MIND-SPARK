import React, { useState, useEffect } from 'react';
import './index.css';
import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

function App() {
  const [topic, setTopic] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isResultVisible, setIsResultVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [user, setUser] = useState(null);
  // --- NEW: State to track if the image is loading ---
  const [isImageLoading, setIsImageLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchHistory();
      } else {
        setHistory([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchHistory = async () => {
    if (!auth.currentUser) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch('http://localhost:5001/api/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error("Could not fetch history:", error);
    }
  };

  useEffect(() => {
    return () => {
      speechSynthesis.cancel();
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) {
      alert("Please sign in to use Mind Spark!");
      return;
    }
    setIsLoading(true);
    setStreamingText('');
    setImageUrl('');
    setIsResultVisible(false);
    // --- NEW: Set image loading to true at the start of a new request ---
    setIsImageLoading(true);
    speechSynthesis.cancel();

    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch('http://localhost:5001/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ topic: topic }),
      });

      if (!response.ok) {
        throw new Error(`Network response was not ok`);
      }
      
      const imgUrl = response.headers.get('X-Image-Url');
      setImageUrl(imgUrl);
      setIsResultVisible(true);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break; 
        }
        const chunk = decoder.decode(value);
        setStreamingText((prevText) => prevText + chunk);
      }
      
      fetchHistory();

    } catch (error) {
      console.error('An error occurred:', error);
      setIsImageLoading(false); // Make sure to turn off loading on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error during Google sign-in", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsResultVisible(false);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const handleSpeak = () => {
    if (streamingText) {
      const utterance = new SpeechSynthesisUtterance(streamingText);
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    }
  };
  
  const handleStopSpeak = () => {
    speechSynthesis.cancel();
  };

  const handleHistoryClick = (historyItem) => {
    setTopic(historyItem.topic);
    setStreamingText(historyItem.explanation);
    setImageUrl(historyItem.imageUrl);
    setIsResultVisible(true);
    // --- NEW: Also set image loading state when clicking history ---
    setIsImageLoading(true);
    speechSynthesis.cancel();
    window.scrollTo(0, 0);
  };

  return (
    <div className="App">
      <nav className="navbar">
        <h1>Mind Spark</h1>
        {user ? (
          <div className="user-info">
            <span>Welcome, {user.displayName}!</span>
            <button onClick={handleLogout} className="auth-btn">Logout</button>
          </div>
        ) : (
          <button onClick={handleGoogleLogin} className="auth-btn">Login with Google</button>
        )}
      </nav>

      <header className="App-header">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What do you want to learn about?"
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Thinking...' : 'Generate'}
          </button>
        </form>
      </header>
      {isLoading && <p className="loading">Loading, please wait...</p>}
      
      {isResultVisible && (
        <div className="result">
          <h2>{topic}</h2>
          <div className="audio-player">
            <p>Audio Explanation:</p>
            <button onClick={handleSpeak} className="audio-btn play-btn">Play</button>
            <button onClick={handleStopSpeak} className="audio-btn stop-btn">Stop</button>
          </div>
          <p>{streamingText}</p>
          
          {/* --- NEW: Conditional rendering for the image --- */}
          {isImageLoading && (
            <div className="image-placeholder">
              <p>🎨 Generating your image...</p>
            </div>
          )}
          
          <img 
            src={imageUrl} 
            alt={isImageLoading ? '' : `AI generated visual for ${topic}`}
            // This function runs when the image successfully loads
            onLoad={() => setIsImageLoading(false)}
            // This hides the image tag itself until it's loaded
            style={{ display: isImageLoading ? 'none' : 'block' }} 
          />
        </div>
      )}

      {user && (
        <div className="history-container">
          <button onClick={() => setShowHistory(!showHistory)} className="toggle-history-btn">
            {showHistory ? 'Hide History' : 'Show History'}
          </button>
          {showHistory && (
            <div className="history-section">
              <h2>Recent Searches</h2>
              {history.length > 0 ? (
                <ul className="history-list">
                  {history.map((item) => (
                    <li key={item.id}>
                      <button onClick={() => handleHistoryClick(item)} className="history-item-btn">
                        {item.topic}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No search history yet.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
export default App;
