import React from 'react';
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export default function AdminRechartsWrapper({ data }) {
  if (!data || data.length === 0) return <div className="text-sm text-slate-500">Sem dados de crescimento</div>;

  // Expect data items like { date: '2026-01-01', new_users: 10, churn: 2 }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data}>
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="churn" fill="#F43F5E" />
        <Line type="monotone" dataKey="new_users" stroke="#4F46E5" strokeWidth={2} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
