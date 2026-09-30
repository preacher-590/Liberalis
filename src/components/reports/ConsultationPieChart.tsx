import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { CustomTooltip } from './CustomTooltip';

interface ConsultationType {
  name: string;
  value: number;
}

interface ConsultationPieChartProps {
  data: ConsultationType[];
}

// Palette de couleurs assignées dans l'ordre décroissant des volumes
const COLORS = ['#0F6E56', '#1D9E75', '#EF9F27', '#E24B4A', '#185FA5', '#6B7280'];

export const ConsultationPieChart = ({ data }: ConsultationPieChartProps) => {
  const total = data.reduce((sum, d) => sum + Number(d.value), 0);
  const withColors = data.map((d, i) => ({ ...d, value: Number(d.value), color: COLORS[i % COLORS.length] }));

  return (
    <div className="lg:col-span-5 bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm p-8 flex flex-col">
      <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6">Type de consultation</h2>
      {total === 0 ? (
        <div className="flex-1 flex items-center justify-center min-h-48">
          <p className="text-sm font-bold text-gray-400 text-center">Aucun rendez-vous enregistré.<br />La répartition apparaîtra ici.</p>
        </div>
      ) : (
        <div className="flex items-center gap-8 flex-1">
          <div className="h-52 w-52 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={withColors} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                  {withColors.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4 flex-1">
            {withColors.map((ct, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ background: ct.color }} />
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{ct.name}</span>
                </div>
                <span className="text-xs font-black text-gray-900 dark:text-white">{Math.round((ct.value / total) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

