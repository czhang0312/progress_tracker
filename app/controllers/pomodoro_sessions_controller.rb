class PomodoroSessionsController < ApplicationController
  skip_before_action :verify_authenticity_token

  before_action :require_auth_for_write!

  # POST /pomodoro_sessions
  # Records a completed pomodoro and, for goal-linked tasks with a daily
  # target, auto-fills that goal's progress circle (upgrade-only).
  def create
    date = Date.iso8601(params.require(:date))
    task = params[:task_id].present? ? current_user.tasks.find(params[:task_id]) : nil
    goal = task&.goal
    daily_progress = nil

    session = nil
    ActiveRecord::Base.transaction do
      session = current_user.pomodoro_sessions.create!(
        task: task,
        goal: goal,
        date: date,
        duration_minutes: params.require(:duration_minutes),
        started_at: params[:started_at],
        ended_at: params[:ended_at]
      )
      task&.increment!(:completed_pomodoros)
      daily_progress = auto_fill_progress(goal, date)
    end

    render json: {
      success: true,
      session: session,
      task: task&.slice(:id, :completed_pomodoros),
      daily_progress: daily_progress
    }, status: :created
  rescue ArgumentError
    render json: { error: "Invalid date" }, status: :bad_request
  rescue ActiveRecord::RecordInvalid => e
    render json: e.record.errors, status: :unprocessable_content
  end

  private
    def auto_fill_progress(goal, date)
      return nil unless goal&.target_pomodoros

      count = PomodoroSession.where(goal_id: goal.id, date: date).count
      desired = count >= goal.target_pomodoros ? DailyProgress::STATUS_FILLED : DailyProgress::STATUS_HALF
      existing = DailyProgress.find_by(goal_id: goal.id, date: date)&.status.to_i
      return nil unless desired > existing

      DailyProgress.upsert(
        { goal_id: goal.id, date: date, status: desired, created_at: Time.current, updated_at: Time.current },
        unique_by: [ :goal_id, :date ],
        update_only: [ :status ]
      )
      { goal_id: goal.id, date: date.iso8601, status: desired }
    end
end
