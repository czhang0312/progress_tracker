'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import NavHeader from '@/components/NavHeader';
import { RAILS_API_BASE } from '@/lib/config';
import { getGuestStats } from '@/lib/guestStorage';
import { localDateString, todayLocalDateString } from '@/lib/dateUtils';

interface DailyTotal {
  filled: number;
  half: number;
  empty: number;
}

interface GoalStats {
  id: number;
  name: string;
  created_at: string;
  completion_pct: number;
  current_streak: number;
  longest_streak: number;
  best_month: string | null;
}

interface StatsData {
  year: number;
  daily_totals: Record<string, DailyTotal>;
  per_goal: GoalStats[];
}

function buildWeekGrid(year: number): (Date | null)[][] {
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);
  const startOffset = (jan1.getDay() + 6) % 7; // Mon=0 … Sun=6

  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = Array(startOffset).fill(null);

  const cur = new Date(jan1);
  while (cur <= dec31) {
    week.push(new Date(cur));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    cur.setDate(cur.getDate() + 1);
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  return weeks;
}

function getMonthLabels(year: number): { month: string; col: number }[] {
  const jan1 = new Date(year, 0, 1);
  const startOffset = (jan1.getDay() + 6) % 7;
  return Array.from({ length: 12 }, (_, m) => {
    const monthStart = new Date(year, m, 1);
    const daysSinceJan1 = Math.round((monthStart.getTime() - jan1.getTime()) / 86400000);
    return {
      month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
      col: Math.floor((startOffset + daysSinceJan1) / 7),
    };
  });
}

function getCellColor(date: Date | null, dailyTotals: Record<string, DailyTotal>): string {
  if (!date) return '';

  if (localDateString(date) > todayLocalDateString()) return 'bg-neutral-100';

  const key = localDateString(date);
  const data = dailyTotals[key];
  if (!data) return 'bg-neutral-200';

  const total = data.filled + data.half + data.empty;
  if (total === 0) return 'bg-neutral-200';

  const rate = (data.filled + data.half * 0.5) / total;
  if (rate === 0) return 'bg-neutral-200';
  if (rate <= 0.33) return 'bg-secondary-200';
  if (rate <= 0.66) return 'bg-secondary-400';
  if (rate < 1.0) return 'bg-secondary-600';
  return 'bg-secondary-800';
}

function getCellTooltip(date: Date | null, dailyTotals: Record<string, DailyTotal>): string {
  if (!date) return '';
  const key = localDateString(date);
  const data = dailyTotals[key];
  const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  if (!data) return `${dateStr} — no data`;
  const total = data.filled + data.half + data.empty;
  return `${dateStr} — ${data.filled} complete, ${data.half} half (${total} goals tracked)`;
}

