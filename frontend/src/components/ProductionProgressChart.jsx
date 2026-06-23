import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Bar,
    Line,
    ComposedChart
} from 'recharts';
import { Minus, TrendingUp, TrendingDown } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
    const { t } = useTranslation();
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const timeStr = new Date(data.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const endTimeStr = new Date(data.ts + 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const good = data.goodHourly || 0;
        const ng = data.ngHourly || 0;
        const target = Math.round(data.targetHourly || 0);
        
        let statusColor = "text-gray-400";
        let statusText = t('analytics.on_target', 'On Target');
        
        const diff = good - target;
        if (diff > 0) {
            statusColor = "text-green-400";
            statusText = t('analytics.ahead_by', { count: diff, defaultValue: `Ahead by +{{count}}` });
        } else if (diff < 0) {
            statusColor = "text-red-400";
            statusText = t('analytics.behind_by', { count: diff, defaultValue: `Behind by {{count}}` });
        }

        return (
            <div className="bg-gray-900/95 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl min-w-[200px]">
                <p className="text-gray-300 font-bold mb-3 border-b border-white/10 pb-2">{timeStr} - {endTimeStr}</p>
                
                <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-400 text-sm">{t('analytics.hourly_target', 'Hourly Target:')}</span>
                        <span className="text-blue-400 font-bold">{target}</span>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-400 text-sm">{t('analytics.actual_good', 'Actual Good:')}</span>
                        <span className="text-green-400 font-bold">{good}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">{t('analytics.actual_ng', 'Actual NG:')}</span>
                        <span className="text-red-400 font-bold">{ng}</span>
                    </div>
                    
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/10">
                        <span className="text-xs uppercase tracking-wider font-bold">{t('analytics.status', 'Status')}</span>
                        <div className={`flex items-center gap-1 text-xs font-bold ${statusColor}`}>
                            <span>{statusText}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const ProductionProgressChart = React.memo(({ events = [], target = 1000, shiftName = 'Morning' }) => {
    const { t } = useTranslation();
    
    const chartData = useMemo(() => {
        const startHour = 0;
        const endHour = 24;

        const targetPerHour = target > 0 ? target / 24 : 0;

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const hourlyBuckets = [];
        for (let h = startHour; h < endHour; h++) {
            const bucketStart = startOfToday.getTime() + (h * 3600 * 1000);
            const bucketEnd = startOfToday.getTime() + ((h + 1) * 3600 * 1000);
            
            let cumStartGood = 0;
            let cumStartNg = 0;
            let cumEndGood = 0;
            let cumEndNg = 0;

            if (events && events.length > 0) {
                const beforeStart = events.filter(e => e.time <= bucketStart);
                if (beforeStart.length > 0) {
                    const lastBeforeStart = beforeStart[beforeStart.length - 1];
                    cumStartGood = lastBeforeStart.good;
                    cumStartNg = lastBeforeStart.ng;
                }

                const beforeEnd = events.filter(e => e.time <= bucketEnd);
                if (beforeEnd.length > 0) {
                    const lastBeforeEnd = beforeEnd[beforeEnd.length - 1];
                    cumEndGood = lastBeforeEnd.good;
                    cumEndNg = lastBeforeEnd.ng;
                }
            }

            const goodHourly = Math.max(0, cumEndGood - cumStartGood);
            const ngHourly = Math.max(0, cumEndNg - cumStartNg);

            hourlyBuckets.push({
                ts: bucketStart,
                timeLabel: new Date(bucketStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                goodHourly,
                ngHourly,
                targetHourly: targetPerHour
            });
        }

        return hourlyBuckets;
    }, [events, target, shiftName]);

    return (
        <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                    <defs>
                        <linearGradient id="colorGoodBar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.4}/>
                        </linearGradient>
                        <linearGradient id="colorNGBar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.4}/>
                        </linearGradient>
                        <filter id="glowBar" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    
                    <XAxis
                        dataKey="timeLabel"
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
                        tickMargin={10}
                    />

                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    
                    <Legend 
                        verticalAlign="top" 
                        height={36} 
                        iconType="circle"
                        wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }}
                    />

                    <Line
                        type="stepAfter"
                        dataKey="targetHourly"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        name={t('analytics.hourly_target', 'Hourly Target')}
                        isAnimationActive={false}
                    />

                    <Bar 
                        dataKey="goodHourly" 
                        stackId="a" 
                        fill="url(#colorGoodBar)" 
                        name={t('analytics.good_parts', 'Good Parts')} 
                        radius={[0, 0, 4, 4]} 
                        isAnimationActive={true}
                        animationDuration={1000}
                    />
                    <Bar 
                        dataKey="ngHourly" 
                        stackId="a" 
                        fill="url(#colorNGBar)" 
                        name={t('analytics.ng_parts', 'NG Parts')} 
                        radius={[4, 4, 0, 0]} 
                        isAnimationActive={true}
                        animationDuration={1000}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
});

export default ProductionProgressChart;
