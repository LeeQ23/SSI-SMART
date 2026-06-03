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
            downtimeVal: t.state !== 'running' ? 1 : 0,
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
                <div className="bg-gray-900/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl text-sm min-w-[150px]">
                    <p className="text-gray-400 mb-2 border-b border-white/10 pb-1">{data.dateDisplay} | <span className="text-white font-mono">{data.timeDisplay}</span></p>
                    <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs">
                        {data.state === 'running' ? (
                            <><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span><span className="text-green-400">RUNNING</span></>
                        ) : (
                            <><span className="w-2 h-2 rounded-full bg-red-500"></span><span className="text-red-400">DOWNTIME</span></>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    const ticks = useMemo(() => {
        if (chartData.length === 0) return [];
        const timestamps = chartData.map(d => d.timestamp);
        
        let min = timestamps[0];
        let max = timestamps[0];
        for (let i = 1; i < timestamps.length; i++) {
            if (timestamps[i] < min) min = timestamps[i];
            if (timestamps[i] > max) max = timestamps[i];
        }

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
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.6} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="colorDowntime" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.6} />
                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                            </linearGradient>
                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="4" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>
                        <XAxis
                            dataKey="timestamp"
                            type="number"
                            domain={['auto', 'auto']}
                            ticks={ticks}
                            tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                            stroke="#64748b"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis hide domain={[0, 1.3]} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '5 5' }} />

                        <Area
                            type="stepAfter"
                            dataKey="statusVal"
                            stroke="#10B981"
                            fill="url(#colorStatus)"
                            strokeWidth={3}
                            isAnimationActive={true}
                            animationDuration={1500}
                            filter="url(#glow)"
                        />
                        <Area
                            type="stepAfter"
                            dataKey="downtimeVal"
                            stroke="#EF4444"
                            fill="url(#colorDowntime)"
                            strokeWidth={3}
                            isAnimationActive={true}
                            animationDuration={1500}
                            filter="url(#glow)"
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap gap-8 mt-6 justify-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                <div className="flex items-center gap-3">
                    <span className="w-4 h-4 bg-emerald-500/20 border border-emerald-500 rounded-sm shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span> RUNNING
                </div>
                <div className="flex items-center gap-3">
                    <span className="w-4 h-4 bg-red-500/20 border border-red-500 rounded-sm shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span> DOWNTIME
                </div>
            </div>
        </div>
    );
});

export default StatusTimelineChart;
