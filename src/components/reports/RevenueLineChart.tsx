import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { CustomTooltip } from './CustomTooltip';

interface RevenueLineChartProps {
  revenueData: any[];
}

export const RevenueLineChart = ({ revenueData }: RevenueLineChartProps) => {
  return (
    <div className="bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm p-8">
      <h2 className="text-xl font-black text-gray-900 dark:text-white mb-8">Évolution des revenus (12 mois glissants)</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={revenueData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F4F6F5" className="opacity-10 dark:opacity-5" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 700 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 700 }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}k`} width={50} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="revenue" stroke="#0F6E56" strokeWidth={4} dot={{ fill: '#0F6E56', strokeWidth: 0, r: 5 }} activeDot={{ r: 8, stroke: '#0F6E56', strokeWidth: 2, fill: '#fff' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

