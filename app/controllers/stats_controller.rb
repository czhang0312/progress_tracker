class StatsController < ApplicationController
  skip_before_action :verify_authenticity_token

  def show
    @year = params[:year]&.to_i || Date.current.year

    if user_signed_in?
      render_stats
    else
      render json: { year: @year, daily_totals: {}, per_goal: [] }
    end
  end

  private

  def render_stats
    goals = current_user.goals.order(:position)
    year_start = Date.new(@year, 1, 1)
    year_end = Date.new(@year, 12, 31)

    progresses = DailyProgress.where(goal: goals, date: year_start..year_end)

    daily_totals = {}
    progresses.each do |dp|
      key = dp.date.to_s
      daily_totals[key] ||= { filled: 0, half: 0, empty: 0 }
      case dp.status
      when Goal::STATUS_FILLED then daily_totals[key][:filled] += 1
      when Goal::STATUS_HALF   then daily_totals[key][:half] += 1
      when Goal::STATUS_EMPTY  then daily_totals[key][:empty] += 1
      end
    end

    per_goal = goals.map { |goal| goal_stats(goal) }

    render json: { year: @year, daily_totals: daily_totals, per_goal: per_goal }
  end

  def goal_stats(goal)
    all     = goal.daily_progresses.order(:date)
    today   = Date.current                          # Eastern Time (via config.time_zone)
    created = goal.created_at.in_time_zone.to_date  # Eastern Time date of creation
    total_days = [ (today - created).to_i + 1, 0 ].max

    filled = all.count { |dp| dp.status == Goal::STATUS_FILLED }
    half   = all.count { |dp| dp.status == Goal::STATUS_HALF }
    completion_pct = total_days > 0 ? ((filled + half * 0.5) / total_days * 100).round(1) : 0.0

    active_dates = all.select { |dp| dp.status >= Goal::STATUS_HALF }.map(&:date).sort

    {
      id: goal.id,
      name: goal.name,
      created_at: goal.created_at.utc.iso8601,
      completion_pct: completion_pct,
      current_streak: current_streak(active_dates, today),
      longest_streak: longest_streak(active_dates),
      best_month: best_month(goal, all)
    }
  end

  def current_streak(active_dates, today)
    check = active_dates.include?(today) ? today : today - 1
    count = 0
    while active_dates.include?(check)
      count += 1
      check -= 1
    end
    count
  end

  def longest_streak(active_dates)
    return 0 if active_dates.empty?

    best = 1
    run  = 1
    active_dates.each_cons(2) do |a, b|
      if b == a + 1
        run += 1
        best = run if run > best
      else
        run = 1
      end
    end
    best
  end

  def best_month(goal, all_progresses)
    return nil if all_progresses.empty?

    best_key  = nil
    best_rate = -1.0

    all_progresses.group_by { |dp| [ dp.date.year, dp.date.month ] }.each do |(yr, mo), dps|
      month_start = Date.new(yr, mo, 1)
      month_end   = Date.new(yr, mo, -1)
      from        = [ month_start, goal.created_at.in_time_zone.to_date ].max
      to          = [ month_end, Date.current ].min
      total       = (to - from).to_i + 1
      next if total <= 0

      filled = dps.count { |dp| dp.status == Goal::STATUS_FILLED }
      half   = dps.count { |dp| dp.status == Goal::STATUS_HALF }
      rate   = (filled + half * 0.5) / total.to_f

      if rate > best_rate
        best_rate = rate
        best_key  = [ yr, mo ]
      end
    end

    best_key ? Date.new(best_key[0], best_key[1]).strftime("%B") : nil
  end
end
