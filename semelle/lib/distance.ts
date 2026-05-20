/**
 * Calcule la distance totale (en mètres) d'une liste de points GPS
 * fournis sous la forme [{ lat: number, lon: number }, ...].
 *
 * Utilise la formule de Haversine pour calculer la distance entre
 * points consécutifs. Retourne 0 si la liste contient moins de 2 points
 * ou si les points sont invalides.
 */
export function totalDistanceMeters(points: Array<{ lat: number; lon: number }>): number {
    if (!Array.isArray(points) || points.length < 2) return 0;

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371000; // rayon moyen de la Terre en mètres

    let total = 0;

    const valid = (p: unknown): p is { lat: number; lon: number } => {
        if (typeof p !== "object" || p === null) return false;
        const obj = p as Record<string, unknown>;
        if (!("lat" in obj) || !("lon" in obj)) return false;
        const lat = obj["lat"];
        const lon = obj["lon"];
        return (
            typeof lat === "number" &&
            typeof lon === "number" &&
            Number.isFinite(lat) &&
            Number.isFinite(lon)
        );
    };

    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        if (!valid(a) || !valid(b)) continue; // ignore segments with invalid points

        const dLat = toRad(b.lat - a.lat);
        const dLon = toRad(b.lon - a.lon);
        const lat1 = toRad(a.lat);
        const lat2 = toRad(b.lat);

        const sinDLat = Math.sin(dLat / 2);
        const sinDLon = Math.sin(dLon / 2);
        const h = sinDLat * sinDLat + sinDLon * sinDLon * Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
        const d = R * c;

        total += d;
    }

    return total;
}

export default totalDistanceMeters;
