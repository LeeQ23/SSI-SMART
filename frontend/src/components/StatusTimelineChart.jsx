import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell, ComposedChart } from 'recharts';
import { useTranslation } from 'react-i18next';

const StatusTimelineChart = ({ timeline = [], productionEvents = [], height = 320, showEvents = true }) => {
    const { t } = useTranslation();

    const prepareData = () => {
        if (!timeline || timeline.length === 0) return [];

        // Combine timeline and events into a format suitable for ComposedChart
        // We'll use Area for status and Scatter for events

        // 1. Process Timeline (Area)
        const timelineData = timeline.map(t => ({
            timestamp: new Date(t.timestamp).getTime(),
            timeDisplay: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            dateDisplay: new Date(t.timestamp).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' }),
            statusVal: t.state === 'running' ? 1 : 0,
            state: t.state
        }));

        // 2. Process Events (Scatter)
        const eventData = productionEvents.map(e => ({
            timestamp: new Date(e.timestamp).getTime(),
            timeDisplay: new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            dateDisplay: new Date(e.timestamp).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' }),
            eventVal: 1.1, // Positioned slightly above the area chart (which goes 0 to 1)
            type: e.signal_type,
            name: e.signal_type === 'good' ? 'Good Product' : 'NG Product'
        }));

        // Combine and sort by timestamp
        const combined = [...timelineData, ...eventData].sort((a, b) => a.timestamp - b.timestamp);

        // Fill status gaps for events so the area chart stays continuous
        let lastStatus = 0;
        return combined.map(item => {
            if (item.statusVal !== undefined) {
                lastStatus = item.statusVal;
            } else {
                item.statusVal = lastStatus;
            }
            return item;
        });
    };

    const chartData = prepareData();

    if (chartData.length === 0) {
        return (
            <div style={{ height }} className="flex items-center justify-center text-gray-500 italic border border-white/10 rounded-lg">
                No timeline data available for this period.
            </div>
        );
    }

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="glass-panel p-3 border border-accent/50 text-sm">
                    <p className="text-gray-400 mb-1">{data.dateDisplay} | {data.timeDisplay}</p>
                    <p className="font-bold">
                        State: <span className={data.state === 'running' ? 'text-green-400' : 'text-red-400'}>{data.state ? data.state.toUpperCase() : (data.statusVal === 1 ? 'RUNNING' : 'DOWNTIME')}</span>
                    </p>
                    {data.type && (
                        <p className="mt-1 font-bold border-t border-white/10 pt-1">
                            Event: <span className={data.type === 'good' ? 'text-success' : 'text-danger'}>{data.name}</span>
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    const getTicks = () => {
        if (chartData.length === 0) return [];
        const timestamps = chartData.map(d => d.timestamp);
        const min = Math.min(...timestamps);
        const max = Math.max(...timestamps);

        // Align start to the previous 30-minute mark
        const start = new Date(min);
        start.setMinutes(start.getMinutes() >= 30 ? 30 : 0, 0, 0);

        const ticks = [];
        let current = start.getTime();
        while (current <= max) {
            ticks.push(current);
            current += 30 * 60 * 1000; // Add 30 minutes
        }
        return ticks;
    };

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
                            ticks={getTicks()}
                            tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                            stroke="#9CA3AF"
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
                            animationDuration={1000}
                            isAnimationActive={false}
                        />

                        {showEvents && (
                            <Scatter
                                dataKey="eventVal"
                                fill="#8884d8"
                                isAnimationActive={false}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.type === 'good' ? '#2ECC40' : entry.type === 'ng' ? '#FF4136' : 'transparent'}
                                    />
                                ))}
                            </Scatter>
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap gap-4 mt-6 justify-center text-xs text-gray-400">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-[#4FC3F7]/40 border border-[#4FC3F7] rounded-sm"></span> Running
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 border border-[#4FC3F7] rounded-sm"></span> Downtime
                </div>
                {showEvents && (
                    <>
                        <div className="flex items-center gap-2 ml-4">
                            <span className="w-2 h-2 rounded-full bg-[#2ECC40]"></span> Good Product
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#FF4136]"></span> NG Product
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default StatusTimelineChart;
