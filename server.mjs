import express from 'express';
import axios from 'axios';
import cors from 'cors';
import bodyParser from 'body-parser';
import OpenAI from "openai";
const openai = new OpenAI();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for cross-origin requests (e.g., requests from your frontend)
app.use(cors({
    origin: '*',  // Replace with your actual frontend URL
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true  // Include this if you're sending cookies or other credentials
}));
// Parse JSON request bodies
app.use(bodyParser.json());

// OpenAI API setup

// Endpoint to handle profile improvement requests
app.post('/api/improve-profile', async (req, res) => {
    const { profileData } = req.body;
    console.log("Data from profile to be improved:");

    console.log(profileData);

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { 
                    role: "system", 
                    content: "Sie sind ein Experte für Dating-Coaching und helfen Nutzern, ihre Dating-Profile zu verbessern. Du bekommst nur bestimmte Aspekte und versuchst, sie zu verbessern, indem du sie anders formulierst. Entfernen Sie Teile, die Ihnen seltsam erscheinen oder falsch aufgefasst werden könnten. Du änderst nichts an der Syntax. Antworten Sie nicht als Chat." 
                },
                {
                    role: "user",
                    content: JSON.stringify(profileData)
                              
                },
            ],
        });
        //console.log(completion);  // Print the completion response from OpenAI
        console.log(completion.choices[0].message.content);
        res.json({ result: completion.choices[0].message.content });

    } catch (error) {

        console.error("Error fetching from OpenAI:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "An error occurred while processing the profile." });

    }
});

// Start the backend server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
