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

interface ElevationChartProps {
    data: number[];
}

export function ElevationChart({ data }: Readonly<ElevationChartProps>) {
    const d = data.map((altitude, i) => ({
        i,
        altitude,
    }));
    return (
        <div style={{ width: "100%", height: 200 }}>
            {data.length > 0 ? (
                <ResponsiveContainer>
                    <LineChart data={d}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="i" />
                        <YAxis domain={["dataMin", "dataMax"]} />
                        <Tooltip />
                        <Line
                            type="monotone"
                            dataKey="altitude"
                            stroke="#2563eb"
                            strokeWidth={2}
                            dot={false}
                        />
                        <Tooltip
                            labelFormatter={(ts) => `Mesure #${ts}`}
                            contentStyle={{
                                backgroundColor: "var(--default)",
                                borderColor: "var(--accent)",
                                borderRadius: 10,
                            }}
                        />
                        <Legend />
                    </LineChart>
                </ResponsiveContainer>
            ) : (
                <p>Pas de données à afficher pour le moment</p>
            )}
        </div>
    );
}
