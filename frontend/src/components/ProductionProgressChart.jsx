import React, { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Area,
    ComposedChart
} from 'recharts';

const ProductionProgressChart = ({ events = [], target = 1000, shiftName = 'Morning' }) => {
    const data = useMemo(() => {
        // Match user's specific scale request: Morning 7-17
        let startHour = 7;
        let endHour = 17;

        const name = shiftName.toLowerCase();
        if (name.includes('morning')) {
            startHour = 7;
            endHour = 17;
        } else if (name.includes('evening')) {
            startHour = 15;
            endHour = 23;
        } else if (name.includes('night')) {
            startHour = 23;
            endHour = 31; // 07:00 next day
        }

        const hours = [];
        for (let h = startHour; h <= endHour; h++) {
            hours.push(h);
        }

        let cumulativeGood = 0;
        let cumulativeNG = 0;

        return hours.map(hour => {
            const hDisplay = hour % 24;
            const hourEvents = events.filter(e => {
                const eventDate = new Date(e.timestamp);
                const eventHour = eventDate.getHours();
                const eventDay = eventDate.getDate();

                // Simplified day-crossing logic for Night shift
                if (hour >= 24) {
                    // This is "tomorrow" in shift terms
                    return eventHour === hDisplay;
                }
                return eventHour === hDisplay;
            });

            const hourGood = hourEvents.filter(e => e.signal_type === 'good').length;
            const hourNG = hourEvents.filter(e => e.signal_type === 'ng').length;

            cumulativeGood += hourGood;
            cumulativeNG += hourNG;

            return {
                hour: `${hDisplay}:00`,
                good: cumulativeGood,
                ng: cumulativeNG,
                percent: ((cumulativeGood / target) * 100).toFixed(1),
                targetLine: (target / (hours.length - 1)) * (hour - startHour) // Ideal linear path
            };
        });
    }, [events, target, shiftName]);

    return (
        <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis
                        dataKey="hour"
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    {/* Left Y-Axis: Units */}
                    <YAxis
                        yAxisId="left"
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, target]}
                        label={{ value: 'Units', angle: -90, position: 'insideLeft', offset: 10, fill: '#94a3b8', fontSize: 10 }}
                    />
                    {/* Right Y-Axis: Percentage */}
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 100]}
                        label={{ value: '% Target', angle: 90, position: 'insideRight', offset: 10, fill: '#94a3b8', fontSize: 10 }}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#001F3F', border: '1px solid #0074D920', borderRadius: '8px' }}
                        itemStyle={{ fontSize: '12px' }}
                    />
                    <Legend verticalAlign="top" height={36} />

                    {/* Ideal Production Area (Subtle Path) */}
                    <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="targetLine"
                        stroke="none"
                        fill="#0074D905"
                        name="Ideal Path"
                    />

                    <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="good"
                        stroke="#22c55e"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#22c55e' }}
                        activeDot={{ r: 6 }}
                        name="Good"
                    />
                    <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="ng"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#ef4444' }}
                        name="NG"
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ProductionProgressChart;
