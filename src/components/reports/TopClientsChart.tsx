import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { CustomTooltip } from './CustomTooltip';

interface TopClientsChartProps {
  topClients: any[];
}

export const TopClientsChart = ({ topClients }: TopClientsChartProps) => {
  return (
    <div className="bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm p-8">
      <h2 className="text-xl font-black text-gray-900 dark:text-white mb-8">Top Clients par chiffre d'affaires</h2>
      <div className="h-72">
        {topClients.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm font-bold text-gray-400 text-center">Aucune facture sur la période sélectionnée.</p>
          </div>
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topClients} layout="vertical" margin={{ top: 5, right: 30, left: 160, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F4F6F5" horizontal={false} className="opacity-10 dark:opacity-5" />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 700 }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}k`} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 700 }} axisLine={false} tickLine={false} width={150} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            <Bar dataKey="value" fill="#0F6E56" radius={[0, 12, 12, 0]} barSize={16}>
              {topClients.map((_, index) => (
                <Cell key={`cell-${index}`} fill={index < 3 ? '#0F6E56' : '#1D9E75'} opacity={index < 3 ? 1 : 0.6} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

