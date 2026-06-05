import { Acceleration } from "@/actions/session";
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

interface AccelChartProps {
    data: { acc1: Acceleration[]; acc2: Acceleration[] };
}

const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });

const mergeSeries = (seriesMap: { acc1: Acceleration[]; acc2: Acceleration[] }) => {
    const byTimestamp = new Map();

    Object.entries(seriesMap).forEach(([key, points]) => {
        points.forEach(({ timestamp, value }) => {
            if (!byTimestamp.has(timestamp)) {
                byTimestamp.set(timestamp, { timestamp });
            }
            byTimestamp.get(timestamp)[key] = value;
        });
    });

    return Array.from(byTimestamp.values())
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((row) => ({
            ...row,
            acc1: row.acc1 ?? null,
            acc2: row.acc2 ?? null,
        }));
};
export function AccelChart({ data }: Readonly<AccelChartProps>) {
    const d = mergeSeries(data);
    return (
        <div style={{ width: "100%", height: 320 }}>
            {d.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={d}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="timestamp"
                            type="number"
                            domain={["dataMin", "dataMax"]}
                            tickFormatter={formatTime}
                        />
                        <YAxis />
                        <Tooltip
                            labelFormatter={(ts) => new Date(ts).toLocaleString("fr-FR")}
                            contentStyle={{
                                backgroundColor: "var(--default)",
                                borderColor: "var(--accent)",
                                borderRadius: 10,
                            }}
                        />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="acc1"
                            stroke="#ff696f"
                            strokeWidth={2}
                            dot={true}
                            connectNulls={true}
                        />

                        <Line
                            type="monotone"
                            dataKey="acc2"
                            stroke="#006494"
                            strokeWidth={2}
                            dot={true}
                            connectNulls={true}
                        />
                    </LineChart>
                </ResponsiveContainer>
            ) : (
                <p>Pas de données à afficher pour le moment</p>
            )}
        </div>
    );
}
