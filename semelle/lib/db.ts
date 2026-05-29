import "server-only";
import * as mariadb from "mariadb";

// Shared DB scalar types
export type DbId = number;
export type DbDateTime = Date | string;
export type DbTimestamp = Date | string;
export type DbBoolean = boolean | 0 | 1;
export type FootSide = "left" | "right";

// Table: Utilisateur
export interface Utilisateur {
    idUser: DbId;
    nom: string;
    prenom: string;
    role: string;
    age: number;
    poids: number;
    taille: number;
}

export type UtilisateurInsert = Omit<Utilisateur, "idUser">;
export type UtilisateurUpdate = Partial<UtilisateurInsert>;

// Table: Semelle
export interface Semelle {
    idSemelle: DbId;
    idUser: DbId;
    devEUI: string;
    side: FootSide;
}

export type SemelleInsert = Omit<Semelle, "idSemelle">;
export type SemelleUpdate = Partial<Omit<SemelleInsert, "idUser">>;

// Table: Session
export interface Session {
    idSession: DbId;
    dateDebut: DbDateTime;
    dateFin: DbDateTime | null;
    semelle1: DbId;
    semelle2: DbId;
    step: number | null;
    averageStepTime: number | null;
}

export type SessionInsert = {
    dateDebut: DbDateTime;
    dateFin?: DbDateTime | null;
    semelle1: DbId;
    semelle2: DbId;
    step?: number | null;
    averageStepTime?: number | null;
};
export type SessionUpdate = Partial<Omit<SessionInsert, "semelle1" | "semelle2">>;

// Table: MesureGPS
export interface MesureGPS {
    idMesure: DbId;
    time: DbTimestamp;
    lattitude: number | null;
    longitude: number | null;
    idSession: DbId;
    idSemelle: DbId;
}

export type MesureGPSInsert = {
    lattitude?: number | null;
    longitude?: number | null;
    idSession: DbId;
    idSemelle: DbId;
    time?: DbTimestamp;
};
export type MesureGPSUpdate = Partial<Omit<MesureGPSInsert, "idSession" | "idSemelle">>;

// Table: MesureFlexi
export interface MesureFlexi {
    idMesureFlexi: DbId;
    time: DbTimestamp;
    flexi1: DbBoolean;
    flexi2: DbBoolean;
    flexi3: DbBoolean;
    idSession: DbId;
    idSemelle: DbId;
}

export type MesureFlexiInsert = {
    flexi1: DbBoolean;
    flexi2: DbBoolean;
    flexi3: DbBoolean;
    idSession: DbId;
    idSemelle: DbId;
    time?: DbTimestamp;
};
export type MesureFlexiUpdate = Partial<Omit<MesureFlexiInsert, "idSession" | "idSemelle">>;

// Table: MesureAccel
export interface MesureAccel {
    id: DbId;
    time: DbTimestamp;
    accel: number;
    idSession: DbId;
    idSemelle: DbId;
}

export interface MesureAngle {
    idMesureAngle: DbId;
    time: DbTimestamp;
    yaw: number;
    pitch: number;
    roll: number;
    idSession: DbId;
    idSemelle: DbId;
}

// Maps utilitaires pour centraliser tous les types de tables
export interface DbModels {
    utilisateur: Utilisateur;
    semelle: Semelle;
    session: Session;
    mesureGPS: MesureGPS;
    mesureFlexi: MesureFlexi;
    mesureAccel: MesureAccel;
    mesureAngle: MesureAngle;
}

export interface DbInsertModels {
    utilisateur: UtilisateurInsert;
    semelle: SemelleInsert;
    session: SessionInsert;
    mesureGPS: MesureGPSInsert;
    mesureFlexi: MesureFlexiInsert;
}

export interface DbUpdateModels {
    utilisateur: UtilisateurUpdate;
    semelle: SemelleUpdate;
    session: SessionUpdate;
    mesureGPS: MesureGPSUpdate;
    mesureFlexi: MesureFlexiUpdate;
}

export const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5,
});

export async function query<T>(sql: string, params: unknown[] = []): Promise<T> {
    let conn;
    try {
        conn = await pool.getConnection();
        const s = await conn.query(sql, params);
        return s as T;
    } finally {
        if (conn) await conn.release();
    }
}
