# Warframe Relic Valuer

A web app that ranks Warframe relics from most to least valuable based on the sum of the truncated average platinum value of their contained items. Data is sourced from the Warframe Market API and relic information is pulled from WFCD's warframe-items repository.

<img width="1440" alt="Screenshot 2025-06-04 at 10 40 00 AM" src="https://github.com/user-attachments/assets/9ca70ca5-c367-4832-b122-3ac3ccbc72ce" />

## Features

- **Automatically Updated**: Data refreshes every Monday to ensure up-to-date valuations
- **Value Calculation**: Relics are ranked by the sum of the truncated average platinum value of their rewards
- **Comprehensive Data**: 
  - Real-time platinum prices from [Warframe Market](https://warframe.market/)
  - Relic drop tables from [WFCD/warframe-items](https://github.com/WFCD/warframe-items)
- **User-Friendly Interface**: Clean, sortable display of relic valuations

## How It Works

1. Fetches current item prices from Warframe Market API
2. Retrieves relic data from WFCD's warframe-items repository
3. For each relic:
   - Gets all possible reward items
   - Calculates each item's truncated average platinum value
   - Sums these values to determine the relic's total worth
4. Ranks relics from highest to lowest total value
5. Presents results in an easy-to-read format
