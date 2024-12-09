import express from 'express';
import axios from 'axios';
import cors from 'cors';
import bodyParser from 'body-parser';
import OpenAI from "openai";
import db from './database.mjs';

const openai = new OpenAI();

const app = express();
const PORT = 5000;

// Enable CORS for cross-origin requests (e.g., requests from your frontend)
app.use(cors());

// Parse JSON request bodies
app.use(bodyParser.json());

// Fetch examples from the database
const examples = db.prepare(`
    SELECT original_profile, improved_profile 
    FROM profiles 
    ORDER BY date DESC 
    LIMIT 3
`).all();


// OpenAI API setup

// Endpoint to handle profile improvement requests
app.post('/api/improve-profile', async (req, res) => {
    const { profileData, rating } = req.body;

    const fewShotExamples = examples.map((example) => ([
        { role: "user", content: example.original_profile },
        { role: "assistant", content: example.improved_profile }
    ])).flat();  // Flatten to get a single-level array of messages

    try {
        //console.log(...fewShotExamples)
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: "You are an expert dating coach helping users improve their dating profiles. You only get the certain aspects and you are trying to improve them by wording them differenty. Remove parts which seem rather weird or could be picked up wrong. You dont change anything in the syntax. Do not answer as a chat. Use the following examples as guidance." },
                { role: "user", content: JSON.stringify(profileData) }
                //...fewShotExamples,  // Add few-shot examples here
            ],
        });

        const improvedProfile = completion.choices[0].message.content;
        //console.log(improvedProfile);
        res.json({ improvedProfile });

    } catch (error) {
        console.error("Error in profile improvement:", error);
        res.status(500).json({ error: "Profile improvement failed" });
    }
});

app.post('/api/uploadResults', async (req, res) => {
    let { originalProfile, improvedProfile, rating } = req.body;
 

    // Log types to ensure correct data types
    console.log("Types - originalProfile:", typeof originalProfile, ", improvedProfile:", typeof improvedProfile, ", rating:", typeof rating);
  
    console.log("originalProfile: " + originalProfile);
    console.log("improvedProfile: " + improvedProfile);
    console.log("rating: " + rating);


    originalProfile = JSON.stringify(JSON.parse(originalProfile));
    improvedProfile = JSON.stringify(JSON.parse(improvedProfile));

    console.log("originalProfile: " + originalProfile);
    console.log("improvedProfile: " + improvedProfile);


    // Ensure rating is a number and profiles are strings
    if (typeof rating !== 'number') {
        rating = Number(rating);  // Convert to a number if possible
    }
    if (typeof originalProfile !== 'string' || typeof improvedProfile !== 'string') {
        return res.status(400).json({ error: "Profile data must be strings." });
    }

    try {
        const stmt = db.prepare("INSERT INTO profiles (original_profile, improved_profile, improvement_rating) VALUES (?, ?, ?)");

        // Bind the parameters and run the statement
        stmt.run([originalProfile, improvedProfile, rating], function (err) {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ error: "Database save failed" });
            }
            res.json({ message: "Profile and rating saved successfully" });
        });
        stmt.finalize();

    } catch (error) {
        console.error("Error saving rating:", error);
        res.status(500).json({ error: "Rating save failed" });
    }
});


// Start the backend server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});


app.get('/api/admin/profiles', (req, res) => {
    try {
        const profiles = db.prepare("SELECT * FROM profiles").all();
        res.json(profiles);
    } catch (error) {
        console.error("Error retrieving profiles:", error);
        res.status(500).json({ error: "Error retrieving profiles." });
    }
});