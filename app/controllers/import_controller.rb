class ImportController < ApplicationController
  skip_before_action :verify_authenticity_token

  # POST /import
  # Replaces ALL of the current user's data with the contents of an uploaded
  # export file. Destructive by design — the whole thing runs in a transaction
  # so a malformed file leaves existing data untouched.
  def create
    unless params[:format] == "progress-tracker-export" && params[:version].to_i == 1
      return render_error("Unrecognized file format.")
    end

    goals = params[:goals]
    journal_entries = params[:journal_entries] || []
    unless goals.is_a?(Array)
      return render_error("File is missing a goals list.")
    end

    counts = { goals: 0, daily_progresses: 0, journal_entries: 0 }

    ActiveRecord::Base.transaction do
      current_user.journal_entries.destroy_all
      current_user.goals.destroy_all

      goals.each_with_index do |g, index|
        goal = current_user.goals.create!(
          name: g[:name],
          description: g[:description],
          position: g[:position].presence || index + 1,
          started_at: g[:started_at].presence || Date.today
        )
        counts[:goals] += 1

        Array(g[:daily_progresses]).each do |dp|
          goal.daily_progresses.create!(date: dp[:date], status: dp[:status])
          counts[:daily_progresses] += 1
        end
      end

      journal_entries.each do |entry|
        current_user.journal_entries.create!(date: entry[:date], content: entry[:content])
        counts[:journal_entries] += 1
      end
    end

    render json: { success: true, counts: counts }
  rescue ActiveRecord::RecordInvalid => e
    render_error("Could not import file: #{e.record.errors.full_messages.to_sentence}")
  rescue StandardError
    render_error("The file could not be read. Make sure it is a valid export.")
  end

  private

  def render_error(message)
    render json: { success: false, message: message }, status: :unprocessable_content
  end
end
