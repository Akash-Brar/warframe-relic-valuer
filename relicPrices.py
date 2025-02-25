import requests
import time
import json
from datetime import datetime

# Relics.json from warframe-items (https://github.com/WFCD/warframe-items)
# Warframe Market API (https://warframe.market/api_docs)

WARFRAME_MARKET_URL = "https://api.warframe.market/v1"


# Calculates timmed/truncated mean, to remove extreme outliers
# Input: List(int)
# Output: 0 or float
def trimmedMean(prices, proportionToCut=0.2):
    n = len(prices)
    k = int(n * proportionToCut)
    sortedPrices = sorted(prices)
    trimmedPrices = sortedPrices[k : n - k]

    if len(trimmedPrices) == 0:
        return 0
    else:
        return sum(trimmedPrices) / len(trimmedPrices)

# Gets the prices from each order, and seperates them into buy and sell prices
# Input: json (orders of a single item)
# Output: 0 or float
def getPrices(orders):
    buyPrices = []
    sellPrices = []
    for order in orders["payload"]["orders"]:
        if order["order_type"] == "sell":
            sellPrices.append(order["platinum"])
        elif order["order_type"] == "buy":
            buyPrices.append(order["platinum"])
    return trimmedMean(buyPrices), trimmedMean(sellPrices)


# Fetches the item orders from Warframe Market
# Input: string
# Output: json (orders of a single item)
def getItemOrders(urlName):
    url = f"{WARFRAME_MARKET_URL}/items/{urlName}/orders"
    headers = {"Accept": "application/json", "User-Agent": "YourAppName/1.0"}

    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        return f"Error: {response.status_code}"


# Gets the buy and sell value of each item in each relic, and adds them to the
# parsed relic json
# Input: json (parsed/intact relics)
# Output: json (parsed/intact relics with prices)
def getValues(intactRelics):
    total = len(intactRelics)
    relicCount = 0
    fetchCount = 0

    for relic in intactRelics:
        relicCount += 1
        print(f"{relicCount}/{total}  {round((relicCount/total)*100)}%")
        totalSellValue = 0
        totalBuyValue = 0

        for item in relic["items"]:
            if "Forma" in item["name"]:
                item["sellValue"] = 0
                item["buyValue"] = 0
                continue

            # Can only get 3 orders per second
            if fetchCount > 0 and fetchCount % 3 == 0:
                time.sleep(1)

            orders = getItemOrders(item["url_name"])
            if type(orders) == str:
                item["sellValue"] = 0
                item["buyValue"] = 0
            else:
                buyPrice, sellPrice = getPrices(orders)
                item["sellValue"] = round(sellPrice, 1)
                item["buyValue"] = round(buyPrice, 1)
                totalSellValue += round(sellPrice, 1)
                totalBuyValue += round(buyPrice, 1)

            fetchCount += 1
        
        relic["totalSellValue"] = round(totalSellValue,1)
        relic["totalBuyValue"] = round(totalBuyValue,1)

    return intactRelics

# Parses Relics.json to get all unique relics, with their name, warframe
# market url, vaulted status, and the items in each relic. It also parses each
# item in each relic to get their namee, warframe market url, rarity, and
# chance.
# Input: string
# Output: json (parsed relics)
def getIntactRelics(filename):
    with open(filename, "r", encoding="utf-8") as file:
        relics = json.load(file)

    intact_relics = []

    for relic in relics:
        if "Intact" in relic.get("name", "") and "Requiem" not in relic.get("name", ""):

            if relic.get("marketInfo") == None:
                continue

            relic_info = {
                "name": relic["name"].replace(" Intact", ""),
                "urlName": relic["marketInfo"]["urlName"],
                "vaulted": relic.get("vaulted", True),
                "items": [],
            }

            for reward in relic.get("rewards", []):
                item = reward.get("item", {})
                item_info = {
                    "name": item.get("name", ""),
                    "url_name": item.get("warframeMarket", {}).get("urlName", ""),
                    "rarity": reward.get("rarity", ""),
                    "chance": reward.get("chance", 0),
                }
                relic_info["items"].append(item_info)

            intact_relics.append(relic_info)

    return intact_relics

# Logs the time the script finishes, and stores it into a json file
def logTime():
    now = datetime.now()
    formattedDate = now.strftime("%B %d, %Y %I:%M %p MST")
    timestamp_data = {"last_updated": formattedDate}
    with open("last_updated.json", "w") as f:
        json.dump(timestamp_data, f, indent=2)

def main():
    relicFile = "Relics.json"
    intactRelics = getIntactRelics(relicFile)
    relicValues = getValues(intactRelics)

    with open("RelicValues.json", "w", encoding="utf-8") as file:
        json.dump(relicValues, file, indent=2)

    logTime()

if __name__ == "__main__":
    main()

# Example url names with low orders:
# "ward_recovery"
# "undercroft_dax_camp_scene"
# "undercroft_lodging_scene"
# "undercroft_lunaro_scene"