import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell, ComposedChart } from 'recharts';
import { useTranslation } from 'react-i18next';

const StatusTimelineChart = React.memo(({ timeline = [], height = 320 }) => {
    const { t } = useTranslation();

    const chartData = useMemo(() => {
        if (!timeline || timeline.length === 0) return [];

        return timeline.map(t => ({
            timestamp: new Date(t.timestamp).getTime(),
            timeDisplay: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            dateDisplay: new Date(t.timestamp).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' }),
            statusVal: t.state === 'running' ? 1 : 0,
            state: t.state
        }));
    }, [timeline]);

    if (chartData.length === 0) {
        return (
            <div style={{ height }} className="flex items-center justify-center text-gray-500 italic border border-white/10 rounded-lg">
                No timeline data available for this period.
            </div>
        );
    }

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="glass-panel p-3 border border-accent/50 text-sm">
                    <p className="text-gray-400 mb-1">{data.dateDisplay} | {data.timeDisplay}</p>
                    <p className="font-bold">
                        State: <span className={data.state === 'running' ? 'text-green-400' : 'text-red-400'}>{data.state ? data.state.toUpperCase() : (data.statusVal === 1 ? 'RUNNING' : 'DOWNTIME')}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    const ticks = useMemo(() => {
        if (chartData.length === 0) return [];
        const timestamps = chartData.map(d => d.timestamp);
        const min = Math.min(...timestamps);
        const max = Math.max(...timestamps);

        const start = new Date(min);
        start.setMinutes(start.getMinutes() >= 30 ? 30 : 0, 0, 0);

        const result = [];
        let current = start.getTime();
        while (current <= max) {
            result.push(current);
            current += 30 * 60 * 1000;
        }
        return result;
    }, [chartData]);

    return (
        <div className="w-full">
            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorStatus" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4FC3F7" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#4FC3F7" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="timestamp"
                            type="number"
                            domain={['auto', 'auto']}
                            ticks={ticks}
                            tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                            stroke="#94a3b8"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis hide domain={[0, 1.3]} />
                        <Tooltip content={<CustomTooltip />} />

                        <Area
                            type="stepAfter"
                            dataKey="statusVal"
                            stroke="#4FC3F7"
                            fill="url(#colorStatus)"
                            strokeWidth={2}
                            isAnimationActive={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap gap-4 mt-6 justify-center text-[10px] text-gray-500 uppercase tracking-tighter">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#4FC3F7]/40 border border-[#4FC3F7] rounded-sm"></span> Running
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 border border-[#4FC3F7] rounded-sm"></span> Downtime
                </div>
            </div>
        </div>
    );
});

export default StatusTimelineChart;
