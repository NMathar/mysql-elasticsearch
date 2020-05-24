import {Client} from "@elastic/elasticsearch"
import {config} from "dotenv"

class Elastic {
    esClient: Client

    constructor() {
        config()
        this.esClient = new Client({
            node: process.env.ES_URL,
            auth: {
                username: process.env.ES_USER || '',
                password: process.env.ES_PASSWORD || ''
            }
        })
    }

    get client(): Client {
        return this.esClient
    }
}

export const elasticClient = new Elastic().client
