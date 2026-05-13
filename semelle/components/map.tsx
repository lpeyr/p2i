"use client";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export interface MapProps {
    route: [number, number][];
}

export default function MapView({ route }: Readonly<MapProps>) {
    const start = route[0];
    const end = route.at(-1) || [0, 0];
    return (
        <MapContainer
            center={start}
            zoom={18}
            style={{ height: "600px", width: "100%", borderRadius: "12px", zIndex: 1 }}
            scrollWheelZoom={false}
        >
            <TileLayer
                zIndex={1}
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={start}>
                <Popup>
                    A pretty CSS3 popup. <br /> Easily customizable.
                </Popup>
            </Marker>

            <Marker position={start}>
                <Popup>Départ</Popup>
            </Marker>

            <Marker position={end}>
                <Popup>Arrivée</Popup>
            </Marker>

            <Polyline positions={route} pathOptions={{ color: "red", weight: 4 }} />
        </MapContainer>
    );
}
