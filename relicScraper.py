from bs4 import BeautifulSoup
import requests
import json


def getRelicTableHTML():
    relic_url = 'https://wiki.warframe.com/w/Void_Relic/ByRelic'
    table_class = 'article-table' # article-table sortable jquery-tablesorter

    response = requests.get(relic_url)
    soup = BeautifulSoup(response.content, 'html.parser')

    relic_table = soup.find('table', attrs={'class': table_class})
    return relic_table


def parseRelicTable(relic_table):
    relic_data = []

    rows = relic_table.find_all('tr')[1:]  # Skip header row

    for row in rows:
        cells = row.find_all('td')
        name = cells[1].get_text(strip=True)
        relic_url_name = name.replace(' ', '_').lower()

        relic = {
            'name': name,
            'urlName': relic_url_name + '_relic',
            'vaulted': None,
            'items': []
        }

        if 'Vaulted' in cells[2].get_text(strip=True):
            relic['vaulted'] = True
        else:
            relic['vaulted'] = False

        for i in range(3, 6):
            for item in cells[i].find_all('li'):
                item_name = item.get_text(strip=True)
                item_url_name = item_name.replace(' ', '_').lower()

                if i == 3:
                    rarity = 'Common'
                    chance = 25.33
                elif i == 4:
                    rarity = 'Uncommon'
                    chance = 11
                elif i == 5:
                    rarity = 'Rare'
                    chance = 2

                item_info = {
                    'name': item_name,
                    'url_name': item_url_name,
                    'rarity': rarity,
                    'chance': chance,
                }
                relic['items'].append(item_info)
        
        relic_data.append(relic)
    return relic_data
    
def saveRelicsToJSON(relic_data):
    with open('Relics.json', 'w', encoding='utf-8') as json_file:
        json.dump(relic_data, json_file, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    relic_table = getRelicTableHTML()
    relic_data = parseRelicTable(relic_table)
    saveRelicsToJSON(relic_data)
    print(f"Successfully saved {len(relic_data)} relics to 'Relics.json'")