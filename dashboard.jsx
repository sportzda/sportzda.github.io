import React, { useState, useMemo } from 'react';
import mockData from './mockData.json';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#1E90FF', '#FFA500', '#00C49F', '#FFBB28', '#AA66CC'];

export default function BadmintonInteractiveDashboard() {
  const [granularity, setGranularity] = useState('monthly');
  const [sortBy, setSortBy] = useState('sales');
  const [sortDir, setSortDir] = useState('desc');

  const trendSeries = useMemo(() => {
    const arr = mockData[granularity] || [];
    return arr.map(p => {
      const revenue = p.products.reduce((s, x) => s + x.sales, 0);
      const units = p.products.reduce((s, x) => s + x.units, 0);
      return { period: p.period, revenue, units };
    });
  }, [granularity]);

  const productTotals = useMemo(() => {
    const map = new Map();
    (mockData[granularity] || []).forEach(period => {
      period.products.forEach(prod => {
        const prev = map.get(prod.name) || { name: prod.name, sales: 0, units: 0 };
        prev.sales += prod.sales;
        prev.units += prod.units;
        map.set(prod.name, prev);
      });
    });
    const arr = Array.from(map.values()).map(x => ({
      ...x,
      revenuePerUnit: +(x.sales / x.units).toFixed(2)
    }));
    const key = sortBy === 'sales' ? 'sales' : sortBy === 'units' ? 'units' : 'revenuePerUnit';
    arr.sort((a, b) => sortDir === 'asc' ? a[key] - b[key] : b[key] - a[key]);
    return arr;
  }, [granularity, sortBy, sortDir]);

  const totalSales = productTotals.reduce((s, p) => s + p.sales, 0);
  const totalUnits = productTotals.reduce((s, p) => s + p.units, 0);
  const avgRevenuePerUnit = totalUnits ? (totalSales / totalUnits).toFixed(2) : '0.00';
  const topProduct = productTotals[0]?.name || '-';

  return (
    <div className="p-6 min-h-screen bg-white text-gray-900">
      <header className="flex justify-between mb-6">
        <h1 className="text-3xl font-semibold">🏸 Badminton Stringing Sales Dashboard</h1>

        <div className="flex gap-3">
          <select value={granularity} onChange={e => setGranularity(e.target.value)} className="border rounded p-2">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>

          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="border rounded p-2">
            <option value="sales">Revenue</option>
            <option value="units">Units Sold</option>
            <option value="revenuePerUnit">Revenue / Unit</option>
          </select>

          <button
            className="border rounded px-3 py-2"
            onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
          >
            {sortDir === 'desc' ? '↓' : '↑'}
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="border p-4 rounded shadow bg-white"><p>Total Sales</p><h2 className="text-2xl font-bold">₹{totalSales}</h2></div>
        <div className="border p-4 rounded shadow bg-white"><p>Units Sold</p><h2 className="text-2xl font-bold">{totalUnits}</h2></div>
        <div className="border p-4 rounded shadow bg-white"><p>Avg Revenue/Unit</p><h2 className="text-2xl font-bold">₹{avgRevenuePerUnit}</h2></div>
        <div className="border p-4 rounded shadow bg-white"><p>Top Product</p><h2 className="text-2xl font-bold">{topProduct}</h2></div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border rounded p-4 shadow bg-white">
          <h3 className="mb-3 font-semibold text-lg">Revenue & Units Trend ({granularity})</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={trendSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#1E90FF" strokeWidth={3} />
              <Line yAxisId="right" type="monotone" dataKey="units" stroke="#FFA500" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="border rounded p-4 shadow bg-white">
          <h3 className="mb-3 font-semibold text-lg">Top Strings by Revenue</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={productTotals} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={120} />
              <Tooltip />
              <Bar dataKey="sales" fill="#1E90FF" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="border rounded p-4 shadow bg-white lg:col-span-3">
          <h3 className="mb-3 font-semibold text-lg">Revenue Share by Product</h3>
          <ResponsiveContainer width="100%" height={340}>
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie data={productTotals} dataKey="sales" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
                {productTotals.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
