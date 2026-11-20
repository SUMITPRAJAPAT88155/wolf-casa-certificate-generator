import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Users, CalendarCheck, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Certificate } from '@/lib/types';
import { formatDate } from '@/lib/date';

interface Stats {
  total: number;
  students: number;
  today: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ total: 0, students: 0, today: 0 });
  const [recent, setRecent] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const [totalRes, studentsRes, todayRes, recentRes] = await Promise.all([
        supabase.from('certificates').select('id', { count: 'exact', head: true }),
        supabase.from('certificates').select('recipient_name'),
        supabase
          .from('certificates')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', `${today}T00:00:00`),
        supabase
          .from('certificates')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);
      const names = new Set((studentsRes.data ?? []).map((r) => r.recipient_name.toLowerCase()));
      setStats({
        total: totalRes.count ?? 0,
        students: names.size,
        today: todayRes.count ?? 0,
      });
      setRecent(recentRes.data ?? []);
      setLoading(false);
    }
    load();

    window.addEventListener('certificates:changed', load);
    return () => window.removeEventListener('certificates:changed', load);
  }, []);

  const cards = [
    { label: 'Total Certificates', value: stats.total, icon: FileText },
    { label: 'Total Students', value: stats.students, icon: Users },
    { label: 'Generated Today', value: stats.today, icon: CalendarCheck },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-neutral-500 text-sm mt-1">Overview of your certificate activity</p>
        </div>
        <Link
          to="/create"
          className="inline-flex items-center justify-center gap-2 bg-amber-200 hover:bg-amber-100 text-neutral-950 font-semibold rounded-lg px-5 py-2.5 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Generate Certificate
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-center gap-4 hover:border-neutral-700 transition-colors"
          >
            <div className="w-11 h-11 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <p className="text-neutral-500 text-xs uppercase tracking-wider">{label}</p>
              {loading ? (
                <Loader2 className="w-5 h-5 text-neutral-500 animate-spin mt-1" />
              ) : (
                <p className="text-2xl font-semibold text-white">{value}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <h2 className="text-white font-medium">Recent Certificates</h2>
          <Link
            to="/records"
            className="inline-flex items-center gap-1 text-sm text-amber-200 hover:text-amber-100"
          >
            View all
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 text-neutral-600 animate-spin" />
          </div>
        ) : recent.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-neutral-500">No certificates yet.</p>
            <Link to="/create" className="text-amber-200 hover:text-amber-100 text-sm mt-1 inline-block">
              Create your first certificate
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-800">
            {recent.map((c) => (
              <li key={c.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-white truncate">{c.recipient_name}</p>
                  <p className="text-neutral-500 text-sm truncate">{c.course_name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-neutral-300 text-sm font-mono">{c.certificate_id}</p>
                  <p className="text-neutral-600 text-xs">{formatDate(c.created_at.slice(0, 10))}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
