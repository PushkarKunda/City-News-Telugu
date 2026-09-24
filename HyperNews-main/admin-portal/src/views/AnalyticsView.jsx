import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatsCard from '../components/common/StatsCard';
import { api } from '../api/client';
import { 
  BarChart2, TrendingUp, Users, Clock, Globe, 
  Download, Calendar, Smartphone, Monitor, Tablet, 
  Share2, Eye, Compass, ArrowUpRight, CheckCircle,
  Activity, Zap, Filter
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, 
  Tooltip, CartesianGrid, Legend 
} from 'recharts';

// Dynamic multi-range datasets
const TIME_RANGE_DATA = {
  '24h': {
    kpis: {
      views: '385.2 K',
      viewsChange: '+8.4% today',
      visitors: '174,000',
      visitorsChange: '+11.2%',
      time: '3m 15s',
      timeChange: '+12s retention',
      bounce: '29.1%',
      bounceChange: '-1.4% improvement'
    },
    sparklines: {
      views: [32, 45, 60, 85, 120, 180, 240, 310, 385],
      visitors: [15, 22, 38, 55, 78, 105, 135, 158, 174],
      time: [170, 175, 180, 185, 190, 192, 195],
      bounce: [33, 32, 31, 30.5, 30, 29.5, 29.1]
    },
    trend: [
      { date: '00:00', pageViews: 14000, visitors: 7200 },
      { date: '03:00', pageViews: 6500, visitors: 3400 },
      { date: '06:00', pageViews: 22000, visitors: 11500 },
      { date: '09:00', pageViews: 58000, visitors: 28000 },
      { date: '12:00', pageViews: 64000, visitors: 31000 },
      { date: '15:00', pageViews: 52000, visitors: 25000 },
      { date: '18:00', pageViews: 78000, visitors: 36000 },
      { date: '21:00', pageViews: 90700, visitors: 31900 },
    ],
    categories: [
      { category: 'Technology', reads: 110000, articles: 12 },
      { category: 'Politics', reads: 94000, articles: 15 },
      { category: 'Entertainment', reads: 72000, articles: 10 },
      { category: 'Sports', reads: 51000, articles: 8 },
      { category: 'Business', reads: 38000, articles: 7 },
      { category: 'Science', reads: 20200, articles: 4 },
    ]
  },
  '7d': {
    kpis: {
      views: '2.11 M',
      viewsChange: '+24.6% vs prev period',
      visitors: '866,000',
      visitorsChange: '+16.8%',
      time: '3m 42s',
      timeChange: '+18s retention',
      bounce: '28.4%',
      bounceChange: '-3.2% improvement'
    },
    sparklines: {
      views: [1.4, 1.6, 1.8, 1.9, 2.0, 2.05, 2.11],
      visitors: [620, 680, 710, 750, 800, 840, 866],
      time: [180, 190, 205, 210, 215, 218, 222],
      bounce: [34, 32, 31, 30, 29, 28.8, 28.4]
    },
    trend: [
      { date: 'Sep 14', pageViews: 210000, visitors: 95000 },
      { date: 'Sep 15', pageViews: 245000, visitors: 110000 },
      { date: 'Sep 16', pageViews: 230000, visitors: 102000 },
      { date: 'Sep 17', pageViews: 290000, visitors: 135000 },
      { date: 'Sep 18', pageViews: 340000, visitors: 158000 },
      { date: 'Sep 19', pageViews: 410000, visitors: 192000 },
      { date: 'Sep 20', pageViews: 385000, visitors: 174000 },
    ],
    categories: [
      { category: 'Technology', reads: 540000, articles: 42 },
      { category: 'Politics', reads: 480000, articles: 56 },
      { category: 'Entertainment', reads: 390000, articles: 38 },
      { category: 'Sports', reads: 320000, articles: 29 },
      { category: 'Business', reads: 260000, articles: 31 },
      { category: 'Science', reads: 180000, articles: 18 },
    ]
  },
  '30d': {
    kpis: {
      views: '8.45 M',
      viewsChange: '+31.2% vs last month',
      visitors: '3.12 M',
      visitorsChange: '+22.4%',
      time: '3m 58s',
      timeChange: '+28s retention',
      bounce: '26.8%',
      bounceChange: '-4.8% improvement'
    },
    sparklines: {
      views: [5.2, 5.8, 6.4, 7.1, 7.6, 8.1, 8.45],
      visitors: [2.1, 2.3, 2.5, 2.7, 2.9, 3.0, 3.12],
      time: [195, 205, 215, 225, 230, 235, 238],
      bounce: [32, 31, 30, 29, 28, 27.2, 26.8]
    },
    trend: [
      { date: 'Week 1', pageViews: 1820000, visitors: 710000 },
      { date: 'Week 2', pageViews: 1940000, visitors: 780000 },
      { date: 'Week 3', pageViews: 2210000, visitors: 890000 },
      { date: 'Week 4', pageViews: 2480000, visitors: 940000 },
    ],
    categories: [
      { category: 'Technology', reads: 2150000, articles: 168 },
      { category: 'Politics', reads: 1980000, articles: 224 },
      { category: 'Entertainment', reads: 1620000, articles: 152 },
      { category: 'Sports', reads: 1340000, articles: 116 },
      { category: 'Business', reads: 1050000, articles: 124 },
      { category: 'Science', reads: 710000, articles: 72 },
    ]
  },
  '90d': {
    kpis: {
      views: '24.1 M',
      viewsChange: '+48.0% quarterly',
      visitors: '8.85 M',
      visitorsChange: '+36.2%',
      time: '4m 05s',
      timeChange: '+34s retention',
      bounce: '25.2%',
      bounceChange: '-6.4% improvement'
    },
    sparklines: {
      views: [14, 16, 18, 20, 21.5, 23, 24.1],
      visitors: [5.2, 5.9, 6.7, 7.4, 8.0, 8.4, 8.85],
      time: [210, 220, 228, 235, 240, 242, 245],
      bounce: [35, 33, 31, 29, 27, 26, 25.2]
    },
    trend: [
      { date: 'Month 1', pageViews: 6800000, visitors: 2600000 },
      { date: 'Month 2', pageViews: 8100000, visitors: 3050000 },
      { date: 'Month 3', pageViews: 9200000, visitors: 3400000 },
    ],
    categories: [
      { category: 'Technology', reads: 6800000, articles: 512 },
      { category: 'Politics', reads: 6100000, articles: 680 },
      { category: 'Entertainment', reads: 4900000, articles: 450 },
      { category: 'Sports', reads: 3800000, articles: 360 },
      { category: 'Business', reads: 3200000, articles: 380 },
      { category: 'Science', reads: 2100000, articles: 220 },
    ]
  }
};

