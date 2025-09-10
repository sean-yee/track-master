const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

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
