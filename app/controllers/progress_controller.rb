class ProgressController < ApplicationController
  skip_before_action :verify_authenticity_token

  def index
    # Redirect to current month
    redirect_to monthly_progress_path(Date.current.year, Date.current.month)
  end

  def show
    # Debug authentication
    Rails.logger.info "=== Progress Show Debug ==="
    Rails.logger.info "user_signed_in?: #{user_signed_in?}"
    Rails.logger.info "current_user: #{current_user&.email}"
    Rails.logger.info "session: #{session.to_h}"
    Rails.logger.info "cookies: #{cookies.to_h}"
    Rails.logger.info "request.headers['cookie']: #{request.headers['cookie']}"
    Rails.logger.info "================================"

    @year = params[:year].to_i
    @month = params[:month].to_i
    @date = Date.new(@year, @month, 1)

    @goals = current_user.goals
    @days_in_month = @date.end_of_month.day

    # Get all daily progress for this month
    @daily_progresses = DailyProgress.where(
      goal: @goals,
      date: @date.beginning_of_month..@date.end_of_month
    ).index_by { |dp| [ dp.goal_id, dp.date ] }

    # Get journal entries for this month
    @journal_entries = current_user.journal_entries.where(
      date: @date.beginning_of_month..@date.end_of_month
    ).index_by(&:date)

    # Return JSON for API requests
    respond_to do |format|
      format.html
      format.json do
        render json: {
          year: @year,
          month: @month,
          date: @date,
          goals: @goals,
          days_in_month: @days_in_month,
          daily_progresses: @daily_progresses.transform_keys { |k| "#{k[0]}-#{k[1]}" },
          journal_entries: @journal_entries
        }
      end
    end
  end

  def update
    Rails.logger.info "Progress update called with params: #{params.inspect}"

    @goal = current_user.goals.find(params[:goal_id])
    @date = Date.parse(params[:date])
    @status = params[:status].to_i

    Rails.logger.info "Goal: #{@goal.inspect}, Date: #{@date}, Status: #{@status}"

    @daily_progress = DailyProgress.find_or_initialize_by(
      goal: @goal,
      date: @date
    )

    Rails.logger.info "DailyProgress: #{@daily_progress.inspect}"

    @daily_progress.status = @status

    if @daily_progress.save
      Rails.logger.info "Progress saved successfully"
      render json: { success: true, status: @status }
    else
      Rails.logger.error "Progress save failed: #{@daily_progress.errors.full_messages}"
      render json: { success: false, errors: @daily_progress.errors.full_messages }, status: :unprocessable_entity
    end
  end
end
