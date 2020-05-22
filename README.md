# MySQL Sync to Elasticsearch

This is a command line tool that listen to your mysql bin logs and sync the entries to elasticsearch.

Tested with elasticsearch 5.6 and 7.6. Important change the api version with `ES_APIVERSION` to use
different elasticsearch versions.

## Installation

`npm install`

`cp .env_example .env`

## Run in Docker

`docker build -t mysql-elasticsearch-sync .`

`docker run -d --name  mysql-elasticsearch-sync --env MYSQL_HOST=test  mysql-elasticsearch-sync`

## Configuration

.env Environment Variables

```dotenv
# DATABASE CONFIG
MYSQL_HOST=localhost
MYSQL_USERNAME=root
MYSQL_PASSWORD=root
MYSQL_PORT=3306
MYSQL_DB=testdb
MYSQL_SYNC_TABLES=

# ELASTIC CONFIG
ES_URL=elasticsearch:9200
ES_APIVERSION=7.2
ES_USER=elastic
ES_PASSWORD=changeme
```

## Development Infos
`npm install`

`docker-compose up -d`

`npm start`

If you want du test some other mysql dumps remove all stuff `docker-compose down -v --rmi all`
replace the file under `test/data/mysql` and bring up the dev database again with `docker-compose up -d`
