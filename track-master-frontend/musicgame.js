// Get the modal and button elements
const form = document.getElementById("searchForm");
const artistInput = document.getElementById("artistInput");
const dropdown = document.getElementById("dropdown");
const results = document.getElementById("results");
const tracklist = document.getElementById("tracklist");

const CLIENT_ID = "f5e90e272abd41ce9ee9174f5e3686ec";
const CLIENT_SECRET = "52e53e35add44375b3c9688da8a6bc81";

let accessToken = "";

// ===================== STEP 1 — Get Spotify Access Token =====================
async function getAccessToken() {
    const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Basic " + btoa(CLIENT_ID + ":" + CLIENT_SECRET),
        },
        body: "grant_type=client_credentials",
    });

    const data = await response.json();
    accessToken = data.access_token;
}

// ===================== STEP 2 — Search Artists for Dropdown =====================
async function searchArtists(query) {
    if (!query.trim()) {
        dropdown.style.display = "none";
        return;
    }

    const response = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=artist&limit=5`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json();
    displayDropdown(data.artists.items);
}

// ===================== STEP 3 — Show Dropdown =====================
function displayDropdown(artists) {
    dropdown.innerHTML = "";
    if (artists.length === 0) {
        dropdown.style.display = "none";
        return;
    }

    artists.forEach(artist => {
        const li = document.createElement("li");
        li.textContent = artist.name;
        li.dataset.id = artist.id;

        li.addEventListener("click", async () => {
            artistInput.value = artist.name;
            dropdown.style.display = "none";
            const albums = await fetchAlbums(artist.id);
            displayAlbums(albums.items, artist.id);
        });

        dropdown.appendChild(li);
    });

    dropdown.style.display = "block";
}

// ===================== STEP 4 — Fetch Albums =====================
async function fetchAlbums(artistId) {
    const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}/albums?market=US&limit=50&include_groups=album`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    return await response.json();
}

// ===================== STEP 5 — Display Albums =====================
function displayAlbums(albums, artistId) {
    results.innerHTML = "";

    if (albums.length === 0) {
        results.innerHTML = "<p>No albums found</p>";
        return;
    }

    const discographyBtn = document.createElement("button");
    discographyBtn.textContent = "Full Discography";
    discographyBtn.classList.add("discography-btn");
    results.appendChild(discographyBtn);

    discographyBtn.addEventListener("click", () => {
        fetchFullDiscography(artistId);
    });

    albums.forEach(album => {
        const card = document.createElement("div");
        card.classList.add("track-card");

        card.innerHTML = `
            <img src="${album.images[0]?.url || 'https://via.placeholder.com/200'}" alt="${album.name}">
            <h3>${album.name}</h3>
            <p>Release Date: ${album.release_date}</p>
            <p>Type: ${album.album_type}</p>
            <a href="${album.external_urls.spotify}" target="_blank">Open in Spotify</a>
        `;

        card.addEventListener("click", async () => {
            const albumTracks = await fetchAlbumTracks(album.id);
            displayAlbumTracksTable(albumTracks.items, album.name, artistId);
        });

        results.appendChild(card);
    });
}

// ===================== Fetch tracks for a specific album =====================
async function fetchAlbumTracks(albumId) {
    const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}/tracks?market=US&limit=50`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    return await response.json();
}

// ===================== Fetch and display full discography =====================
async function fetchFullDiscography(artistId) {
    const data = await fetchAlbums(artistId);
    const albums = data.items;

    results.style.display = "none";
    tracklist.style.display = "flex";
    tracklist.innerHTML = "";

    const title = document.createElement("h2");
    title.classList.add("album-title");
    title.textContent = "Full Discography";
    tracklist.appendChild(title);
    fetchLeaderboard("Full Discography");

    // Setup one shared control panel
    const { backBtn, search, timerDisplay, restartBtn, giveUpBtn } = setupControls(artistId);
    setUpBackButton(backBtn, artistId);

    let allTracks = [];
    let allTables = [];

    for (const album of albums) {
        const albumHeader = document.createElement("h3");
        albumHeader.textContent = album.name;
        albumHeader.classList.add("album-header");
        tracklist.appendChild(albumHeader);

        const albumTracks = await fetchAlbumTracks(album.id);
        allTracks.push(...albumTracks.items);

        const table = createAlbumTracksTable(albumTracks.items);
        allTables.push(table);

        const spacer = document.createElement("div");
        spacer.style.height = "25px";
        tracklist.appendChild(spacer);
    }

    setupGlobalTrackGuessing(allTracks, allTables, search, timerDisplay, restartBtn, giveUpBtn);
}

// ===================== Create shared controls =====================
function setupControls(artistId) {
    const backBtn = document.createElement("button");
    backBtn.textContent = "← Back to albums";
    backBtn.classList.add("back-button");
    tracklist.appendChild(backBtn);

    const controls = document.createElement("div");
    controls.classList.add("controls-container");
    tracklist.appendChild(controls);

    const search = document.createElement("input");
    search.type = "text";
    search.placeholder = "Guess Songs...";
    search.classList.add("track-search");
    controls.appendChild(search);

    const timerDisplay = document.createElement("p");
    timerDisplay.textContent = "Time: 0:00";
    timerDisplay.classList.add("timer-display");
    controls.appendChild(timerDisplay);

    const restartBtn = document.createElement("button");
    restartBtn.textContent = "🔄 Restart";
    restartBtn.classList.add("restart-btn");
    controls.appendChild(restartBtn);

    const giveUpBtn = document.createElement("button");
    giveUpBtn.textContent = "Give Up";
    giveUpBtn.classList.add("give-up");
    controls.appendChild(giveUpBtn);

    return { backBtn, search, timerDisplay, restartBtn, giveUpBtn };
}

// ===================== Build and display a table of tracks =====================
function createAlbumTracksTable(tracks) {
    const table = document.createElement("table");
    table.classList.add("tracks-table");

    const header = document.createElement("tr");
    header.innerHTML = `
        <th>#</th>
        <th>Track Name</th>
    `;
    table.appendChild(header);

    tracks.forEach((track, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${index + 1}</td>
            <td class="track-name" style="display: none;">${track.name}</td>
        `;
        table.appendChild(row);
    });

    tracklist.appendChild(table);
    return table;
}

