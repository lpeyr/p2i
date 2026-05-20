import { query, Utilisateur } from "@/lib/db";

export async function getUser(id: number): Promise<Utilisateur> {
    return (await query<Utilisateur[]>("SELECT * FROM Utilisateur WHERE idUser = ?", [id]))[0];
}
