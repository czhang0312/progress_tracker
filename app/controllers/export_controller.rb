class ExportController < ApplicationController
  skip_before_action :verify_authenticity_token

  # GET /export
  # Dumps all of the current user's data as a single portable JSON document.
  # Daily progress is nested under each goal so the file carries no database
  # ids — the matching ImportController never has to remap them.
  def show
    goals = current_user.goals.order(:position).includes(:daily_progresses).map do |goal|
      {
        name: goal.name,
        description: goal.description,
        position: goal.position,
        started_at: goal.started_at,
        target_pomodoros: goal.target_pomodoros,
        daily_progresses: goal.daily_progresses.sort_by(&:date).map do |dp|
          { date: dp.date, status: dp.status }
        end
      }
    end

    journal_entries = current_user.journal_entries.order(:date).map do |entry|
      { date: entry.date, content: entry.content }
    end

    # Tasks reference goals by name (the file carries no ids). Sessions whose
    # task was deleted are omitted — their effect on daily progress is already
    # captured above.
    tasks = current_user.tasks.order(:position, :id).includes(:goal, :pomodoro_sessions).map do |task|
      {
        name: task.name,
        note: task.note,
        goal_name: task.goal&.name,
        estimated_pomodoros: task.estimated_pomodoros,
        completed_pomodoros: task.completed_pomodoros,
        done: task.done,
        position: task.position,
        sessions: task.pomodoro_sessions.sort_by(&:date).map do |session|
          { date: session.date, duration_minutes: session.duration_minutes }
        end
      }
    end

    render json: {
      format: "progress-tracker-export",
      version: 1,
      exported_at: Time.current,
      goals: goals,
      journal_entries: journal_entries,
      tasks: tasks
    }
  end
end