export default function StatsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (user?.is_guest) {
      setLoading(true);
      setData(getGuestStats(year) as StatsData);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${RAILS_API_BASE}/stats?year=${year}`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      setData(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [year, user]);

  useEffect(() => {
    if (authLoading) return;
    fetchStats();
  }, [year, user, authLoading, fetchStats]);


  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Loading Stats</h1>
          <p className="text-neutral-600">Crunching your progress data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <h1 className="text-2xl font-bold text-error-600 mb-2">Something went wrong</h1>
          <p className="text-neutral-600 mb-4">{error}</p>
          <button onClick={fetchStats} className="btn-primary">Try Again</button>
        </div>
      </div>
    );
  }

  const weeks = buildWeekGrid(year);
  const monthLabels = getMonthLabels(year);
  const dailyTotals = data?.daily_totals ?? {};
  const perGoal = data?.per_goal ?? [];

  return (
    <div className="min-h-screen">
      <NavHeader />
      <div className="max-w-[1000px] mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="page-title w-fit">Progress Stats</h1>
            <p className="text-description">Your year at a glance</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setYear((y) => y - 1)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors duration-150"
            >
              ← {year - 1}
            </button>
            <span className="font-bold text-neutral-900 px-2">{year}</span>
            <button
              onClick={() => setYear((y) => y + 1)}
              disabled={year >= currentYear}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {year + 1} →
            </button>
          </div>
        </div>

        {/* Heatmap */}
        <div className="card mb-4">
          <div className="card-header">
            <h2 className="text-xl font-bold text-neutral-900">Year in Pixels</h2>
            <p className="text-hint mt-1">
              Color intensity = average completion rate across all goals that day. Click a cell to view that month.
            </p>
          </div>
          <div className="card-body overflow-x-auto">
            {perGoal.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                No goals yet.{' '}
                Add a goal from the Progress page to start seeing stats.
              </div>
            ) : (
              <div className="inline-block">
                {/* Month labels — positioned absolutely within a dedicated row */}
                <div className="relative mb-2" style={{ marginLeft: '19px', height: '16px' }}>
                  {monthLabels.map(({ month, col }) => (
                    <span
                      key={month}
                      className="absolute text-xs text-neutral-500 whitespace-nowrap"
                      style={{ left: `${col * 15}px` }}
                    >
                      {month}
                    </span>
                  ))}
                </div>

                {/* Day labels + grid */}
                <div className="flex" style={{ gap: '3px' }}>
                  {/* Day-of-week labels */}
                  <div className="flex flex-col mr-1" style={{ gap: '3px' }}>
                    {['M', '', 'W', '', 'F', '', 'S'].map((label, i) => (
                      <div
                        key={i}
                        style={{ width: '12px', height: '12px' }}
                        className="flex items-center justify-center"
                      >
                        <span className="text-xs text-neutral-400 leading-none">{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Weeks */}
                  {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col" style={{ gap: '3px' }}>
                      {week.map((date, di) => {
                        if (!date) {
                          return <div key={di} style={{ width: '12px', height: '12px' }} />;
                        }
                        const color = getCellColor(date, dailyTotals);
                        const tooltip = getCellTooltip(date, dailyTotals);
                        const dateKey = localDateString(date);
                        const [yr, mo] = dateKey.split('-').map(Number);
                        return (
                          <button
                            key={di}
                            style={{ width: '12px', height: '12px' }}
                            className={`rounded-sm ${color} hover:ring-2 hover:ring-primary-400 hover:ring-offset-1 transition-all cursor-pointer`}
                            title={tooltip}
                            onClick={() => router.push(`/progress/${yr}/${mo}`)}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-2 mt-4 text-xs text-neutral-500">
                  <span>Less</span>
                  <div className="w-3 h-3 rounded-sm bg-neutral-200" />
                  <div className="w-3 h-3 rounded-sm bg-secondary-200" />
                  <div className="w-3 h-3 rounded-sm bg-secondary-400" />
                  <div className="w-3 h-3 rounded-sm bg-secondary-600" />
                  <div className="w-3 h-3 rounded-sm bg-secondary-800" />
                  <span>More</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Per-goal stat cards */}
        {perGoal.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-neutral-900 mb-4">Goal Breakdown</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {perGoal.map((goal) => (
                <div key={goal.id} className="card">
                  <div className="card-body p-[18px]">
                    <h3 className="font-bold text-neutral-900 mb-1 truncate">{goal.name}</h3>
                    <p className="text-hint mb-4">
                      Since{' '}
                      {new Date(goal.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>

                    {/* Completion bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-neutral-500">Completion</span>
                        <span className="font-semibold text-neutral-900">{goal.completion_pct}%</span>
                      </div>
                      <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-secondary-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(goal.completion_pct, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 text-description">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Current streak</span>
                        <span className="font-semibold text-neutral-900">
                          {goal.current_streak > 0 ? `🔥 ${goal.current_streak}d` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Longest streak</span>
                        <span className="font-semibold text-neutral-900">
                          {goal.longest_streak > 0 ? `${goal.longest_streak}d` : '—'}
                        </span>
                      </div>
                      {goal.best_month && (
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Best month</span>
                          <span className="font-semibold text-neutral-900">{goal.best_month}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
