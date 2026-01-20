const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const db = require("./database");
const Genius = require("genius-lyrics");
const axios = require("axios"); // ✅ NEW: Import Axios for the workaround

// 1. Try to load local .env file (It's okay if this fails on Render)
try {
    require('dotenv').config();
} catch (e) {
    // We are on Render, or dotenv isn't installed. Skip it.
}

const app = express();
const PORT = process.env.PORT || 3000;

// 2. GET THE TOKEN
// Priority 1: Render Environment Variable
// Priority 2: Hardcoded Fallback (Only use this for local testing)
const token = process.env.GENIUS_ACCESS_TOKEN || "PASTE_YOUR_REAL_TOKEN_HERE_FOR_LOCAL_USE";

if (!token || token === "token") {
    console.error("⚠️ CRITICAL: No valid Genius Access Token found! Lyrics fetching may fail.");
}

const Client = new Genius.Client(token);

app.use(cors());
app.use(bodyParser.json());

// ===================== LYRICS ENDPOINT (HYBRID FIX) =====================
app.get('/lyrics', async (req, res) => {
    const { artist, track } = req.query;

    if (!artist || !track) {
        return res.status(400).json({ error: "Missing artist or track name" });
    }

    try {
        // STEP 1: Search Genius for Metadata (Allowed on Render)
        // We use Genius to verify the song exists and get the clean title
        const searches = await Client.songs.search(`${track} ${artist}`);

        if (searches.length === 0) {
            return res.status(404).json({ error: "Song not found on Genius" });
        }

        const firstSong = searches[0];
        console.log(`✅ Genius identified: ${firstSong.title} by ${firstSong.artist.name}`);

        // STEP 2: Fetch the actual text from lyrics.ovh (No blocking!)
        // Genius blocks scraping from Render, so we ask a different API for the text.
        
        // Clean up the title (remove "ft. Drake", "Remix", etc. for better matching)
        const cleanTitle = firstSong.title.replace(/\s*\(.*?\)\s*/g, "").trim(); 
        const cleanArtist = firstSong.artist.name;

        try {
            // Request lyrics from the open API
            const ovhResponse = await axios.get(`https://api.lyrics.ovh/v1/${cleanArtist}/${cleanTitle}`);
            
            // Check if we actually got text back
            if(ovhResponse.data && ovhResponse.data.lyrics) {
                 res.json({ 
                    title: firstSong.title,
                    artist: firstSong.artist.name,
                    lyrics: ovhResponse.data.lyrics 
                });
            } else {
                throw new Error("No lyrics in response");
            }

        } catch (ovhError) {
            console.log("⚠️ OVH failed to find lyrics text. Sending metadata only.");
            // We return null for lyrics so the frontend knows to show a "Sorry" message
            // instead of crashing.
            res.json({ 
                title: firstSong.title,
                artist: firstSong.artist.name,
                lyrics: null 
            });
        }

    } catch (error) {
        console.error("🔥 Server Error:", error.message);
        res.status(500).json({ error: "Failed to process request" });
    }
});

// ===================== LEADERBOARD ENDPOINTS =====================

// ✅ Get leaderboard for a specific album
app.get("/leaderboard/:album", (req, res) => {
    const album = req.params.album;
    db.all(
        "SELECT player, time FROM leaderboard WHERE album = ? ORDER BY time ASC LIMIT 10",
        [album],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// ✅ Add a new leaderboard entry
app.post("/leaderboard", (req, res) => {
    const { album, player, time } = req.body;
    if (!album || !player || !time) {
        return res.status(400).json({ error: "Missing fields" });
    }

    db.run(
        "INSERT INTO leaderboard (album, player, time) VALUES (?, ?, ?)",
        [album, player, time],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});