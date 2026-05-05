import requests
import time
import json
from datetime import datetime

# Warframe Market API (https://warframe.market/api_docs)

WARFRAME_MARKET_URL = "https://api.warframe.market/v2/"


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
    for order in orders["data"]:
        if order["type"] == "sell":
            sellPrices.append(order["platinum"])
        elif order["type"] == "buy":
            buyPrices.append(order["platinum"])
    return trimmedMean(buyPrices), trimmedMean(sellPrices)


# Fetches the item orders from Warframe Market
# Input: string
# Output: json (orders of a single item)
def getItemOrders(urlName):
    url = f"{WARFRAME_MARKET_URL}/orders/item/{urlName}"
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

    fetchedItems = {}

    for relic in intactRelics:
        relicCount += 1
        print(f"{relicCount}/{total}  {round((relicCount/total)*100)}%")

        for item in relic["items"]:
            if item["name"] in fetchedItems:
                continue

            if "Forma" in item["name"]:
                fetchedItems[item["name"]] = {"buyValue": 0, "sellValue": 0}
                continue

            # Can only get 3 orders per second
            if fetchCount > 0 and fetchCount % 3 == 0:
                time.sleep(1)

            orders = getItemOrders(item["url_name"])
            if type(orders) == str:
                fetchedItems[item["name"]] = {"buyValue": 0, "sellValue": 0}
            else:
                buyPrice, sellPrice = getPrices(orders)
                fetchedItems[item["name"]] = {
                    "buyValue": round(buyPrice, 1),
                    "sellValue": round(sellPrice, 1),
                }

            fetchCount += 1

    return fetchedItems

def addValuesToRelics(intactRelics, itemValues):
    for relic in intactRelics:
        totalBuyValue = 0
        totalSellValue = 0
        for item in relic["items"]:
            buyValue = itemValues[item["name"]]["buyValue"]
            sellValue = itemValues[item["name"]]["sellValue"]
            item["buyValue"] = buyValue
            item["sellValue"] = sellValue
            totalBuyValue += buyValue
            totalSellValue += sellValue
        relic["totalBuyValue"] = round(totalBuyValue, 1)
        relic["avgBuyValue"] = round(totalBuyValue/6, 1)
        relic["totalSellValue"] = round(totalSellValue, 1)
        relic["avgSellValue"] = round(totalSellValue/6, 1)
    return intactRelics


# Logs the time the script finishes, and stores it into a json file
def logTime():
    now = datetime.now()
    formattedDate = now.strftime("%B %d, %Y")
    timestamp_data = {"last_updated": formattedDate}
    with open("last_updated.json", "w") as f:
        json.dump(timestamp_data, f, indent=2)


def main():
    filename = "Relics.json"
    with open(filename, "r", encoding="utf-8") as file:
        intactRelics = json.load(file)
    itemValues = getValues(intactRelics)
    relicValues = addValuesToRelics(intactRelics, itemValues)

    with open("RelicValues.json", "w", encoding="utf-8") as file:
        json.dump(relicValues, file, indent=2)

    logTime()
    # orders = getItemOrders("ward_recovery")
    # print(orders)


if __name__ == "__main__":
    main()

# Example url names with low orders:
# "ward_recovery"
# "undercroft_dax_camp_scene"
# "undercroft_lodging_scene"
# "undercroft_lunaro_scene"
