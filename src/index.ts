import {elasticClient} from "./libs/Elasticsearch"
import {config} from "dotenv"
import {getForeignKeys, getPrimaryIdFieldName, query} from "./libs/dbHelper"
import {RowDataPacket} from "mysql"
import {RelationData} from "./interfaces/relationData"

config()
// check if required process envs are set
const {MYSQL_DB, MYSQL_HOST, MYSQL_PORT, MYSQL_PASSWORD, MYSQL_USERNAME} = process.env
if (!MYSQL_DB || !MYSQL_HOST || !MYSQL_PORT || !MYSQL_PASSWORD || !MYSQL_USERNAME) {
    throw new Error("Please set all required Environment Variables")
    process.exit()
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ZongJi = require("zongji")
const zongji = new ZongJi({
    host: MYSQL_HOST,
    port: parseInt(MYSQL_PORT),
    user: MYSQL_USERNAME,
    password: MYSQL_PASSWORD,
    database: MYSQL_DB
})

function stopBinlog(): void {
    zongji.stop()
    process.exit()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function eventOperations(eventName: string, tableName: string, id: string, data: any): Promise<void> {
    // insert in ES on writerows
    if (eventName === "writerows") {
        // console.log("INSERT DATA ROWS: ", data)
        await elasticClient.create({
            index: tableName,
            type: tableName,
            id,
            body: data
        })

    }
    // update ES on updaterows
    if (eventName === "updaterows") {
        const exists = await elasticClient.exists({
            index: tableName,
            type: tableName,
            id
        })
        if (exists) {
            // console.log("UPDATE DATA ROW: ", data)
            await elasticClient.update({
                index: tableName,
                type: tableName,
                id,
                body: {
                    doc: data
                }
            })
        }
    }
    // delete ES entry on deleterows
    if (eventName === "deleterows") {
        const exists = await elasticClient.exists({
            index: tableName,
            type: tableName,
            id
        })
        if (exists) {
            // console.log("DELETE DATA ROW: ", data)
            await elasticClient.delete({
                index: tableName,
                type: tableName,
                id
            })
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getRelationData(tableName: string, data: any): Promise<RelationData[]> {
    const foreignKeys: RowDataPacket[] = await getForeignKeys(tableName)
    const queryObjectArray: RelationData[] = []
    for (const row of foreignKeys) {
        if (row.COLUMN_NAME in data) {
            const relData: RowDataPacket[] = await query(`SELECT * FROM ${row.REFERENCED_TABLE_NAME} WHERE ${row.REFERENCED_COLUMN_NAME} = ${data[row.COLUMN_NAME]} LIMIT 1`, [])
            
            queryObjectArray.push({
                tableName: row.TABLE_NAME,
                referenceTable: row.REFERENCED_TABLE_NAME,
                refColumnName: row.REFERENCED_COLUMN_NAME,
                column: row.COLUMN_NAME,
                value: data[row.COLUMN_NAME],
                data: relData[0]
            })
        } else {
            const relForeignKeys: RowDataPacket[] = await getForeignKeys(row.TABLE_NAME)
            const relData: RowDataPacket[] = await query(`SELECT * FROM ${row.TABLE_NAME} WHERE ${row.COLUMN_NAME} = ${data.id}`, [])
            const resolvedRelData: RowDataPacket[] = []


            for (const relTable of relForeignKeys) {
                if (relTable.COLUMN_NAME !== row.COLUMN_NAME) {
                    for(const relRow of relData){
                        const relData: RowDataPacket[] = await query(`SELECT * FROM ${relTable.REFERENCED_TABLE_NAME} WHERE ${relTable.REFERENCED_COLUMN_NAME} = ${relRow[relTable.COLUMN_NAME]} LIMIT 1`, [])
                        resolvedRelData.push(relData[0])
                    }
                }
            }

            queryObjectArray.push({
                tableName: row.TABLE_NAME,
                referenceTable: row.REFERENCED_TABLE_NAME,
                refColumnName: row.REFERENCED_COLUMN_NAME,
                column: row.TABLE_NAME,
                value: data[row.COLUMN_NAME],
                data: data[row.REFERENCED_TABLE_NAME] = resolvedRelData
            })
        }
    }
    return queryObjectArray
}

const eventNames = ['tablemap', 'writerows', 'updaterows', 'deleterows']
const tablesArray: string[] | null = process.env.MYSQL_SYNC_TABLES ? process.env.MYSQL_SYNC_TABLES.split(',') : null

// Each change to the replication log results in an event
// eslint-disable-next-line @typescript-eslint/no-explicit-any
zongji.on('binlog', async (evt: any) => {
    try {
        if (evt.rows) {
            const tableName: string = evt.tableMap[evt.tableId].tableName
            const idFieldNames: string[] = await getPrimaryIdFieldName(tableName)

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rowArray: Array<any> = evt.rows

            for (const rowData of rowArray) {
                // on updaterows data has a before and after key
                const data: any = evt.getEventName() === "updaterows" ? rowData.after : rowData
                const relData: RelationData[] = await getRelationData(tableName, data)
                // generate a unique id for relation tables
                const id: string = idFieldNames.map((idName: string) => data[idName]).join('_')


                // replace relational ids with data objects for relations
                relData.forEach((rel: RelationData) => {
                    delete Object.assign(data, {[rel.referenceTable]: data[rel.column]})[rel.column]
                    data[rel.tableName] = rel.data
                })
                
                // delete entries in related tables
                if (evt.getEventName() === "deleterows") {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    for (const [key, value] of Object.entries(evt.tableMap)) {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                        // @ts-ignore
                        await eventOperations(evt.getEventName(), value.tableName, id, data)
                    }
                } else {
                    await eventOperations(evt.getEventName(), tableName, id, data)
                }
            }
        }
    } catch (e) {
        console.log(e)
        stopBinlog()
    }
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unused-vars
zongji.on('ready', async (evt: any) => {
    try {
        console.log('Start Elasticsearch and check connection')
        await elasticClient.ping({requestTimeout: 1000})
    } catch (e) {
        console.log("Elasticsearch error")
        stopBinlog()
    }
})

// Binlog must be started, optionally pass in filters
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const includeSchema: any = {}
includeSchema[MYSQL_DB] = tablesArray ? tablesArray : true
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const startOptions: any = {
    startAtEnd: true,
    includeEvents: eventNames,
    includeSchema
}
zongji.start(startOptions)

process.on('SIGINT', function () {
    console.log('Got SIGINT.')
    stopBinlog()
})
