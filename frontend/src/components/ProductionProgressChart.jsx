import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Area,
    Line,
    ComposedChart
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Custom Tooltip to show Ahead/Behind status
const CustomTooltip = ({ active, payload, label, targetTotal }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const timeStr = new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const good = data.good || 0;
        const ng = data.ng || 0;
        const target = Math.round(data.targetLine || 0);
        
        let statusColor = "text-gray-400";
        let statusText = "On Target";
        let StatusIcon = Minus;
        
        if (data.good !== null && data.targetLine !== undefined) {
            const diff = good - target;
            if (diff > 0) {
                statusColor = "text-green-400";
                statusText = `Ahead by +${diff}`;
                StatusIcon = TrendingUp;
            } else if (diff < 0) {
                statusColor = "text-red-400";
                statusText = `Behind by ${diff}`;
                StatusIcon = TrendingDown;
            }
        }

        return (
            <div className="bg-gray-900/95 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl min-w-[200px]">
                <p className="text-gray-300 font-bold mb-3 border-b border-white/10 pb-2">{timeStr}</p>
                
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Target (Ideal):</span>
                        <span className="text-blue-400 font-bold">{target}</span>
                    </div>
                    {data.good !== null && (
                        <>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-sm">Actual Good:</span>
                                <span className="text-green-400 font-bold">{good}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-sm">Actual NG:</span>
                                <span className="text-red-400 font-bold">{ng}</span>
                            </div>
                            
                            <div className={`mt-3 pt-2 border-t border-white/5 flex items-center justify-between ${statusColor}`}>
                                <span className="text-xs uppercase tracking-wider font-bold">Status</span>
                                <div className="flex items-center gap-1 font-bold">
                                    <StatusIcon size={14} />
                                    <span>{statusText}</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

const ProductionProgressChart = React.memo(({ events = [], target = 1000, shiftName = 'Morning' }) => {
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

        const graphStartTs = startOfToday.getTime();
        const graphEndTs = startOfToday.getTime() + (24 * 3600 * 1000);

        const shiftStartTs = startOfToday.getTime() + (startHour * 3600 * 1000);
        const shiftEndTs = startOfToday.getTime() + (endHour * 3600 * 1000);
        const totalDuration = shiftEndTs - shiftStartTs;

        const points = [];
        
        // Ensure events is an array and has items
        if (Array.isArray(events)) {
            events.forEach(bucket => {
                const bucketTime = bucket.time;
                let targetAtBucket = null;
                
                if (bucketTime >= shiftStartTs && bucketTime <= shiftEndTs) {
                    const fraction = (bucketTime - shiftStartTs) / totalDuration;
                    targetAtBucket = fraction * target;
                } else if (bucketTime > shiftEndTs) {
                    targetAtBucket = target;
                } else {
                    targetAtBucket = 0;
                }

                points.push({
                    ts: bucketTime,
                    good: bucket.good,
                    ng: bucket.ng,
                    targetLine: targetAtBucket
                });
            });
        }

        // Add the very end of the day to stretch the X-axis across 24h
        points.push({
            ts: graphEndTs,
            good: null,
            ng: null,
            targetLine: target
        });

        // Ensure sorted and unique times
        const uniquePoints = [];
        const seen = new Set();
        points.sort((a, b) => a.ts - b.ts).forEach(p => {
            if (!seen.has(p.ts)) {
                seen.add(p.ts);
                uniquePoints.push(p);
            }
        });

        return uniquePoints;
    }, [events, target, shiftName]);

    // Calculate ticks for every 2 hours
    const ticks = useMemo(() => {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const result = [];
        for (let h = 0; h <= 24; h += 2) {
            result.push(startOfToday.getTime() + (h * 3600 * 1000));
        }
        return result;
    }, []);

    return (
        <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                    {/* Visual Definitions for Glowing Gradients */}
                    <defs>
                        <linearGradient id="colorGood" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorNG" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    
                    <XAxis
                        dataKey="ts"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        ticks={ticks}
                        tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                    />
                    
                    <YAxis
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, Math.max(target, chartData[chartData.length-1]?.good || 0)]}
                        tickMargin={10}
                    />

                    <Tooltip content={<CustomTooltip targetTotal={target} />} />
                    
                    <Legend 
                        verticalAlign="top" 
                        height={36} 
                        iconType="circle"
                        wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }}
                    />

                    {/* Ideal Target Line (Dashed) */}
                    <Line
                        type="linear"
                        dataKey="targetLine"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        name="Target Path"
                        isAnimationActive={false}
                    />

                    {/* Actual Good Production (Glowing Area) */}
                    <Area
                        type="stepAfter"
                        dataKey="good"
                        stroke="#10b981"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorGood)"
                        name="Good Parts"
                        connectNulls={false}
                        isAnimationActive={true}
                        animationDuration={1000}
                    />

                    {/* NG Production (Glowing Area) */}
                    <Area
                        type="stepAfter"
                        dataKey="ng"
                        stroke="#ef4444"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorNG)"
                        name="NG Parts"
                        connectNulls={false}
                        isAnimationActive={true}
                        animationDuration={1000}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
});

export default ProductionProgressChart;
