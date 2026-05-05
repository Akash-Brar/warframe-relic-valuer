// script.js — refined data display, card redesign logic, lazy load + filtering
document.addEventListener("DOMContentLoaded", () => {
    const relicContainer = document.getElementById("relics-container");
    const searchBar = document.getElementById("search-bar");
    const vaultFilter = document.getElementById("vault-filter");
    const lastUpdatedDiv = document.getElementById("last-updated");

    let relics = [];
    let displayedRelics = [];
    let loadedCount = 0;
    const batchSize = 20;
    let isLoading = false;
    let currentObserver = null;

    // ---------- fetch relic data ----------
    fetch("RelicValues.json")
        .then(response => {
            if (!response.ok) throw new Error("RelicValues.json not found");
            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data)) throw new Error("Invalid relic data");
            // sort by total sell value descending
            relics = data.sort((a, b) => b.totalSellValue - a.totalSellValue);
            addPositions(relics);
            displayedRelics = [...relics];
            loadInitialRelics();
        })
        .catch(err => {
            console.error("Failed to load relic data:", err);
            relicContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:3rem;">⚠️ Could not load relic data. Make sure RelicValues.json exists.</div>`;
        });

    // fetch last updated timestamp
    fetch("last_updated.json")
        .then(response => {
            if (!response.ok) throw new Error("No timestamp file");
            return response.json();
        })
        .then(data => {
            if (data && data.last_updated) {
                lastUpdatedDiv.textContent = `📅 Last updated: ${data.last_updated}`;
            } else {
                lastUpdatedDiv.textContent = `📡 Prices are live`;
            }
        })
        .catch(() => {
            lastUpdatedDiv.textContent = `📡 Market data: recent`;
        });

    // assign sorted ranking (position)
    function addPositions(sortedRelics) {
        sortedRelics.forEach((relic, idx) => {
            relic.position = idx + 1;
        });
    }

    // helper: get rarity class and remove text tag
    function getRarityClass(chance) {
        // using exact values from typical warframe relic drop chances
        if (Math.abs(chance - 2.0) < 0.01) return "rare";
        if (Math.abs(chance - 11.0) < 0.01) return "uncommon";
        if (Math.abs(chance - 25.33) < 0.01 || Math.abs(chance - 25.0) < 0.5) return "common";
        if (chance > 20) return "common";
        if (chance > 8) return "uncommon";
        return "rare";
    }

    // CREATE MODERN CARD — with tiered backgrounds (Gold/Silver/Bronze) and no text tags
    function createRelicCard(relic) {
        const card = document.createElement("div");
        card.classList.add("relic-card");

        // format numbers (platinum)
        const totalSell = relic.totalSellValue?.toFixed?.(1) ?? relic.totalSellValue ?? 0;
        const avgSell = relic.avgSellValue?.toFixed?.(1) ?? relic.avgSellValue ?? 0;
        const totalBuy = relic.totalBuyValue?.toFixed?.(1) ?? relic.totalBuyValue ?? 0;
        const avgBuy = relic.avgBuyValue?.toFixed?.(1) ?? relic.avgBuyValue ?? 0;

        // vault status
        const vaultStatusClass = relic.vaulted ? "vaulted" : "not-vaulted";
        const vaultText = relic.vaulted ? "VAULTED" : "UNVAULTED";

        // items HTML — NO text rarity badge, only background color classes
        const itemsHTML = relic.items
            ?.sort((a, b) => (a.chance ?? 0) - (b.chance ?? 0))
            .map(item => {
                const rarityClass = getRarityClass(item.chance);
                const sellVal = item.sellValue?.toFixed?.(1) ?? item.sellValue ?? 0;
                const buyVal = item.buyValue?.toFixed?.(1) ?? item.buyValue ?? 0;
                // applying tier-specific class: item-rare, item-uncommon, or item-common
                let tierClass = "";
                if (rarityClass === "rare") tierClass = "item-rare";
                else if (rarityClass === "uncommon") tierClass = "item-uncommon";
                else tierClass = "item-common";
                
                return `
                    <div class="item ${tierClass}">
                        <div class="item-info">
                            <span class="item-name">${escapeHtml(item.name)}</span>
                        </div>
                        <div class="item-values">
                            <span class="sell-value">${sellVal}p</span>
                            <span class="separator">/</span>
                            <span class="buy-value">${buyVal}p</span>
                        </div>
                    </div>
                `;
            }).join("") || '<div class="item item-common">No item data</div>';

        card.innerHTML = `
            <div class="relic-header">
                <h2>${relic.position}. ${escapeHtml(relic.name)}</h2>
                <span class="vault-status ${vaultStatusClass}">${vaultText}</span>
            </div>
            <div class="relic-stats">
                <div class="stat-block">
                    <div class="stat-label">💎 SELL</div>
                    <div class="stat-value sell">${totalSell}p <span style="font-size:0.7rem;">Avg: ${avgSell}p</span></div>
                </div>
                <div class="stat-block">
                    <div class="stat-label">📦 BUY</div>
                    <div class="stat-value buy">${totalBuy}p <span style="font-size:0.7rem;">Avg: ${avgBuy}p</span></div>
                </div>
            </div>
            <div class="items-container">
                ${itemsHTML}
            </div>
        `;

        return card;
    }

    // simple XSS protection
    function escapeHtml(str) {
        if (!str) return "";
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
            return c;
        });
    }

    // load more relics with lazy intersection
    function loadMoreRelics() {
        if (isLoading) return;
        isLoading = true;

        const fragment = document.createDocumentFragment();
        let added = 0;
        const end = Math.min(loadedCount + batchSize, displayedRelics.length);
        for (let i = loadedCount; i < end; i++) {
            const card = createRelicCard(displayedRelics[i]);
            fragment.appendChild(card);
            added++;
        }
        if (added > 0) {
            relicContainer.appendChild(fragment);
            loadedCount += added;
        }
        isLoading = false;

        // after loading, (re)set up observer for last card
        setupScrollObserver();
    }

    let observer = null;
    function setupScrollObserver() {
        if (observer) observer.disconnect();
        const allCards = document.querySelectorAll(".relic-card");
        if (allCards.length === 0 || loadedCount >= displayedRelics.length) return;
        const lastCard = allCards[allCards.length - 1];
        if (!lastCard) return;

        observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !isLoading && loadedCount < displayedRelics.length) {
                loadMoreRelics();
            }
        }, { threshold: 0.2, rootMargin: "0px 0px 120px 0px" });
        observer.observe(lastCard);
    }

    function resetAndReload() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        relicContainer.innerHTML = "";
        loadedCount = 0;
        loadMoreRelics(); // start loading fresh batch
    }

    function loadInitialRelics() {
        loadedCount = 0;
        relicContainer.innerHTML = "";
        loadMoreRelics();
    }

    // filtering logic (with search + vault)
    function applyFilters() {
        const searchText = searchBar.value.toLowerCase().trim();
        const vaultState = vaultFilter.value;

        displayedRelics = relics.filter(relic => {
            // search match: relic name or any item inside
            let matchesSearch = true;
            if (searchText !== "") {
                const nameMatch = relic.name.toLowerCase().includes(searchText);
                const itemMatch = relic.items.some(item => item.name.toLowerCase().includes(searchText));
                matchesSearch = nameMatch || itemMatch;
            }

            let matchesVault = true;
            if (vaultState === "vaulted") {
                matchesVault = relic.vaulted === true;
            } else if (vaultState === "not-vaulted") {
                matchesVault = relic.vaulted === false;
            } else {
                matchesVault = true;
            }

            return matchesSearch && matchesVault;
        });

        resetAndReload();
    }

    // debounced search for better UX
    let debounceTimer;
    function onSearchInput() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            applyFilters();
        }, 280);
    }

    function onVaultChange() {
        applyFilters();
    }

    searchBar.addEventListener("input", onSearchInput);
    vaultFilter.addEventListener("change", onVaultChange);
});