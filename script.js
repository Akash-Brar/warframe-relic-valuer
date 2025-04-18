document.addEventListener("DOMContentLoaded", () => {
    const relicContainer = document.getElementById("relics-container");
    const searchBar = document.getElementById("search-bar");
    const vaultFilter = document.getElementById("vault-filter");
    const lastUpdatedDiv = document.getElementById("last-updated");

    let relics = [];
    let displayedRelics = [];
    const batchSize = 20;
    let loadedCount = 0;

    fetch("RelicValues.json") 
        .then(response => response.json())
        .then(data => {
            relics = data.sort((a, b) => b.totalSellValue - a.totalSellValue);
            addPositions(relics); // Add positions based on sorted order
            displayedRelics = relics;
            loadInitialRelics();
        });

    fetch("last_updated.json")  // Assuming the second JSON is named "last_updated.json"
        .then(response => response.json())
        .then(data => {
            lastUpdatedDiv.textContent = `Last updated on: ${data.last_updated}`;  // Insert date and time
        });

    function addPositions(sortedRelics) {
        sortedRelics.forEach((relic, index) => {
            relic.position = index + 1; // Assign position based on sorted order
        });
    }

    function loadInitialRelics() {
        relicContainer.innerHTML = ""; // Clear before reloading
        loadedCount = 0;
        loadMoreRelics();
    }

    function createRelicCard(relic) {
        const card = document.createElement("div");
        card.classList.add("relic-card");

        card.innerHTML = `
            <div class="relic-header">
                <h2>${relic.position}. ${relic.name}</h2>
                <p class="vault-status ${relic.vaulted ? "vaulted" : "not-vaulted"}">
                    ${relic.vaulted ? "Vaulted" : "Available"}
                </p>
            </div>
            <p><strong>Total Sell Price:</strong> ${relic.totalSellValue}p</p>
            <p><strong>Total Buy Price:</strong> ${relic.totalBuyValue}p</p>
            <div class="items-container">
                ${relic.items
                    .sort((a, b) => a.chance - b.chance) 
                    .map(
                        item => `
                            <div class="item">
                                <p>${item.name} (${getRarity(item.chance)})</p>
                                <p class="item-values">Sell: ${item.sellValue}p | Buy: ${item.buyValue}p</p>
                            </div>
                        `
                    ).join("")}
            </div>
        `;

        relicContainer.appendChild(card);
    }

    function getRarity(chance) {
        if (chance === 2) return "Rare";
        if (chance === 11) return "Uncommon";
        if (chance === 25.33) return "Common";
        return "Unknown";
    }

    function observeLastCard() {
        const relicCards = document.querySelectorAll(".relic-card");
        const lastCard = relicCards[relicCards.length - 1];

        if (!lastCard) return;

        const observer = new IntersectionObserver(entries => {
            const lastCardEntry = entries[0];

            if (lastCardEntry.isIntersecting) {
                observer.unobserve(lastCard);
                loadMoreRelics();
            }
        });

        observer.observe(lastCard);
    }

    function loadMoreRelics() {
        for (let i = loadedCount; i < loadedCount + batchSize && i < displayedRelics.length; i++) {
            createRelicCard(displayedRelics[i]);
        }
        loadedCount += batchSize;
        observeLastCard();
    }

    function filterRelics() {
        let searchText = searchBar.value.toLowerCase();
        let vaultStatus = vaultFilter.value;

        displayedRelics = relics.filter(relic => {
            let matchesSearch = relic.name.toLowerCase().includes(searchText) ||
                relic.items.some(item => item.name.toLowerCase().includes(searchText));

            let matchesVault = (vaultStatus === "all") ||
                (vaultStatus === "vaulted" && relic.vaulted) ||
                (vaultStatus === "not-vaulted" && !relic.vaulted);

            return matchesSearch && matchesVault;
        });

        loadInitialRelics();
    }

    searchBar.addEventListener("input", filterRelics);
    vaultFilter.addEventListener("change", filterRelics);
});
