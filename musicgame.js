const form = document.getElementById("searchForm");
const artistInput = document.getElementById("artistInput");
const dropdown = document.getElementById("dropdown");
const results = document.getElementById("results");
const tracklist = document.getElementById("tracklist");

const CLIENT_ID = "f5e90e272abd41ce9ee9174f5e3686ec";
const CLIENT_SECRET = "52e53e35add44375b3c9688da8a6bc81";

let accessToken = "";

// STEP 1 — Get Spotify Access Token
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

// STEP 2 — Search Artists for Dropdown
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

// STEP 3 — Show Dropdown
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

        li.addEventListener("click", () => {
            artistInput.value = artist.name;
            dropdown.style.display = "none";
            fetchAlbums(artist.id);
        });

        dropdown.appendChild(li);
    });

    dropdown.style.display = "block";
}

// STEP 4 — Fetch Albums
async function fetchAlbums(artistId) {
    const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}/albums?market=US&limit=50&include_groups=album`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json();
    displayAlbums(data.items, artistId);
}

// STEP 5 — Display Albums
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

// Fetch tracks for a specific album
async function fetchAlbumTracks(albumId) {
    const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}/tracks?market=US&limit=50`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    return await response.json();
}

// Fetch and display full discography
async function fetchFullDiscography(artistId) {
    const response = await fetch(
        `https://api.spotify.com/v1/artists/${artistId}/albums?market=US&limit=50&include_groups=album`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const data = await response.json();
    const albums = data.items;

    results.style.display = "none";
    tracklist.style.display = "flex";
    tracklist.innerHTML = "";

    const title = document.createElement("h2");
    title.textContent = "Full Discography";
    tracklist.appendChild(title);

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

// Create shared controls
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

// Build and display a table of tracks
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

// Shared guessing system for both modes
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
                if (index === 0) return; // skip header
                const cell = row.querySelector(".track-name");
                cell.style.display = "none";
                row.style.backgroundColor = "";
                row.style.color = "";
            });
        });
    }

    // Give up — only unguessed songs become red
    function giveUp() {
        clearInterval(interval);
        interval = null;
        search.disabled = true;
        timerDisplay.textContent = "❌ You gave up!";

        tables.forEach(table => {
            const rows = table.querySelectorAll("tr");
            rows.forEach((row, index) => {
                if (index === 0) return;
                const cell = row.querySelector(".track-name");

                // If already guessed → keep green
                if (cell.style.display === "table-cell" && row.style.backgroundColor === "rgb(29, 185, 84)") {
                    row.style.backgroundColor = "#1DB954"; // keep green
                    row.style.color = "white";
                } else {
                    // If unguessed → reveal and mark red
                    cell.style.display = "table-cell";
                    row.style.backgroundColor = "red";
                    row.style.color = "white";
                }
            });
        });
    }

    // Guessing logic across ALL tables
    search.addEventListener("focus", startTimer);
    search.addEventListener("input", () => {
        startTimer();
        const guess = normalizeTitle(search.value);

        tables.forEach(table => {
            const rows = table.querySelectorAll("tr");
            rows.forEach((row, index) => {
                if (index === 0) return; // skip header
                const cell = row.querySelector(".track-name");

                // Skip if already revealed
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
                        timerDisplay.textContent = `✅ Completed in ${mins}:${formattedSecs}!`;
                        search.disabled = true;
                    }
                }
            });
        });
    });

    restartBtn.addEventListener("click", restartGame);
    giveUpBtn.addEventListener("click", giveUp);
}

// Normalize song titles
function normalizeTitle(title) {
    return title.toLowerCase().replace(/\s*\(.*?\)/g, "").trim();
}

// Display tracks for single album
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
    setupGlobalTrackGuessing(tracks, [table], search, timerDisplay, restartBtn, giveUpBtn);
}

// Back button handler
function setUpBackButton(backBtn, artistId) {
    backBtn.addEventListener("click", () => {
        results.style.display = "grid";
        tracklist.style.display = "none";
        tracklist.innerHTML = "";
        fetchAlbums(artistId);
    });
}

// STEP 7 — Live Search Dropdown
artistInput.addEventListener("input", async () => {
    if (!accessToken) await getAccessToken();
    searchArtists(artistInput.value);
});
