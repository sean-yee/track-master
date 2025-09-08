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
    displayAlbums(data.items);
}

// STEP 5 — Display Albums
function displayAlbums(albums) {
    results.innerHTML = "";

    if (albums.length === 0) {
        results.innerHTML = "<p>No albums found</p>";
        return;
    }

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

        card.addEventListener("click", () => {
            fetchAlbumTracks(album.id, album.name)
        })

        results.appendChild(card);
    });
}

// Fetch tracks for a specific album
async function fetchAlbumTracks(albumId, albumName) {
    const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}/tracks?market=US&limit=50`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json();
    displayAlbumTracksTable(data.items, albumName);
}

// Build and display a table of tracks
function createAlbumTracksTable(tracks) {

    // Create table
    const table = document.createElement("table");
    table.classList.add("tracks-table");

    // Table header
    const header = document.createElement("tr");
    header.innerHTML = `
        <th>#</th>
        <th>Track Name</th>
    `;
    table.appendChild(header);

    // Track rows (hidden initially)
    tracks.forEach((track, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${index + 1}</td>
            <td class="track-name" style="display: none;">${track.name}</td>
        `;
        table.appendChild(row);
    });

    tracklist.appendChild(table);
    return table; // return table so the search function can access it
}

function setupTrackGuessing(tracks, table) {
    // Create search input
    const search = document.createElement("input");
    search.type = "text";
    search.placeholder = "Guess Songs...";
    search.classList.add("track-search");
    tracklist.prepend(search);

    // Create container for timer + restart button
    const timerContainer = document.createElement("div");
    timerContainer.classList.add("timer-container");
    search.insertAdjacentElement("afterend", timerContainer);

    // Create timer display
    const timerDisplay = document.createElement("p");
    timerDisplay.textContent = "Time: 0:00";
    timerDisplay.classList.add("timer-display");
    timerContainer.appendChild(timerDisplay);

    // Create restart button
    const restartBtn = document.createElement("button");
    restartBtn.textContent = "🔄 Restart";
    restartBtn.classList.add("restart-btn");
    timerContainer.appendChild(restartBtn);

    // Create give up button
    const giveUpBtn = document.createElement("button");
    giveUpBtn.textContent = "Give Up";
    giveUpBtn.classList.add("give-up");
    timerContainer.appendChild(giveUpBtn);

    let startTime = null;
    let interval = null;
    let guessedCount = 0;

    // Start timer when user first types or focuses
    function startTimer() {
        if (interval) return; // prevent multiple timers

        startTime = Date.now();
        interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const mins = Math.floor(elapsed / 60);
            const secs = Math.floor(elapsed % 60);
            const formattedSecs = secs < 10 ? `0${secs}` : secs;
            timerDisplay.textContent = `Time: ${mins}:${formattedSecs}`;
        }, 1000);
    }

    // Restart game function
    function restartGame() {
        clearInterval(interval);
        interval = null;
        startTime = null;
        guessedCount = 0;

        // Reset timer
        timerDisplay.textContent = "Time: 0:00";

        // Re-enable search bar
        search.disabled = false;
        search.value = "";

        // Hide all tracks again & reset styling
        const rows = table.querySelectorAll("tr");
        rows.forEach((row, index) => {
            if (index === 0) return; // skip header
            const cell = row.querySelector(".track-name");
            cell.style.display = "none";
            row.style.backgroundColor = "";
            row.style.color = "";
        });
    }

    function giveUp() {
        clearInterval(interval);
        interval = null;

        const rows = table.querySelectorAll("tr");
        rows.forEach((row, index) => {
            if (index === 0) return;
            const cell = row.querySelector(".track-name");

            if (cell.style.display !== "table-cell") {
                cell.style.display = "table-cell";
                row.style.backgroundColor = "red";
                row.style.color = "white";
            }
        });

        search.disabled = true;
        timerDisplay.textContent = "❌ You gave up!";
    }

    // Attach restart button functionality
    restartBtn.addEventListener("click", restartGame);
    giveUpBtn.addEventListener("click", giveUp);

    // Guessing logic
    search.addEventListener("focus", startTimer);
    search.addEventListener("input", () => {
        startTimer();

        const guess = search.value.trim().toLowerCase();
        const rows = table.querySelectorAll("tr");

        rows.forEach((row, index) => {
            if (index === 0) return; // skip header
            const cell = row.querySelector(".track-name");

            if (cell.style.display === "table-cell") return; // already revealed

            const normalTitle = normalizeTitle(cell.textContent);

            if (normalTitle === guess) {
                cell.style.display = "table-cell";
                row.style.backgroundColor = "#1DB954";
                row.style.color = "white";
                search.value = "";
                guessedCount++;

                // Check if ALL songs are guessed
                if (guessedCount === tracks.length) {
                    clearInterval(interval);
                    const totalTime = Math.floor((Date.now() - startTime) / 1000);
                    const mins = Math.floor(totalTime / 60);
                    const secs = totalTime % 60;
                    const formattedSeconds = secs < 10 ? `0${secs}` : secs;

                    timerDisplay.textContent = `✅ Completed in ${mins}:${formattedSeconds}!`;
                    search.disabled = true;
                }
            }
        });
    });
}

function normalizeTitle(title) {
    return title.toLowerCase().replace(/\s*\(.*?\)/g, "").trim();
}

function displayAlbumTracksTable(tracks, albumName) {
    results.innerHTML = ""; // Clear previous results
    tracklist.innerHTML = "";

    const title = document.createElement("h2");
    title.textContent = `Tracks in "${albumName}"`;
    tracklist.appendChild(title);

    const table = createAlbumTracksTable(tracks); // create table
    setupTrackGuessing(tracks, table);            // setup search bar
}


// STEP 7 — Live Search Dropdown
artistInput.addEventListener("input", async () => {
    if (!accessToken) await getAccessToken();
    searchArtists(artistInput.value);
});
