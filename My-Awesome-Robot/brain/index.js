const express = require('express');
const cors = require('cors');
require('dotenv').config();

const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const textModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
    // NEW: This exposes a custom header to our frontend so it can get the image URL
    exposedHeaders: ['X-Image-Url'],
}));
app.use(express.json());

const checkAuth = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    const idToken = req.headers.authorization.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = decodedToken;
      next();
    } catch (error) {
      res.status(403).send('Unauthorized');
    }
  } else {
    res.status(401).send('No token provided');
  }
};

app.post('/api/generate', checkAuth, async (req, res) => {
  const { topic } = req.body;
  const uid = req.user.uid;
  console.log('Brain received STREAMING request for:', topic);

  try {
    // --- STEP 1: Generate Image Info FIRST ---
    const imagePrompt = `Create a simple, descriptive prompt for an AI image generator on the topic of "${topic}". The prompt should be a short phrase, like "A photorealistic image of..." or "An oil painting of...".`;
    const imageResult = await textModel.generateContent(imagePrompt);
    const imageResponse = await imageResult.response;
    const imageDescription = imageResponse.text().trim().replace(/\n/g, '');
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imageDescription)}`;

    // --- STEP 2: Send Image URL in a Custom Header ---
    // This sends the image info to the Body immediately, before the text stream starts.
    res.setHeader('X-Image-Url', imageUrl);
    console.log(`Sent image URL in header: ${imageUrl}`);

    // --- STEP 3: Stream the Text Explanation ---
    const textPrompt = `Explain the topic "${topic}" in a clear and simple way, in about 100 words.`;
    const streamResult = await textModel.generateContentStream(textPrompt);

    let fullText = ''; // Variable to assemble the full text for saving

    // Use a "for await...of" loop to process the stream
    for await (const chunk of streamResult.stream) {
      const chunkText = chunk.text();
      fullText += chunkText; // Add the chunk to our full text
      res.write(chunkText); // Send the chunk immediately to the Body
    }

    // --- STEP 4: Save the FULL text to the database AFTER the stream is finished ---
    await db.collection('history').add({
      uid: uid,
      topic: topic,
      explanation: fullText, // Save the completed text
      imageUrl: imageUrl,
      createdAt: new Date()
    });
    console.log('Successfully saved full explanation to the database!');

    // --- STEP 5: End the stream ---
    res.end(); // Tell the Body that we're done sending chunks

  } catch (error) {
    console.error("An error occurred during streaming:", error);
    res.end(); // Make sure to end the response even if there's an error
  }
});

app.get('/api/history', checkAuth, async (req, res) => {
  const uid = req.user.uid;
  try {
    console.log(`Brain received history request from user ${uid}`);
    const historySnapshot = await db.collection('history')
      .where('uid', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const history = [];
    historySnapshot.forEach((doc) => {
      history.push({ id: doc.id, ...doc.data() });
    });
    res.json(history);
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: "Sorry, couldn't get the history." });
  }
});

app.listen(PORT, () => {
  console.log(`Robot Brain is online at http://localhost:${PORT}`);
});
