const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const db = require("./database");
const Genius = require("genius-lyrics"); // Import the lyrics library

const app = express();
const PORT = process.env.PORT || 3000;

// Use the Environment variable (Render) OR the hardcoded string (Local)
const token = process.env.GENIUS_ACCESS_TOKEN;

if (!token) {
    console.error("⚠️ CRITICAL: No Genius Access Token found! Lyrics fetching will fail.");
}

// Initialize the client
const Client = new Genius.Client(token);

app.use(cors());
app.use(bodyParser.json());

// ===================== LYRICS ENDPOINT =====================
// This is the new route your frontend will call to get lyrics
app.get('/lyrics', async (req, res) => {
    const { artist, track } = req.query;

    if (!artist || !track) {
        return res.status(400).json({ error: "Missing artist or track name" });
    }

    try {
        // 1. Search Genius for the song
        // We combine track + artist to get a more accurate search result
        const searches = await Client.songs.search(`${track} ${artist}`);

        if (searches.length === 0) {
            return res.status(404).json({ error: "Lyrics not found" });
        }

        // 2. Pick the first result from the search
        const firstSong = searches[0];

        // 3. Scrape the lyrics
        let lyrics = await firstSong.lyrics();

        // 4. clean up unwated stuff
        const startIndex = lyrics.indexOf('[');
        if(startIndex !== -1) {
            lyrics = lyrics.substring(startIndex);
        }

        // 5. Send back the clean data
        res.json({ 
            title: firstSong.title,
            artist: firstSong.artist.name,
            lyrics: lyrics 
        });

    } catch (error) {
        console.error("Error fetching lyrics:", error);
        res.status(500).json({ error: "Failed to fetch lyrics" });
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
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});