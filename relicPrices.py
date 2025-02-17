import requests
import time
import json

WARFRAME_MARKET_URL = "https://api.warframe.market/v1"


def trimmedMean(prices, proportionToCut=0.2):
    n = len(prices)
    k = int(n * proportionToCut)
    sortedPrices = sorted(prices)
    trimmedPrices = sortedPrices[k : n - k]

    if len(trimmedPrices) == 0:
        return 0
    else:
        return sum(trimmedPrices) / len(trimmedPrices)


def getPrices(orders):
    buyPrices = []
    sellPrices = []
    for order in orders["payload"]["orders"]:
        if order["order_type"] == "sell":
            sellPrices.append(order["platinum"])
        elif order["order_type"] == "buy":
            buyPrices.append(order["platinum"])
    return trimmedMean(buyPrices), trimmedMean(sellPrices)


def getItemOrders(urlName):
    url = f"{WARFRAME_MARKET_URL}/items/{urlName}/orders"
    headers = {"Accept": "application/json", "User-Agent": "YourAppName/1.0"}

    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        return f"Error: {response.status_code}"


def fetchOrders(intactRelics):
    total = len(intactRelics)
    relicCount = 0
    fetchCount = 0

    for relic in intactRelics:
        relicCount += 1
        print(f"{relicCount}/{total}")

        for item in relic["items"]:
            if "Forma" in item["name"]:
                item["sellValue"] = 0
                item["buyValue"] = 0
                continue

            # Can only get 3 orders per second
            if fetchCount > 0 and fetchCount % 3 == 0:
                time.sleep(1)

            orders = getItemOrders(item["url_name"])
            buyPrice, sellPrice = getPrices(orders)
            item["sellValue"] = round(sellPrice, 1)
            item["buyValue"] = round(buyPrice, 1)

            fetchCount += 1

    return intactRelics


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


def main():
    relicFile = "Relics.json"
    intactRelics = getIntactRelics(relicFile)
    relicValues = fetchOrders(intactRelics)

    with open("RelicValues.json", "w", encoding="utf-8") as file:
        json.dump(relicValues, file, indent=2)


if __name__ == "__main__":
    # items = ["ward_recovery", "undercroft_dax_camp_scene", "undercroft_lodging_scene", "undercroft_lunaro_scene", ]
    main()
