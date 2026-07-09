require "test_helper"

class PomodoroSessionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @linked_task = tasks(:linked) # linked to goals(:two), target_pomodoros: 2
    @date = "2026-07-09"
  end

  def complete_session(task_id: @linked_task.id, date: @date)
    post pomodoro_sessions_url,
         params: { task_id: task_id, date: date, duration_minutes: 25 },
         as: :json
  end

  test "guest should get auth required" do
    assert_no_difference("PomodoroSession.count") do
      complete_session
    end

    assert_response :unauthorized
    assert_equal "AUTH_REQUIRED", JSON.parse(response.body)["code"]
  end

  test "records session and increments task counter" do
    sign_in @user
    assert_difference("PomodoroSession.count") do
      complete_session
    end

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal 1, body["task"]["completed_pomodoros"]
    assert_equal goals(:two).id, body["session"]["goal_id"]
  end

  test "first session below target fills circle to half" do
    sign_in @user
    complete_session

    body = JSON.parse(response.body)
    assert_equal 1, body["daily_progress"]["status"]
    assert_equal 1, DailyProgress.find_by(goal: goals(:two), date: @date).status
  end

  test "reaching target fills circle completely" do
    sign_in @user
    complete_session
    complete_session

    body = JSON.parse(response.body)
    assert_equal 2, body["daily_progress"]["status"]
    assert_equal 2, DailyProgress.find_by(goal: goals(:two), date: @date).status
  end

  test "partial session never downgrades a manually filled circle" do
    sign_in @user
    DailyProgress.create!(goal: goals(:two), date: @date, status: 2)

    complete_session

    assert_nil JSON.parse(response.body)["daily_progress"]
    assert_equal 2, DailyProgress.find_by(goal: goals(:two), date: @date).status
  end

  test "reaching target upgrades a manually half-filled circle" do
    sign_in @user
    DailyProgress.create!(goal: goals(:two), date: @date, status: 1)

    complete_session
    complete_session

    assert_equal 2, DailyProgress.find_by(goal: goals(:two), date: @date).status
  end

  test "sessions on different dates count separately" do
    sign_in @user
    complete_session
    complete_session(date: "2026-07-10")

    assert_equal 1, DailyProgress.find_by(goal: goals(:two), date: @date).status
    assert_equal 1, DailyProgress.find_by(goal: goals(:two), date: "2026-07-10").status
  end

  test "task without goal records session but no progress" do
    sign_in @user
    assert_no_difference("DailyProgress.count") do
      complete_session(task_id: tasks(:one).id)
    end

    body = JSON.parse(response.body)
    assert_nil body["daily_progress"]
    assert_equal 1, body["task"]["completed_pomodoros"]
  end

  test "goal without target records session but no progress" do
    sign_in @user
    task = @user.tasks.create!(name: "Ruby", goal: goals(:one))

    assert_no_difference("DailyProgress.count") do
      complete_session(task_id: task.id)
    end

    assert_nil JSON.parse(response.body)["daily_progress"]
  end

  test "session without task records with nulls" do
    sign_in @user
    assert_difference("PomodoroSession.count") do
      complete_session(task_id: nil)
    end

    body = JSON.parse(response.body)
    assert_nil body["task"]
    assert_nil body["session"]["task_id"]
    assert_nil body["session"]["goal_id"]
  end

  test "cannot record session against another user's task" do
    sign_in @user
    complete_session(task_id: tasks(:other_user).id)
    assert_response :not_found
  end

  test "rejects invalid date" do
    sign_in @user
    complete_session(date: "not-a-date")
    assert_response :bad_request
  end
end
