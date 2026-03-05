import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
    const chartData = useMemo(() => {
        let startHour = 7;
        let endHour = 17;

        const name = shiftName.toLowerCase();
        if (name.includes('morning')) { startHour = 7; endHour = 17; }
        else if (name.includes('evening')) { startHour = 15; endHour = 23; }
        else if (name.includes('night')) { startHour = 23; endHour = 31; }

        const now = new Date();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const shiftStartTs = startOfToday.getTime() + (startHour * 3600 * 1000);
        const shiftEndTs = startOfToday.getTime() + (endHour * 3600 * 1000);

        // Filter and sort events within this shift
        const shiftEvents = events
            .map(e => ({ ...e, ts: new Date(e.timestamp).getTime() }))
            .filter(e => e.ts >= shiftStartTs && e.ts <= shiftEndTs)
            .sort((a, b) => a.ts - b.ts);

        // Generate data points
        const points = [];

        // 1. Shift Start
        points.push({ ts: shiftStartTs, good: 0, ng: 0, targetLine: 0 });

        // 2. Event points
        let cumGood = 0;
        let cumNG = 0;
        shiftEvents.forEach(e => {
            if (e.signal_type === 'good') cumGood++;
            if (e.signal_type === 'ng') cumNG++;

            // Only add if not in future
            if (e.ts <= now.getTime()) {
                points.push({
                    ts: e.ts,
                    good: cumGood,
                    ng: cumNG,
                    targetLine: (target / (shiftEndTs - shiftStartTs)) * (e.ts - shiftStartTs)
                });
            }
        });

        // 3. Current time point (tracker end)
        if (now.getTime() > shiftStartTs && now.getTime() < shiftEndTs) {
            points.push({
                ts: now.getTime(),
                good: cumGood,
                ng: cumNG,
                targetLine: (target / (shiftEndTs - shiftStartTs)) * (now.getTime() - shiftStartTs)
            });
        }

        // 4. Shift End Target Line (to ensure ideal path spans the full width)
        points.push({
            ts: shiftEndTs,
            good: null,
            ng: null,
            targetLine: target
        });

        // Add display time and percentage
        return points.sort((a, b) => a.ts - b.ts).map(p => ({
            ...p,
            timeDisplay: new Date(p.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            percent: p.good !== null ? ((p.good / target) * 100).toFixed(1) : null
        }));
    }, [events, target, shiftName]);

    // Calculate ticks for every hour
    const getTicks = () => {
        let startHour = 7;
        let endHour = 17;
        const name = shiftName.toLowerCase();
        if (name.includes('morning')) { startHour = 7; endHour = 17; }
        else if (name.includes('evening')) { startHour = 15; endHour = 23; }
        else if (name.includes('night')) { startHour = 23; endHour = 31; }

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const ticks = [];
        for (let h = startHour; h <= endHour; h++) {
            ticks.push(startOfToday.getTime() + (h * 3600 * 1000));
        }
        return ticks;
    };

    return (
        <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis
                        dataKey="ts"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        ticks={getTicks()}
                        tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        label={{ value: t('dashboard.time'), position: 'insideBottomRight', offset: -10, fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                    />
                    <YAxis
                        yAxisId="left"
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, target]}
                        label={{ value: t('dashboard.target'), angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10, fontWeight: 'bold', offset: 15 }}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 100]}
                        label={{ value: t('dashboard.percent'), angle: 90, position: 'insideRight', fill: '#94a3b8', fontSize: 10, fontWeight: 'bold', offset: 15 }}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#001F3F', border: '1px solid #0074D920', borderRadius: '8px' }}
                        itemStyle={{ fontSize: '12px' }}
                        labelFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        cursor={{ stroke: '#0074D9', strokeWidth: 1, strokeDasharray: '5 5' }}
                    />
                    <Legend verticalAlign="top" height={36} />

                    <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="targetLine"
                        stroke="none"
                        fill="#0074D905"
                        name="Ideal Path"
                        connectNulls={true}
                        isAnimationActive={false}
                    />

                    <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="good"
                        stroke="#22c55e"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 4 }}
                        name="Good"
                        connectNulls={false}
                        isAnimationActive={false}
                    />
                    <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="ng"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3 }}
                        name="NG"
                        connectNulls={false}
                        isAnimationActive={false}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ProductionProgressChart;
