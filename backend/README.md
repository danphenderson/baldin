# Backend

The backend contains all private resources.

## APP

The app is the main entry point for the backend. It is a FastAPI application that serves the frontend and provides the API for the frontend.

## Database

The database is a PostgreSQL database that is used to store all the data for the application.

## ETL

The ETL is a collection of scripts that are used to extract data from various sources, transform the data into a common format, and load the data into the datalake.


#### Ref:

There are a bunch of stealth playwriters in the world, all appearing to be unmaintained.

This is the latest attempt https://github.com/QIN2DIM/undetected-playwright
which references the one I am using


GlassDoor Scrapping:
https://iproyal.com/blog/scrape-data-from-glassdoor/

LinkedIn Scrapping:
https://www.scrapingbee.com/blog/scrape-linkedin/

Indeed Scapping:
https://iproyal.com/blog/scrape-data-from-glassdoor/


## Datalake

The datalake is a collection of data that is stored in a common format. The data is loaded into a PostgreSQL database and is used to power the API.
