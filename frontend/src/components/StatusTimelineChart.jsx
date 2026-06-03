import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const StatusTimelineChart = React.memo(({ timeline = [], height = 60 }) => {
    const { t } = useTranslation();
    const [hoveredSegment, setHoveredSegment] = useState(null);

    const chartData = useMemo(() => {
        if (!timeline || timeline.length === 0) return { segments: [], totalDuration: 0, minTime: 0, maxTime: 0 };

        const segments = [];
        const timestamps = timeline.map(t => new Date(t.timestamp).getTime());
        const minTime = Math.min(...timestamps);
        
        // If the last event is still ongoing, extend it to 'now'
        const maxTime = Math.max(new Date().getTime(), Math.max(...timestamps));
        const totalDuration = maxTime - minTime;

        for (let i = 0; i < timeline.length; i++) {
            const current = timeline[i];
            const startTime = new Date(current.timestamp).getTime();
            const endTime = i < timeline.length - 1 ? new Date(timeline[i + 1].timestamp).getTime() : maxTime;
            
            const durationMs = endTime - startTime;
            const widthPercent = (durationMs / totalDuration) * 100;

            if (widthPercent > 0) {
                segments.push({
                    state: current.state,
                    startTime,
                    endTime,
                    widthPercent,
                    durationMs
                });
            }
        }

        return { segments, totalDuration, minTime, maxTime };
    }, [timeline]);

    if (chartData.segments.length === 0) {
        return (
            <div style={{ height: 120 }} className="flex items-center justify-center text-gray-500 italic border border-white/10 rounded-lg">
                No timeline data available for this period.
            </div>
        );
    }

    const formatTime = (ts) => {
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const formatDate = (ts) => {
        const d = new Date(ts);
        return d.toLocaleDateString([], { month: 'short', day: '2-digit' });
    };

    const formatDuration = (ms) => {
        const totalMinutes = Math.floor(ms / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    return (
        <div className="w-full relative py-6">
            {/* The Gantt Strip */}
            <div 
                className="w-full bg-white/5 rounded-full overflow-hidden flex shadow-inner relative"
                style={{ height }}
            >
                {chartData.segments.map((seg, idx) => {
                    const isRunning = seg.state === 'running';
                    const bgColor = isRunning ? 'bg-emerald-500' : 'bg-red-500';
                    const glowClass = isRunning ? 'shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'shadow-[0_0_10px_rgba(239,68,68,0.5)]';

                    return (
                        <div
                            key={idx}
                            style={{ width: `${seg.widthPercent}%` }}
                            className={`h-full ${bgColor} ${glowClass} opacity-80 hover:opacity-100 transition-opacity cursor-pointer border-r border-black/20 last:border-0`}
                            onMouseEnter={() => setHoveredSegment(seg)}
                            onMouseLeave={() => setHoveredSegment(null)}
                        />
                    );
                })}
            </div>

            {/* X-Axis Labels (Start and End) */}
            <div className="flex justify-between text-xs text-gray-500 mt-3 font-mono">
                <div>{formatDate(chartData.minTime)} {formatTime(chartData.minTime)}</div>
                <div>{formatDate(chartData.maxTime)} {formatTime(chartData.maxTime)}</div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-8 mt-6 justify-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                <div className="flex items-center gap-3">
                    <span className="w-4 h-4 bg-emerald-500/80 rounded-sm shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span> RUNNING
                </div>
                <div className="flex items-center gap-3">
                    <span className="w-4 h-4 bg-red-500/80 rounded-sm shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span> DOWNTIME
                </div>
            </div>

            {/* Floating Glassmorphism Tooltip */}
            {hoveredSegment && (
                <div className="absolute top-[-80px] left-1/2 transform -translate-x-1/2 bg-gray-900/95 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl text-sm min-w-[220px] pointer-events-none z-50">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                        <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs">
                            {hoveredSegment.state === 'running' ? (
                                <><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span className="text-emerald-400">RUNNING</span></>
                            ) : (
                                <><span className="w-2 h-2 rounded-full bg-red-500"></span><span className="text-red-400">DOWNTIME</span></>
                            )}
                        </div>
                        <span className="text-gray-400 font-mono text-xs">{formatDuration(hoveredSegment.durationMs)}</span>
                    </div>
                    <div className="flex justify-between text-gray-300 font-mono text-xs">
                        <span>{formatTime(hoveredSegment.startTime)}</span>
                        <span className="text-gray-600">→</span>
                        <span>{formatTime(hoveredSegment.endTime)}</span>
                    </div>
                </div>
            )}
        </div>
    );
});

export default StatusTimelineChart;
