class TasksController < ApplicationController
  skip_before_action :verify_authenticity_token

  before_action :require_auth_for_write!, except: [ :index ]
  before_action :set_task, only: [ :update, :destroy ]

  # GET /tasks
  def index
    render json: scoped_tasks.order(:position, :id)
  end

  # POST /tasks
  def create
    task = current_user.tasks.build(task_params)
    task.goal = resolve_goal if params[:task]&.key?(:goal_id)
    task.position = current_user.tasks.maximum(:position).to_i + 1

    # A goal-linked task inherits the goal's daily target as its estimate.
    if task.goal&.target_pomodoros && !params[:task]&.key?(:estimated_pomodoros)
      task.estimated_pomodoros = task.goal.target_pomodoros
    end

    if task.save
      render json: task, status: :created
    else
      render json: task.errors, status: :unprocessable_content
    end
  end

  # PATCH/PUT /tasks/1
  def update
    @task.goal = resolve_goal if params[:task]&.key?(:goal_id)

    if @task.update(task_params)
      render json: @task
    else
      render json: @task.errors, status: :unprocessable_content
    end
  end

  # DELETE /tasks/1
  def destroy
    @task.destroy
    head :no_content
  end

  # DELETE /tasks/clear_finished
  def clear_finished
    deleted = current_user.tasks.finished.destroy_all.size
    render json: { success: true, deleted: deleted }
  end

  # PATCH /tasks/reset_pomodoros
  # Zeroes out each task's completed pomodoro count so tasks can be reused
  # on a new day without losing their name/estimate/goal link.
  def reset_pomodoros
    updated = current_user.tasks.where.not(completed_pomodoros: 0).update_all(completed_pomodoros: 0)
    render json: { success: true, updated: updated }
  end

  # PATCH /tasks/reorder
  def reorder
    task_ids = params[:task_ids]

    if task_ids.is_a?(Array)
      task_ids.each_with_index do |task_id, index|
        current_user.tasks.where(id: task_id).update_all(position: index + 1)
      end
      render json: { success: true }
    else
      render json: { error: "Invalid task_ids parameter" }, status: :bad_request
    end
  end

  private
    def set_task
      @task = current_user.tasks.find(params[:id])
    end

    def scoped_tasks
      return Task.none unless user_signed_in?

      current_user.tasks
    end

    def resolve_goal
      goal_id = params[:task][:goal_id]
      goal_id.present? ? current_user.goals.find(goal_id) : nil
    end

    def task_params
      params.require(:task).permit(:name, :note, :estimated_pomodoros, :completed_pomodoros, :done)
    end
end
