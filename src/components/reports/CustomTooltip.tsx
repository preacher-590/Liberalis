export const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl p-3 shadow-xl">
        <p className="font-bold text-gray-900 dark:text-gray-100 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-black text-sm">
            {typeof p.value === 'number' ? `${p.value.toLocaleString('fr-FR')} FCFA` : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

