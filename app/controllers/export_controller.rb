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
        daily_progresses: goal.daily_progresses.sort_by(&:date).map do |dp|
          { date: dp.date, status: dp.status }
        end
      }
    end

    journal_entries = current_user.journal_entries.order(:date).map do |entry|
      { date: entry.date, content: entry.content }
    end

    render json: {
      format: "progress-tracker-export",
      version: 1,
      exported_at: Time.current,
      goals: goals,
      journal_entries: journal_entries
    }
  end
end
