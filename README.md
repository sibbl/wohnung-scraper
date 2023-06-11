# Wohnung Scraper

This tool scrapes several German online real estate listing websites and visualizes offers in a map.

Currently working and supported providers (as of 2023-06): Immobilienscout24, Kleinanzeigen.de

## Screenshot

![Screenshot](./images/screenshot.jpg)

## Features

- new offers are scraped regularly from various providers
- properties like the price, size and other features are extracted, parsed and stored
- addresses are converted into geo coordinates
- existing offers are checked for updates regularly, so that offers which were disabled or went offline, will be hidden
- all offers are shown on the map:
  - the color shows the price per m² from low (green) to red (high)
  - the number of edges of the polygon visualizes the number of rooms + 1 (so 2 rooms = triangle, 3 rooms = square, ...)
  - the size of the polygon shows the total size (the more m² the flat has, the bigger it is)
- the map allows filtering by the most important features (default set configurable)
- the map includes several helpful map layers
  - the usual boring street and satellite layers
  - public transport layer
  - noise map (thanks to the great work of [Berliner Morgenpost](https://interaktiv.morgenpost.de/laermkarte-berlin/))
  - custom OpenStreetMaps layer generated by Mapbox shows churches (might be noisy!)
  - more layers possible: schools (noisy in the morning), markets (shouldn't be too far away), other public transport (bike sharing stations, ...)
- it's possible to visualize how far you can get using public transport in e.g. 30 minutes from a selected marker on the map (there's a slider as well - big thanks to the great work of [Mapnificent](https://www.mapnificent.net))
- direct links to specific locations using public transport (e.g. BVG in Berlin) when selecting a marker (e.g. how long does it take to get to work)
- a telegram bot sends new offers matching the default filter as soon as they arrive, if they match given filters
- it's possible to set favorites for easier filtering and tracking

## Set up

1. Create your own `config.js` by using the `config.template.js` (especially fill API keys)
1. Use one of the following alternatives:
   1. Run `docker run -d -p 3000:80 -v /path/to/your/local_config.js:/app/config.js -v /path/to/local/data/folder:/app/data sibbl/wohnung-scraper:react-rewrite` to use the prebuilt Docker image from Docker Hub (requires Docker to be installed)
   1. Run `docker-compose up` to build and run the image locally (requires Docker to be installed)
   1. Run `npm run server:dev` to get the dev servers of both the backend and frontend up and running (requires node.js to be installed)
1. Get lucky on [localhost:3000](http://localhost:3000)

## Roadmap

Some further ideas:

- [ ] better mobile support
- [ ] maintain scrapers (some broke due to some missing dynamics in the screen scraping process; check if APIs changed)
- [ ] enhance filtering (extract more generic things like balcony or garage)
- [ ] localize frontend
- [ ] fix map layers
- [ ] support not only rentals, but also buying
- [ ] add support for more cities (more dynamic map layers & service integration... also, let users create scripts for cities which can be reused)
- [ ] use LLM to extract more information from the description or get further details about the area
- [ ] move to Typescript and Next.js. The code base is old as it was quickly extend whenever it was necessary...
- [ ] there's definitely more 🚀

## Remarks

Please note that the usage might be illegal as you scrape data which is not yours! I'm not affiliated with any of the sites scraped or tools used here and everything you do with it is on your own risk.
