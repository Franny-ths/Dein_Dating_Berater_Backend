import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import OpenAI from "openai";
import db from './database.mjs';

const openai = new OpenAI();

const app = express();
const PORT = 5000;
const debugLog = false;
const runlocal = false;
const ADMIN_API_KEY = "admin";


app.use(cors());
app.use(bodyParser.json());

// Beispiele aus der Datenbank holen
const goodExamples = db.prepare(`
    SELECT original_profile, improved_profile, improvement_message
    FROM profiles 
    WHERE improvement_rating = 1 
    ORDER BY date DESC 
    LIMIT 3
`).all();

const badExamples = db.prepare(`
    SELECT original_profile, improved_profile, improvement_message
    FROM profiles 
    WHERE improvement_rating = 0 
    ORDER BY date DESC 
    LIMIT 3
`).all();


// Endpunkt um das Profil zu verbessern
app.post('/api/improve-profile', async (req, res) => {
    const { profileData } = req.body;

    const goodFewShotExamples = goodExamples.map((example) => ([
        { role: "user", content: example.original_profile },
        { role: "assistant", content: example.improved_profile },
        { role: "user", content: "Diese Verbesserung wurde gut bewertet weil: " + example.improvement_message }
    ])).flat();

    const badFewShotExamples = badExamples.map((example) => ([
        { role: "user", content: example.original_profile },
        { role: "assistant", content: example.improved_profile },
        { role: "user", content: "Diese Verbesserung wurde als schlecht bewertet weil: " + example.improvement_message }
    ])).flat();

    const allExamples = [...goodFewShotExamples, ...badFewShotExamples];

    const systemPrompt = "Sie sind ein Experte für Dating-Coaching und helfen Nutzern, ihre Dating-Profile zu verbessern. Du bekommst nur bestimmte Aspekte und versuchst, sie zu verbessern, indem du sie anders formulierst. Entferne Teile, die seltsam erscheinen oder falsch aufgefasst werden könnten. Orientiere dich an den gestellten Beispielen was gut funktioniert und was nicht. Du änderst nichts an der Syntax. Antworten nicht als Chat.";
    try {

        const message = [
            { role: "system", content: systemPrompt},
            ...allExamples,
            { role: "user", content: JSON.stringify(profileData) }
        ];
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: message,
        });
        const improvedProfile = completion.choices[0].message.content;
        if (debugLog) {
            console.log(message);
            console.log("Profil verbessert: " + improvedProfile);
        }
        console.log(`Erfolgreich Profil verbessert.`)

        res.json({ improvedProfile });

    } catch (error) {
        console.error("Error beim Verbessern des Profils:", error);
        res.status(500).json({ error: "Error beim Verbessern des Profils" });
    }
});

// Endpunkt um die Bertung mit den Profilen hopchzuladen
app.post('/api/uploadResults', async (req, res) => {
    let { originalProfile, improvedProfile, rating, improvement_message } = req.body;

    if (debugLog) {

        console.log("Types - originalProfile:", typeof originalProfile, ", improvedProfile:", typeof improvedProfile, ", rating:", typeof rating);
        console.log("originalProfile:", originalProfile);
        console.log("improvedProfile:", improvedProfile);
        console.log("rating:", rating);
        console.log("improvement_message:", improvement_message);
    }

    try {
        const stmt = db.prepare(
            "INSERT INTO profiles (original_profile, improved_profile, improvement_rating, improvement_message) VALUES (?, ?, ?, ?)"
        );

        stmt.run(originalProfile, improvedProfile, rating, improvement_message)

        console.log("Bewertung erfolgreich gespeichert");
        res.json({ message: "Bewertung erfolgreich gespeichert" });

    } catch (error) {
        console.error("Error beim speichern der Bewertung:", error);
        res.status(500).json({ error: "Error beim speichern der Bewertung" });
    }
});


// Endpunkt für Admin die Datenbank zu sehen
app.get('/api/admin/profiles', (req, res) => {
    try {
        const profiles = db.prepare("SELECT * FROM profiles").all();
        res.json(profiles);
    } catch (error) {
        console.error("Error beim Zugriff auf die Datenbank:", error);
        res.status(500).json({ error: "Error beim Zugriff auf die Datenbank." });
    }
});


// Endpunktfür Admin um die Datenbank zurückzusetzen
app.post('/api/admin/reset-database', (req, res) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== ADMIN_API_KEY) {
        return res.status(403).json({ error: "Nicht autorisierter Zugriff." });
    }

    try {
        db.prepare(`DELETE FROM profiles`).run();

        res.json({ message: "Datenbank wurde erfolgreich zurückgesetzt." });
        console.log("Datenbank wurde erfolgreich zurückgesetzt.");
    } catch (error) {
        console.error("Error beim Zurücksetzten der Datenbank:", error);
        res.status(500).json({ error: "Error beim Zurücksetzten der Datenbank." });
    }
});


// Backend Server starten 
app.listen(PORT, () => {
    if (runlocal) {
        console.log(`Server läuft auf http://localhost:${PORT}`);
        console.log(`Profil Datenbank auf http://localhost:${PORT}/api/admin/profiles`)
        console.log(`Datenbank zurücksetzen auf http://localhost:${PORT}/api/admin/reset-profiles`);
    } else {
        console.log(`Server läuft auf https://dein-dating-berater-backend.onrender.com/api/`);
        console.log(`Profil Datenbank auf https://dein-dating-berater-backend.onrender.com/api/admin/profiles`);
        console.log(`Datenbank zurücksetzen auf https://dein-dating-berater-backend.onrender.com/api/admin/reset-profiles`);
    }
});