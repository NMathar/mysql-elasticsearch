import RowDataPacket from "mysql/lib/protocol/packets/RowDataPacket"

export interface RelationData {
    tableName: string;
    referenceTable: string;
    refColumnName: string;
    column: string;
    value: number;
    data: RowDataPacket | null | RowDataPacket[];
}
