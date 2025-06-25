class GoalsController < ApplicationController
  def index
    @goals = Goal.all
  end

  def show
    @goal = Goal.find(params[:id])
  end

  def new
    @goal = Goal.new
  end

  def create
    @goal = Goal.new(goal_params)
    
    if @goal.save
      redirect_to goals_path, notice: 'Goal was successfully created.'
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
    @goal = Goal.find(params[:id])
  end

  def update
    @goal = Goal.find(params[:id])
    
    if @goal.update(goal_params)
      redirect_to goals_path, notice: 'Goal was successfully updated.'
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @goal = Goal.find(params[:id])
    @goal.destroy
    
    redirect_to goals_path, notice: 'Goal was successfully deleted.'
  end

  private

  def goal_params
    params.require(:goal).permit(:name, :description)
  end
end
