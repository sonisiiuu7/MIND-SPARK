// src/App.js

import React, { useState, useEffect, useRef } from 'react';
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
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [error, setError] = useState(null); // New state for handling errors

  const textBuffer = useRef('');
  const intervalRef = useRef(null);

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
      if (!response.ok) {
          throw new Error('Failed to fetch history.');
      }
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error("Could not fetch history:", error);
      setError("Could not load your history. Please try refreshing.");
    }
  };

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) {
      alert("Please sign in to use Mind Spark!");
      return;
    }

    // Reset state for a new generation
    setIsLoading(true);
    setStreamingText('');
    setImageUrl('');
    setIsResultVisible(false);
    setIsImageLoading(true);
    setError(null); // Clear previous errors
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    clearInterval(intervalRef.current);
    textBuffer.current = '';

    let reader; // Define reader outside the try block for access in finally

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

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred during generation.' }));
        throw new Error(errorData.message || `Network response was not ok (status: ${response.status})`);
      }
      
      const imgUrl = response.headers.get('X-Image-Url');
      if (!imgUrl) {
          throw new Error("Did not receive an image URL from the server.");
      }
      
      setImageUrl(imgUrl);
      setIsResultVisible(true); // Make results visible only after getting a valid response

      reader = response.body.getReader();
      const decoder = new TextDecoder();

      intervalRef.current = setInterval(() => {
        if (textBuffer.current.length > streamingText.length) {
          setStreamingText(textBuffer.current);
        }
      }, 50);

      // CRASH FIX: Encapsulate the stream reading in its own try/catch
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break; 
        }
        const chunk = decoder.decode(value, { stream: true });
        textBuffer.current += chunk;
      }
      
      const newHistoryItem = {
        id: new Date().toISOString(),
        topic: topic,
        explanation: textBuffer.current,
        imageUrl: imgUrl,
      };
      setHistory(prevHistory => [newHistoryItem, ...prevHistory]);

    } catch (error) {
      console.error('An error occurred:', error);
      setError(`Failed to generate content: ${error.message}`); // Set a user-friendly error
      setIsImageLoading(false);
    } finally {
      // Ensure everything is cleaned up regardless of success or failure
      clearInterval(intervalRef.current);
      if (reader) {
        reader.releaseLock(); // Release the lock on the stream reader
      }
      setStreamingText(textBuffer.current); // Display any text that was received before an error
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setError(null); // Clear any previous errors on successful login
    } catch (error) {
      console.error("Error during Google sign-in", error);
      setError("Failed to sign in with Google. Please try again.");
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
    if (streamingText && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(streamingText);
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    }
  };
  
  const handleStopSpeak = () => {
    if (window.speechSynthesis) {
        speechSynthesis.cancel();
    }
  };

  const handleHistoryClick = (historyItem) => {
    clearInterval(intervalRef.current);
    setTopic(historyItem.topic);
    setStreamingText(historyItem.explanation);
    setImageUrl(historyItem.imageUrl);
    setIsResultVisible(true);
    setIsImageLoading(false); // Image is already loaded from history
    setError(null); // Clear any existing errors
    if (window.speechSynthesis) {
        speechSynthesis.cancel();
    }
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
      
      {/* Display error messages to the user */}
      {error && <div className="error-message">{error}</div>}
      
      {isResultVisible && (
        <div className="result">
          <h2>{topic}</h2>
          <div className="audio-player">
            <p>Audio Explanation:</p>
            <button onClick={handleSpeak} className="audio-btn play-btn">Play</button>
            <button onClick={handleStopSpeak} className="audio-btn stop-btn">Stop</button>
          </div>
          <p>{streamingText}</p>
          
          {isImageLoading && (
            <div className="image-placeholder">
              <p>🎨 Generating your image...</p>
            </div>
          )}
          
          {imageUrl && (
            <img 
              src={imageUrl} 
              alt={`AI generated visual for ${topic}`}
              onLoad={() => setIsImageLoading(false)}
              onError={() => {
                  setIsImageLoading(false);
                  setError("The generated image failed to load.");
              }}
              style={{ display: isImageLoading ? 'none' : 'block' }} 
            />
          )}
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
                    <li key={item.id || item.topic}>
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