// ===================== Shared guessing system =====================
function setupGlobalTrackGuessing(tracks, tables, search, timerDisplay, restartBtn, giveUpBtn) {
    let startTime = null;
    let interval = null;
    let guessedCount = 0;

    // Start timer
    function startTimer() {
        if (interval) return;
        startTime = Date.now();
        interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const mins = Math.floor(elapsed / 60);
            const secs = elapsed % 60;
            const formattedSecs = secs < 10 ? `0${secs}` : secs;
            timerDisplay.textContent = `Time: ${mins}:${formattedSecs}`;
        }, 1000);
    }

    // Restart game
    function restartGame() {
        clearInterval(interval);
        interval = null;
        startTime = null;
        guessedCount = 0;
        search.disabled = false;
        search.value = "";
        timerDisplay.textContent = "Time: 0:00";

        tables.forEach(table => {
            const rows = table.querySelectorAll("tr");
            rows.forEach((row, index) => {
                if (index === 0) return;
                const cell = row.querySelector(".track-name");
                cell.style.display = "none";
                row.style.backgroundColor = "";
                row.style.color = "";
            });
        });
    }

    // Give up
    function giveUp() {
        clearInterval(interval);
        interval = null;
        search.disabled = true;
        const totalTracks = tracks.length;

        const guessedTracks = tables.reduce((count, table) => {
            const rows = table.querySelectorAll("tr");
            rows.forEach((row, index) => {
                if (index === 0) return;
                const cell = row.querySelector(".track-name");
                if (cell.style.display === "table-cell") {
                    count++;
                }
            });
            return count;
        }, 0)

        const percent = ((guessedTracks / totalTracks) * 100).toFixed(1);

        timerDisplay.textContent = `❌ You gave up! ${guessedTracks}/${totalTracks} (${percent}%)`;

        tables.forEach(table => {
            const rows = table.querySelectorAll("tr");
            rows.forEach((row, index) => {
                if (index === 0) return;
                const cell = row.querySelector(".track-name");

                if (cell.style.display === "table-cell" && row.style.backgroundColor === "rgb(29, 185, 84)") {
                    row.style.backgroundColor = "#1DB954";
                    row.style.color = "white";
                } else {
                    cell.style.display = "table-cell";
                    row.style.backgroundColor = "#d60f0f";
                    row.style.color = "white";
                }
            });
        });
    }

    // Guessing logic
    search.addEventListener("focus", startTimer);
    search.addEventListener("input", () => {
        startTimer();
        const guess = normalizeTitle(search.value);

        tables.forEach(table => {
            const rows = table.querySelectorAll("tr");
            rows.forEach((row, index) => {
                if (index === 0) return;
                const cell = row.querySelector(".track-name");
                if (cell.style.display === "table-cell") return;

                if (normalizeTitle(cell.textContent) === guess) {
                    cell.style.display = "table-cell";
                    row.style.backgroundColor = "#1DB954";
                    row.style.color = "white";
                    search.value = "";
                    guessedCount++;

                    if (guessedCount === tracks.length) {
                        clearInterval(interval);
                        const totalTime = Math.floor((Date.now() - startTime) / 1000);
                        const mins = Math.floor(totalTime / 60);
                        const secs = totalTime % 60;
                        const formattedSecs = secs < 10 ? `0${secs}` : secs;
                        const timeStr = `${mins}:${formattedSecs}`;
                        timerDisplay.textContent = `✅ Completed in ${timeStr}!`;
                        search.disabled = true;

                        // Prompt player name and add to leaderboard
                        showNamePopup((playerName) => {
                            addLeaderboardEntry(playerName, timeStr, document.querySelector("h2").textContent);
                        });

                    }
                }
            });
        });
    });

    restartBtn.addEventListener("click", restartGame);
    giveUpBtn.addEventListener("click", giveUp);
}


