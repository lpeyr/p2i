import { query, Utilisateur, Semelle } from "@/lib/db";

export async function getUser(id: number): Promise<Utilisateur> {
    return (await query<Utilisateur[]>("SELECT * FROM Utilisateur WHERE idUser = ?", [id]))[0];
}

export async function getSemellesFromUser(userId: number) {
    return await query<Semelle[]>("SELECT * FROM Semelle WHERE idUser = ?", [userId]);
}
