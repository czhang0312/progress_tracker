class GoalsController < ApplicationController
  skip_before_action :verify_authenticity_token

  before_action :require_auth_for_write!, except: [ :index, :show ]
  before_action :set_goal, only: [ :show, :edit, :update, :destroy, :move_up, :move_down ]

  # GET /goals
  def index
    @goals = scoped_goals.order(:position)

    respond_to do |format|
      format.html
      format.json { render json: @goals }
    end
  end

  # GET /goals/1
  def show
    respond_to do |format|
      format.html
      format.json { render json: @goal }
    end
  end

  # GET /goals/new
  def new
    @goal = current_user.goals.build
  end

  # GET /goals/1/edit
  def edit
  end

  # POST /goals
  def create
    @goal = current_user.goals.build(goal_params)
    @goal.position = current_user.goals.maximum(:position).to_i + 1

    respond_to do |format|
      if @goal.save
        format.html { redirect_to goals_url, notice: "Goal was successfully created." }
        format.json { render json: @goal, status: :created }
      else
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: @goal.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /goals/1
  def update
    respond_to do |format|
      if @goal.update(goal_params)
        format.html { redirect_to goals_url, notice: "Goal was successfully updated." }
        format.json { render json: @goal }
      else
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: @goal.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /goals/1
  def destroy
    @goal.destroy

    respond_to do |format|
      format.html { redirect_to goals_url, notice: "Goal was successfully destroyed." }
      format.json { head :no_content }
    end
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

    redirect_to goals_url
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

    redirect_to goals_url
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
    # Use callbacks to share common setup or constraints between actions.
    def set_goal
      @goal = scoped_goals.find(params[:id])
    end

    def scoped_goals
      return Goal.none unless user_signed_in?

      current_user.goals
    end

    # Only allow a list of trusted parameters through.
    def goal_params
      params.require(:goal).permit(:name, :description)
    end
end
