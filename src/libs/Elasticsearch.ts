import {Client} from "elasticsearch"
import {config} from "dotenv"

class Elastic {
    esClient: Client

    constructor() {
        config()
        this.esClient = new Client({
            host: process.env.ES_URL,
            // log: "trace",
            apiVersion: process.env.ES_APIVERSION,
            httpAuth: `${process.env.ES_USER}:${process.env.ES_PASSWORD}`
        })
    }

    get client(): Client {
        return this.esClient
    }
}

export const elasticClient = new Elastic().client
