require "test_helper"

class TasksControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @task = tasks(:one)
  end

  test "guest should get empty index as json" do
    get tasks_url, as: :json
    assert_response :success
    assert_equal [], JSON.parse(response.body)
  end

  test "guest should get auth required on create" do
    assert_no_difference("Task.count") do
      post tasks_url, params: { task: { name: "Guest Task" } }, as: :json
    end

    assert_response :unauthorized
    assert_equal "AUTH_REQUIRED", JSON.parse(response.body)["code"]
  end

  test "should get index with only own tasks" do
    sign_in @user
    get tasks_url, as: :json
    assert_response :success
    names = JSON.parse(response.body).map { |t| t["name"] }
    assert_includes names, @task.name
    assert_not_includes names, tasks(:other_user).name
  end

  test "should create task" do
    sign_in @user
    assert_difference("Task.count") do
      post tasks_url, params: { task: { name: "New Task", estimated_pomodoros: 3 } }, as: :json
    end

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal 3, body["estimated_pomodoros"]
    assert_nil body["goal_id"]
  end

  test "goal-linked task inherits estimate from goal target" do
    sign_in @user
    post tasks_url, params: { task: { name: "From goal", goal_id: goals(:two).id } }, as: :json

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal goals(:two).id, body["goal_id"]
    assert_equal goals(:two).target_pomodoros, body["estimated_pomodoros"]
  end

  test "explicit estimate wins over goal target" do
    sign_in @user
    post tasks_url, params: { task: { name: "From goal", goal_id: goals(:two).id, estimated_pomodoros: 5 } }, as: :json

    assert_response :created
    assert_equal 5, JSON.parse(response.body)["estimated_pomodoros"]
  end

  test "cannot link a task to another user's goal" do
    sign_in @user
    post tasks_url, params: { task: { name: "Sneaky", goal_id: goals(:three).id } }, as: :json
    assert_response :not_found
  end

  test "should update task including manual act count and unlink" do
    sign_in @user
    patch task_url(tasks(:linked)), params: { task: { completed_pomodoros: 4, done: true, goal_id: nil } }, as: :json
    assert_response :success
    tasks(:linked).reload
    assert_equal 4, tasks(:linked).completed_pomodoros
    assert tasks(:linked).done
    assert_nil tasks(:linked).goal_id
  end

  test "cannot update another user's task" do
    sign_in @user
    patch task_url(tasks(:other_user)), params: { task: { name: "Hijacked" } }, as: :json
    assert_response :not_found
  end

  test "should destroy task" do
    sign_in @user
    assert_difference("Task.count", -1) do
      delete task_url(@task), as: :json
    end

    assert_response :no_content
  end

  test "clear_finished deletes only own done tasks" do
    sign_in @user
    finished_id = tasks(:finished).id

    assert_difference("Task.count", -1) do
      delete clear_finished_tasks_url, as: :json
    end

    assert_not Task.exists?(finished_id)
    assert Task.exists?(tasks(:one).id)
    assert Task.exists?(tasks(:other_user).id)
  end
end
