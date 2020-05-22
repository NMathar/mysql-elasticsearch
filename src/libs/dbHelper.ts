import mysql, {QueryError, RowDataPacket, FieldPacket} from "mysql"
import util from "util"
import {config} from "dotenv"

config()
const {MYSQL_DB, MYSQL_HOST, MYSQL_PORT, MYSQL_PASSWORD, MYSQL_USERNAME} = process.env
if (!MYSQL_DB || !MYSQL_HOST || !MYSQL_PORT || !MYSQL_PASSWORD || !MYSQL_USERNAME) {
    throw new Error("Please set all required Environment Variables")
    process.exit()
}

const mysqlConnection = mysql.createConnection({
    host: MYSQL_HOST,
    user: MYSQL_USERNAME,
    password: MYSQL_PASSWORD,
    database: MYSQL_DB,
    port: parseInt(MYSQL_PORT)
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const query = util.promisify((sql: string, options: any, cb: (err: QueryError | null, result: RowDataPacket[], fields: FieldPacket[]) => any) => mysqlConnection.query(
    sql,
    options,
    (err: QueryError | null, result: RowDataPacket[], fields: FieldPacket[]) => cb(err, result, fields)
))


export async function getPrimaryIdFieldName(tableName: string): Promise<string[]> {
    const row: RowDataPacket[] = await query(`SELECT k.column_name
                                              FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS t
                                                       JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
                                                            USING (constraint_name, table_schema, table_name)
                                              WHERE t.constraint_type = 'PRIMARY KEY'
                                                AND t.table_schema = ?
                                                AND t.table_name = ? `, [MYSQL_DB, tableName])
    const returnArray: string[] = []
    row.forEach((res: RowDataPacket) => {
        returnArray.push(res.column_name)
    })
    return returnArray
}


export async function getForeignKeys(tableName: string): Promise<RowDataPacket[]> {
    return await query(`SELECT TABLE_NAME,
                               COLUMN_NAME,
                               REFERENCED_COLUMN_NAME,
                               REFERENCED_TABLE_NAME
                        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                        WHERE REFERENCED_TABLE_SCHEMA = ?
                          AND (REFERENCED_TABLE_NAME = ?
                            OR TABLE_NAME = ?)`, [MYSQL_DB, tableName, tableName])
}