const LANGUAGE_DATA = [
  { name: 'Telugu', value: 55, color: '#6366f1' },
  { name: 'English', value: 30, color: '#38bdf8' },
  { name: 'Hindi', value: 15, color: '#10b981' },
];

const HOURLY_HEAT = [
  { hour: '00:00', users: 12000 }, { hour: '02:00', users: 6500 },
  { hour: '04:00', users: 4200 },  { hour: '06:00', users: 18400 },
  { hour: '08:00', users: 48900 }, { hour: '10:00', users: 62400 },
  { hour: '12:00', users: 55200 }, { hour: '14:00', users: 49800 },
  { hour: '16:00', users: 58000 }, { hour: '18:00', users: 74200 },
  { hour: '20:00', users: 89600 }, { hour: '22:00', users: 42100 },
];

const TOP_ARTICLES = [
  { id: '1', title: 'Telangana Tech Summit 2026: Hyderabad AI Hub', category: 'Technology', lang: 'Telugu', views: '142.3k', avgTime: '4m 12s', shares: '18.4k' },
  { id: '2', title: 'BCCI Announces Squad for 2026 T20 World Cup', category: 'Sports', lang: 'English', views: '89.4k', avgTime: '3m 45s', shares: '12.1k' },
  { id: '3', title: 'Stock Markets Hit Record High: Foreign Inflows', category: 'Business', lang: 'Hindi', views: '64.1k', avgTime: '2m 50s', shares: '6.8k' },
  { id: '4', title: 'Blockbuster Telugu Action Film Shatters Box Office', category: 'Entertainment', lang: 'Telugu', views: '58.2k', avgTime: '3m 10s', shares: '15.2k' },
  { id: '5', title: 'Indian Space Agency Prepares Final Solar Probe', category: 'Science', lang: 'English', views: '41.7k', avgTime: '5m 02s', shares: '7.4k' },
];

