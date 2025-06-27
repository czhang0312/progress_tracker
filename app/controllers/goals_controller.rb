class GoalsController < ApplicationController
  def index
    @goals = Goal.all
    
    respond_to do |format|
      format.html
      format.json { render json: @goals }
    end
  end

  def show
    @goal = Goal.find(params[:id])
    
    respond_to do |format|
      format.html
      format.json { render json: @goal }
    end
  end

  def new
    @goal = Goal.new
  end

  def create
    @goal = Goal.new(goal_params)
    @goal.position = Goal.maximum(:position).to_i + 1
    
    if @goal.save
      respond_to do |format|
        format.html { redirect_to goals_path, notice: 'Goal was successfully created.' }
        format.json { render json: @goal, status: :created }
      end
    else
      respond_to do |format|
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: { errors: @goal.errors }, status: :unprocessable_entity }
      end
    end
  end

  def edit
    @goal = Goal.find(params[:id])
  end

  def update
    @goal = Goal.find(params[:id])
    
    if @goal.update(goal_params)
      respond_to do |format|
        format.html { redirect_to goals_path, notice: 'Goal was successfully updated.' }
        format.json { render json: @goal }
      end
    else
      respond_to do |format|
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: { errors: @goal.errors }, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @goal = Goal.find(params[:id])
    @goal.destroy
    
    respond_to do |format|
      format.html { redirect_to goals_path, notice: 'Goal was successfully deleted.' }
      format.json { head :no_content }
    end
  end

  def move_up
    @goal = Goal.find(params[:id])
    Rails.logger.info "Move up requested for goal: #{@goal.name} (ID: #{@goal.id})"
    if @goal.move_up
      redirect_to goals_path, notice: 'Goal moved up successfully.'
    else
      redirect_to goals_path, alert: 'Goal is already at the top.'
    end
  end

  def move_down
    @goal = Goal.find(params[:id])
    Rails.logger.info "Move down requested for goal: #{@goal.name} (ID: #{@goal.id})"
    if @goal.move_down
      redirect_to goals_path, notice: 'Goal moved down successfully.'
    else
      redirect_to goals_path, alert: 'Goal is already at the bottom.'
    end
  end

  def reorder
    goal_ids = params[:goal_ids]
    if goal_ids.present?
      Goal.reorder(goal_ids)
      render json: { success: true }
    else
      render json: { success: false, error: 'No goal IDs provided' }
    end
  end

  private

  def goal_params
    params.require(:goal).permit(:name, :description)
  end
end
