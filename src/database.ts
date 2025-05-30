import * as SQLite from "expo-sqlite"
import type { ScannedCode } from "./models"

export async function connectDb() {
  return new Database(await SQLite.openDatabaseAsync("ScanQR"))
}

export class Database {
  constructor(private db: SQLite.SQLiteDatabase) {
    this.init()
  }

  close() {
    this.db.closeAsync()
  }

  private async init() {
    // Crear tabla inicial si no existe
    await this.db.execAsync(
      `CREATE TABLE IF NOT EXISTS codigos (
      id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
      data TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'qr'
    );`,
    )

    // Verificar si la columna timestamp existe y agregarla si no existe
    try {
      const tableInfo = await this.db.getAllAsync("PRAGMA table_info(codigos)")
      const hasTimestamp = tableInfo.some((column: any) => column.name === "timestamp")

      if (!hasTimestamp) {
        console.log("Agregando columna timestamp...")
        await this.db.execAsync(
          `ALTER TABLE codigos ADD COLUMN timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)`,
        )
        console.log("Columna timestamp agregada exitosamente")
      }
    } catch (error) {
      console.error("Error en migración:", error)
    }
  }

  async dropDB() {
    await this.db.execAsync("DROP TABLE IF EXISTS codigos;")
  }

  async insertarCodigo(data: string, type: string) {
    const result = await this.db.runAsync(
      "INSERT INTO codigos (data, type, timestamp) VALUES (?,?,?)",
      data,
      type,
      Date.now(),
    )
    return result
  }

  async consultarCodigos(): Promise<ScannedCode[]> {
    const result = await this.db.getAllAsync<ScannedCode>("SELECT * FROM codigos ORDER BY timestamp DESC")
    return result
  }

  async limpiarCodigos(): Promise<void> {
    await this.db.runAsync("DELETE FROM codigos")
  }

  async eliminarCodigo(id: string): Promise<void> {
    await this.db.runAsync("DELETE FROM codigos WHERE id = ?", id)
  }

  async existeCodigo(data: string): Promise<boolean> {
    const result = await this.db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM codigos WHERE data = ?",
      data,
    )
    return (result?.count || 0) > 0
  }
}
