document.addEventListener("DOMContentLoaded", () => {
    const relicContainer = document.getElementById("relics-container");
    const searchBar = document.getElementById("search-bar");
    const vaultFilter = document.getElementById("vault-filter");
    const refinementFilter = document.getElementById("refinement-filter");
    const sortFilter = document.getElementById("sort-filter");
    const lastUpdatedDiv = document.getElementById("last-updated");

    let relics = [];
    let displayedRelics = [];
    let loadedCount = 0;
    const batchSize = 20;
    let isLoading = false;
    let currentObserver = null;
    let currentRefinement = "intact";
    let currentSort = "total-sell-desc";

    // Refinement chance mapping
    const refinementChances = {
        intact: { rare: 2.00, uncommon: 11.00, common: 25.33 },
        exceptional: { rare: 4.00, uncommon: 13.00, common: 23.33 },
        flawless: { rare: 6.00, uncommon: 17.00, common: 20.00 },
        radiant: { rare: 10.00, uncommon: 20.00, common: 16.67 }
    };

    // ---------- fetch relic data ----------
    fetch("RelicValues.json")
        .then(response => {
            if (!response.ok) throw new Error("RelicValues.json not found");
            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data)) throw new Error("Invalid relic data");
            relics = data;
            displayedRelics = [...relics];
            applySort(); // Apply initial sort
            addPositions(displayedRelics);
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
                lastUpdatedDiv.textContent = `Last updated: ${data.last_updated}`;
            } else {
                lastUpdatedDiv.textContent = `Prices are live`;
            }
        })
        .catch(() => {
            lastUpdatedDiv.textContent = `Market data: recent`;
        });

    // assign sorted ranking (position)
    function addPositions(sortedRelics) {
        sortedRelics.forEach((relic, idx) => {
            relic.position = idx + 1;
        });
    }

    // Get the appropriate average value based on refinement
    function getRefinementAverage(relic, type, refinement) {
        const avgKey = `${refinement}Avg${type === 'sell' ? 'Sell' : 'Buy'}`;
        return relic[avgKey] || (type === 'sell' ? relic.totalSellValue : relic.totalBuyValue);
    }

    // Get the refined chance for an item based on its original rarity and current refinement
    function getRefinedChance(item, refinement) {
        const chances = refinementChances[refinement];
        const rarity = item.rarity;
        
        if (rarity === "Rare" && chances.rare !== undefined) {
            return chances.rare;
        } else if (rarity === "Uncommon" && chances.uncommon !== undefined) {
            return chances.uncommon;
        } else {
            // Common or default
            return chances.common || 25.33;
        }
    }

    // Sort relics based on current sort selection
    function applySort() {
        if (!displayedRelics.length) return;
        
        // Parse the sort value correctly
        // Examples: "total-sell-desc", "avg-buy-asc"
        const parts = currentSort.split('-');
        const sortOrder = parts.pop(); // Last part is always 'asc' or 'desc'
        const sortType = parts.join('-'); // Join the remaining parts as the sort type
        
        const isDescending = sortOrder === 'desc';
        
        console.log(`Sorting by: ${sortType}, Descending: ${isDescending}`); // Debug log
        
        displayedRelics.sort((a, b) => {
            let valueA, valueB;
            
            switch(sortType) {
                case 'total-sell':
                    valueA = a.totalSellValue || 0;
                    valueB = b.totalSellValue || 0;
                    break;
                case 'total-buy':
                    valueA = a.totalBuyValue || 0;
                    valueB = b.totalBuyValue || 0;
                    break;
                case 'avg-sell':
                    valueA = getRefinementAverage(a, 'sell', currentRefinement) || 0;
                    valueB = getRefinementAverage(b, 'sell', currentRefinement) || 0;
                    break;
                case 'avg-buy':
                    valueA = getRefinementAverage(a, 'buy', currentRefinement) || 0;
                    valueB = getRefinementAverage(b, 'buy', currentRefinement) || 0;
                    break;
                default:
                    console.warn(`Unknown sort type: ${sortType}, defaulting to total-sell`);
                    valueA = a.totalSellValue || 0;
                    valueB = b.totalSellValue || 0;
            }
            
            if (isDescending) {
                return valueB - valueA;
            } else {
                return valueA - valueB;
            }
        });
        
        // Reassign positions after sorting
        addPositions(displayedRelics);
    }

    // helper: get rarity class based on the item's rarity from JSON
    function getRarityClass(rarity) {
        if (rarity === "Rare") return "rare";
        if (rarity === "Uncommon") return "uncommon";
        return "common"; // Common or any other value
    }

    // Card creation
    function createRelicCard(relic) {
        const card = document.createElement("div");
        card.classList.add("relic-card");

        // Get the weighted average for the selected refinement
        const refinementAvgSell = getRefinementAverage(relic, 'sell', currentRefinement);
        const refinementAvgBuy = getRefinementAverage(relic, 'buy', currentRefinement);
        
        // Get the TOTAL (sum of all 6 items without weighting)
        const totalSell = relic.totalSellValue;
        const totalBuy = relic.totalBuyValue;
        
        // The weighted average for the refinement
        const avgSell = refinementAvgSell;
        const avgBuy = refinementAvgBuy;

        // Format numbers
        const formattedTotalSell = typeof totalSell === 'number' ? totalSell.toFixed(1) : totalSell;
        const formattedAvgSell = typeof avgSell === 'number' ? avgSell.toFixed(1) : avgSell;
        const formattedTotalBuy = typeof totalBuy === 'number' ? totalBuy.toFixed(1) : totalBuy;
        const formattedAvgBuy = typeof avgBuy === 'number' ? avgBuy.toFixed(1) : avgBuy;

        // vault status
        const vaultStatusClass = relic.vaulted ? "vaulted" : "not-vaulted";
        const vaultText = relic.vaulted ? "VAULTED" : "UNVAULTED";

        // refinement display text
        const refinementDisplay = {
            'intact': 'Intact',
            'exceptional': 'Exceptional',
            'flawless': 'Flawless',
            'radiant': 'Radiant'
        }[currentRefinement];

        // items HTML - using refined chances but rarity-based styling
        const itemsHTML = relic.items
            ?.sort((a, b) => {
                // Sort by original chance for consistent ordering
                const chanceA = a.chance ?? 0;
                const chanceB = b.chance ?? 0;
                return chanceA - chanceB;
            })
            .map(item => {
                // Get the refined chance based on current refinement
                const refinedChance = getRefinedChance(item, currentRefinement);
                // Get CSS class based on the item's rarity from JSON (not the chance)
                const rarityClass = getRarityClass(item.rarity);
                let tierClass = "";
                if (rarityClass === "rare") tierClass = "item-rare";
                else if (rarityClass === "uncommon") tierClass = "item-uncommon";
                else tierClass = "item-common";
                
                return `
                    <div class="item ${tierClass}">
                        <div class="item-info">
                            <span class="item-name">${escapeHtml(item.name)}</span>
                            <span class="item-chance">${refinedChance.toFixed(1)}%</span>
                        </div>
                        <div class="item-values">
                            <span class="sell-value">${(item.sellValue?.toFixed?.(1) ?? item.sellValue ?? 0)}p</span>
                            <span class="separator">/</span>
                            <span class="buy-value">${(item.buyValue?.toFixed?.(1) ?? item.buyValue ?? 0)}p</span>
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
                    <div class="stat-label">💎 SELL VALUE</div>
                    <div class="stat-value sell">${formattedTotalSell}p</div>
                    <div class="stat-sub">${refinementDisplay} Avg: ${formattedAvgSell}p</div>
                </div>
                <div class="stat-block">
                    <div class="stat-label">📦 BUY VALUE</div>
                    <div class="stat-value buy">${formattedTotalBuy}p</div>
                    <div class="stat-sub">${refinementDisplay} Avg: ${formattedAvgBuy}p</div>
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
        loadMoreRelics();
    }

    function loadInitialRelics() {
        loadedCount = 0;
        relicContainer.innerHTML = "";
        loadMoreRelics();
    }

    // filtering logic (search + vault + refinement + sort)
    function applyFilters() {
        const searchText = searchBar.value.toLowerCase().trim();
        const vaultState = vaultFilter.value;
        currentRefinement = refinementFilter.value;

        console.log(`Applying filters - Search: "${searchText}", Vault: ${vaultState}, Refinement: ${currentRefinement}`); // Debug log

        // First filter by search and vault
        let filteredRelics = relics.filter(relic => {
            // search match: relic name or any item inside
            let matchesSearch = true;
            if (searchText !== "") {
                const nameMatch = relic.name.toLowerCase().includes(searchText);
                const itemMatch = relic.items && relic.items.some(item => item.name.toLowerCase().includes(searchText));
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
        
        displayedRelics = filteredRelics;
        
        // Apply sorting
        applySort();
        
        console.log(`Filtered to ${displayedRelics.length} relics`); // Debug log
        
        resetAndReload();
    }

    // Handle sort changes
    function onSortChange() {
        console.log(`Sort changed to: ${sortFilter.value}`); // Debug log
        currentSort = sortFilter.value;
        applySort();
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

    function onRefinementChange() {
        applyFilters();
    }

    searchBar.addEventListener("input", onSearchInput);
    vaultFilter.addEventListener("change", onVaultChange);
    refinementFilter.addEventListener("change", onRefinementChange);
    sortFilter.addEventListener("change", onSortChange);
    
    // Initial debug to check if elements exist
    console.log("Script loaded, elements found:", {
        searchBar: !!searchBar,
        vaultFilter: !!vaultFilter,
        refinementFilter: !!refinementFilter,
        sortFilter: !!sortFilter
    });
});