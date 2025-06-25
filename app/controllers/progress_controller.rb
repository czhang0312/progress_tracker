class ProgressController < ApplicationController
  def index
    # Redirect to current month
    redirect_to monthly_progress_path(Date.current.year, Date.current.month)
  end

  def show
    @year = params[:year].to_i
    @month = params[:month].to_i
    @date = Date.new(@year, @month, 1)
    
    @goals = Goal.all
    @days_in_month = @date.end_of_month.day
    
    # Get all daily progress for this month
    @daily_progresses = DailyProgress.where(
      goal: @goals,
      date: @date.beginning_of_month..@date.end_of_month
    ).index_by { |dp| [dp.goal_id, dp.date] }
    
    # Get journal entries for this month
    @journal_entries = JournalEntry.where(
      date: @date.beginning_of_month..@date.end_of_month
    ).index_by(&:date)
  end

  def update
    @goal = Goal.find(params[:goal_id])
    @date = Date.parse(params[:date])
    @status = params[:status].to_i
    
    @daily_progress = DailyProgress.find_or_initialize_by(
      goal: @goal,
      date: @date
    )
    
    @daily_progress.status = @status
    
    if @daily_progress.save
      render json: { success: true, status: @status }
    else
      render json: { success: false, errors: @daily_progress.errors.full_messages }
    end
  end
end
