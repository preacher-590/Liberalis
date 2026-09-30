import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { CustomTooltip } from './CustomTooltip';

interface PaymentMethod {
  name: string;
  value: number;
}

interface PaymentBarChartProps {
  data: PaymentMethod[];
}

export const PaymentBarChart = ({ data }: PaymentBarChartProps) => {
  return (
    <div className="lg:col-span-7 bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm p-8">
      <h2 className="text-xl font-black text-gray-900 dark:text-white mb-8">Répartition des moyens de paiement</h2>
      <div className="h-52">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm font-bold text-gray-400 text-center">Aucun encaissement enregistré.<br />Marquez une facture payée pour alimenter ce graphique.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F4F6F5" vertical={false} className="opacity-10 dark:opacity-5" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 700 }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}k`} width={45} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
              <Bar dataKey="value" fill="#0F6E56" radius={[12, 12, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

