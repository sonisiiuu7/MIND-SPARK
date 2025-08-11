import React, { useState, useEffect } from 'react';
import './index.css';
import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

function App() {
  const [topic, setTopic] = useState('');
  // --- REFACTORED: Using a single result object for stability ---
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [user, setUser] = useState(null);
  const [isImageLoading, setIsImageLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchHistory();
    } else {
      setHistory([]);
    }
  }, [user]);

  const fetchHistory = async () => {
    if (!auth.currentUser) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch('https://mind-spark.onrender.com/api/history', {
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
    setResult(null);
    setIsImageLoading(true);
    speechSynthesis.cancel();

    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch('https://mind-spark.onrender.com/api/generate', {
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
      // Set the initial result object with the image URL but empty text
      setResult({ text: '', imageUrl: imgUrl });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break; 
        }
        const chunk = decoder.decode(value);
        fullText += chunk;
        // Update the text within the single result object
        setResult((prevResult) => ({
          ...prevResult,
          text: prevResult.text + chunk,
        }));
      }
      
      const newHistoryItem = {
        id: new Date().toISOString(),
        topic: topic,
        explanation: fullText,
        imageUrl: imgUrl,
      };
      setHistory(prevHistory => [newHistoryItem, ...prevHistory]);

    } catch (error) {
      console.error('An error occurred:', error);
      setIsImageLoading(false);
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
      setResult(null);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const handleSpeak = () => {
    if (result && result.text) {
      const utterance = new SpeechSynthesisUtterance(result.text);
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    }
  };
  
  const handleStopSpeak = () => {
    speechSynthesis.cancel();
  };

  const handleHistoryClick = (historyItem) => {
    setTopic(historyItem.topic);
    setResult({
      text: historyItem.explanation,
      imageUrl: historyItem.imageUrl,
    });
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
      
      {/* --- UPDATED: Render logic now uses the single result object --- */}
      {result && (
        <div className="result">
          <h2>{topic}</h2>
          <div className="audio-player">
            <p>Audio Explanation:</p>
            <button onClick={handleSpeak} className="audio-btn play-btn">Play</button>
            <button onClick={handleStopSpeak} className="audio-btn stop-btn">Stop</button>
          </div>
          <p>{result.text}</p>
          
          {isImageLoading && (
            <div className="image-placeholder">
              <p>🎨 Generating your image...</p>
            </div>
          )}
          
          <img 
            src={result.imageUrl} 
            alt={isImageLoading ? '' : `AI generated visual for ${topic}`}
            onLoad={() => setIsImageLoading(false)}
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
