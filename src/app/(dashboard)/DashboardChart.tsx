"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500">No data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
        <XAxis dataKey="name" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
        <YAxis tick={{fontSize: 12}} tickLine={false} axisLine={false} />
        <Tooltip 
          cursor={{fill: 'rgba(79, 70, 229, 0.1)'}} 
          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
        />
        <Bar dataKey="quantity" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}