function showNamePopup(onSubmit) {
    // Create overlay
    const overlay = document.createElement("div");
    overlay.classList.add("popup-overlay");

    // Create popup box
    const popup = document.createElement("div");
    popup.classList.add("popup-box");

    // Title
    const title = document.createElement("h3");
    title.textContent = "🎉 Congratulations!";
    popup.appendChild(title);

    const msg = document.createElement("p");
    msg.textContent = "Enter your name for the leaderboard:";
    popup.appendChild(msg);

    // Input field
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Your name";
    input.classList.add("popup-input");
    popup.appendChild(input);

    // Buttons container
    const btns = document.createElement("div");
    btns.classList.add("popup-buttons");

    const submitBtn = document.createElement("button");
    submitBtn.textContent = "Submit ✅";
    submitBtn.addEventListener("click", () => {
        if (input.value.trim()) {
            document.body.removeChild(overlay);
            onSubmit(input.value.trim());
        }
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel ❌";
    cancelBtn.addEventListener("click", () => {
        document.body.removeChild(overlay);
    });

    btns.appendChild(submitBtn);
    btns.appendChild(cancelBtn);
    popup.appendChild(btns);

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    input.focus();
}

// ===================== Normalize song titles =====================
function normalizeTitle(title) {
    return title.toLowerCase().replace(/\s*\(.*?\)/g, "").trim();
}

// ===================== Display tracks for single album =====================
function displayAlbumTracksTable(tracks, albumName, artistId) {
    results.style.display = "none";
    tracklist.style.display = "flex";
    tracklist.innerHTML = "";

    const title = document.createElement("h2");
    title.textContent = `Tracks in "${albumName}"`;
    tracklist.appendChild(title);

    const { backBtn, search, timerDisplay, restartBtn, giveUpBtn } = setupControls(artistId);
    setUpBackButton(backBtn, artistId);

    const table = createAlbumTracksTable(tracks);
    fetchLeaderboard(albumName);
    setupGlobalTrackGuessing(tracks, [table], search, timerDisplay, restartBtn, giveUpBtn);
}

// ===================== Back button handler =====================
function setUpBackButton(backBtn, artistId) {
    backBtn.addEventListener("click", () => {
        document.querySelectorAll(".leaderboard-table").forEach(lb => {
            lb.style.display = "none";
        });
        
        results.style.display = "grid";
        tracklist.style.display = "none";
        tracklist.innerHTML = "";

        document.querySelectorAll(".leaderboard-table").forEach(lb => {
            lb.style.display = "none";
        });

        fetchAlbums(artistId);
    });
}

// ===================== Leaderboard =====================
// ===================== Add Leaderboard Entry =====================
async function addLeaderboardEntry(playerName, timeStr, albumName) {
    const timeInSeconds = timeStr
        .split(":")
        .map(Number)
        .reduce((m, s) => m * 60 + s);

    // Send score to backend
    await fetch("https://track-master.onrender.com/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            album: albumName,
            player: playerName,
            time: timeInSeconds,
        }),
    });

    // Refresh leaderboard after adding new entry
    fetchLeaderboard(albumName);
}

// ===================== Fetch & Display Leaderboard =====================
async function fetchLeaderboard(albumName) {
    const leaderboardResponse = await fetch(
        `https://track-master.onrender.com/leaderboard/${albumName}`
    );
    const data = await leaderboardResponse.json();

    const leaderboardId = `leaderboard-${albumName.replace(/\s+/g, "-").toLowerCase()}`;

    // Hide all other leaderboards
    document.querySelectorAll(".leaderboard-table").forEach(lb => {
        lb.style.display = "none";
    });

    // Create leaderboard if it doesn't exist yet
    let leaderboardTable = document.getElementById(leaderboardId);
    if (!leaderboardTable) {
        leaderboardTable = document.createElement("table");
        leaderboardTable.id = leaderboardId;
        leaderboardTable.classList.add("leaderboard-table");

        leaderboardTable.innerHTML = `
            <thead>
                <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Time</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        // Place leaderboard **above** the tracklist for this album
        tracklist.appendChild(leaderboardTable);
    }

    // Make the current leaderboard visible
    leaderboardTable.style.display = "table";

    // Fill the leaderboard data
    const tbody = leaderboardTable.querySelector("tbody");
    tbody.innerHTML = "";

    data.forEach((entry, index) => {
        const mins = Math.floor(entry.time / 60);
        const secs = entry.time % 60;
        const formatted = `${mins}:${secs < 10 ? "0" : ""}${secs}`;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${entry.player}</td>
            <td>${formatted}</td>
        `;
        tbody.appendChild(row);
    });
}

// ===================== Live Search Dropdown =====================
artistInput.addEventListener("input", async () => {
    if (!accessToken) await getAccessToken();
    searchArtists(artistInput.value);
});