export default function AnalyticsView() {
  const { currentRole } = useAuth();
  const { showToast } = useToast();
  const [timeRange, setTimeRange] = useState('7d');

  const activeDataset = TIME_RANGE_DATA[timeRange] || TIME_RANGE_DATA['7d'];

  // Export CSV Handler with Toast
  const handleExportCsv = () => {
    const csvRows = [
      ['Article ID', 'Title', 'Category', 'Language', 'Views', 'Avg Time', 'Shares', 'Time Range'],
      ...TOP_ARTICLES.map(a => [a.id, `"${a.title}"`, a.category, a.lang, a.views, a.avgTime, a.shares, timeRange])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HyperNews_Analytics_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Analytics telemetry report (${timeRange.toUpperCase()}) exported successfully`, 'success');
  };

  return (
    <div className="view-container animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Audience Intelligence & Telemetry
            <span className="badge badge-primary">Live Data</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            Deep engagement metrics, category performance, language breakdowns, and reader retention.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Range Filter Buttons */}
          <div className="flex bg-glass p-1 rounded-lg border border-glass">
            {['24h', '7d', '30d', '90d'].map(range => (
              <button
                key={range}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  timeRange === range ? 'bg-primary text-white shadow-glow' : 'text-muted hover:text-white'
                }`}
                onClick={() => {
                  setTimeRange(range);
                  showToast(`Telemetry updated to ${range.toUpperCase()} window`, 'info', 2000);
                }}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>

          <button 
            className="btn btn-secondary flex items-center gap-2 text-xs py-2 shadow-sm"
            onClick={handleExportCsv}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard 
          title="Total Page Views"
          value={activeDataset.kpis.views}
          change={activeDataset.kpis.viewsChange}
          changeType="positive"
          icon={BarChart2}
          sparklineData={activeDataset.sparklines.views}
        />
        <StatsCard 
          title="Unique Visitors"
          value={activeDataset.kpis.visitors}
          change={activeDataset.kpis.visitorsChange}
          changeType="positive"
          icon={Users}
          sparklineData={activeDataset.sparklines.visitors}
        />
        <StatsCard 
          title="Avg. Time on Article"
          value={activeDataset.kpis.time}
          change={activeDataset.kpis.timeChange}
          changeType="positive"
          icon={Clock}
          sparklineData={activeDataset.sparklines.time}
        />
        <StatsCard 
          title="Reader Bounce Rate"
          value={activeDataset.kpis.bounce}
          change={activeDataset.kpis.bounceChange}
          changeType="positive"
          icon={TrendingUp}
          sparklineData={activeDataset.sparklines.bounce}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Main Traffic Trend (Area) */}
        <div className="lg:col-span-2 card glass-card p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="text-primary" size={18} />
                Traffic Growth & Reader Reach ({timeRange.toUpperCase()})
              </h2>
              <p className="text-xs text-muted">Page Views vs Unique Readers over selected timeframe</p>
            </div>
            <span className="badge badge-outline">{timeRange.toUpperCase()} View</span>
          </div>

          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <AreaChart data={activeDataset.trend} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorVis" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff' }} 
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="pageViews" name="Page Views" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorPv)" />
                <Area type="monotone" dataKey="visitors" name="Unique Visitors" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorVis)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Language Share Donut */}
        <div className="card glass-card p-5">
          <div className="mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="text-accent" size={18} />
              Language Distribution
            </h2>
            <p className="text-xs text-muted">Audience preference share</p>
          </div>

          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={LANGUAGE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {LANGUAGE_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff' }} 
                  formatter={(value) => `${value}%`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 mt-2">
            {LANGUAGE_DATA.map(l => (
              <div key={l.name} className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-2 text-white">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }}></span>
                  {l.name}
                </span>
                <span className="font-mono font-bold text-muted">{l.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Category Breakdown & 24h Peak Heat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Category Reads vs Volume */}
        <div className="card glass-card p-5">
          <div className="mb-4">
            <h2 className="text-base font-bold text-white">Category Readership Volume ({timeRange.toUpperCase()})</h2>
            <p className="text-xs text-muted">Total article views grouped by content category</p>
          </div>

          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={activeDataset.categories} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="category" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff' }} 
                />
                <Bar dataKey="reads" name="Total Reads" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 24-Hour Traffic Rhythm */}
        <div className="card glass-card p-5">
          <div className="mb-4">
            <h2 className="text-base font-bold text-white">24-Hour Traffic Rhythm</h2>
            <p className="text-xs text-muted">Active reader volume across daily time intervals</p>
          </div>

          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={HOURLY_HEAT} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="hour" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff' }} 
                />
                <Line type="monotone" dataKey="users" name="Active Readers" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Device Platforms & Top Articles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Platforms */}
        <div className="card glass-card p-5">
          <h2 className="text-base font-bold text-white mb-4">Device Demographics</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="flex items-center gap-2 text-white">
                  <Smartphone size={16} className="text-primary" /> Mobile Web & App
                </span>
                <span className="font-mono font-bold text-primary">72%</span>
              </div>
              <div className="w-full bg-glass h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: '72%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="flex items-center gap-2 text-white">
                  <Monitor size={16} className="text-accent" /> Desktop Web
                </span>
                <span className="font-mono font-bold text-accent">23%</span>
              </div>
              <div className="w-full bg-glass h-2 rounded-full overflow-hidden">
                <div className="bg-accent h-full rounded-full" style={{ width: '23%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="flex items-center gap-2 text-white">
                  <Tablet size={16} className="text-emerald-400" /> Tablets & e-Readers
                </span>
                <span className="font-mono font-bold text-emerald-400">5%</span>
              </div>
              <div className="w-full bg-glass h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: '5%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Top 5 Articles Table */}
        <div className="lg:col-span-2 card glass-card overflow-hidden">
          <div className="p-4 border-b border-glass flex justify-between items-center">
            <h2 className="text-base font-bold text-white">Top Performing Editorial Content</h2>
            <span className="text-xs text-muted">Sorted by Reads</span>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Headline</th>
                  <th>Category</th>
                  <th>Lang</th>
                  <th>Views</th>
                  <th>Avg. Time</th>
                  <th>Shares</th>
                </tr>
              </thead>
              <tbody>
                {TOP_ARTICLES.map(art => (
                  <tr key={art.id}>
                    <td className="font-semibold text-white max-w-[260px] truncate">{art.title}</td>
                    <td><span className="badge badge-outline text-xs">{art.category}</span></td>
                    <td className="text-xs text-muted">{art.lang}</td>
                    <td className="text-xs font-mono font-bold text-primary">{art.views}</td>
                    <td className="text-xs font-mono text-muted">{art.avgTime}</td>
                    <td className="text-xs font-mono text-accent">{art.shares}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
