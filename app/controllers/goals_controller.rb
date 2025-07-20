class GoalsController < ApplicationController
  before_action :set_goal, only: [ :show, :update, :destroy, :move_up, :move_down ]

  # GET /goals
  def index
    goals = current_user.goals.order(:position)
    render json: goals
  end

  # GET /goals/1
  def show
    render json: @goal
  end

  # POST /goals
  def create
    goal = current_user.goals.build(goal_params)
    goal.position = current_user.goals.maximum(:position).to_i + 1
    if goal.save
      render json: goal, status: :created
    else
      render json: goal.errors, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /goals/1
  def update
    if @goal.update(goal_params)
      render json: @goal
    else
      render json: @goal.errors, status: :unprocessable_entity
    end
  end

  # DELETE /goals/1
  def destroy
    @goal.destroy
    head :no_content
  end

  # PATCH /goals/1/move_up
  def move_up
    if @goal.position > 1
      previous_goal = current_user.goals.find_by(position: @goal.position - 1)
      if previous_goal
        previous_goal.update(position: @goal.position)
        @goal.update(position: @goal.position - 1)
      end
    end
    render json: { success: true }
  end

  # PATCH /goals/1/move_down
  def move_down
    max_position = current_user.goals.maximum(:position)
    if @goal.position < max_position
      next_goal = current_user.goals.find_by(position: @goal.position + 1)
      if next_goal
        next_goal.update(position: @goal.position)
        @goal.update(position: @goal.position + 1)
      end
    end
    render json: { success: true }
  end

  # PATCH /goals/reorder
  def reorder
    goal_ids = params[:goal_ids]
    if goal_ids.is_a?(Array)
      goal_ids.each_with_index do |goal_id, index|
        current_user.goals.where(id: goal_id).update_all(position: index + 1)
      end
      render json: { success: true }
    else
      render json: { error: "Invalid goal_ids parameter" }, status: :bad_request
    end
  end

  private
    def set_goal
      @goal = current_user.goals.find(params[:id])
    end

    def goal_params
      params.require(:goal).permit(:name, :description)
    end
end
