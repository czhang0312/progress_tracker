require "test_helper"

class ProgressControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @other_user = users(:two)
    @goal = goals(:one)
    @other_users_goal = goals(:three)
  end

  test "guest should get monthly progress as json" do
    get monthly_progress_url(year: 2024, month: 6), as: :json
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal 2024, body["year"]
    assert_equal 6, body["month"]
    assert_equal [], body["goals"]
    assert_equal({}, body["daily_progresses"])
    assert_equal({}, body["journal_entries"])
  end

  test "guest should get auth required on progress update" do
    date = Date.today

    patch update_progress_url(
      year: date.year,
      month: date.month,
      goal_id: @goal.id,
      date: date.to_s
    ), params: { status: 1 }, as: :json

    assert_response :unauthorized
    body = JSON.parse(response.body)
    assert_equal false, body["success"]
    assert_equal "AUTH_REQUIRED", body["code"]
  end

  test "should update progress" do
    sign_in @user
    date = Date.today
    patch update_progress_url(
      year: date.year,
      month: date.month,
      goal_id: @goal.id,
      date: date.to_s
    ), params: { status: 1 }, as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal true, body["success"]
    assert_equal 1, body["status"]
  end

  test "should update existing daily progress record" do
    sign_in @user
    existing = daily_progresses(:one)
    patch update_progress_url(
      year: existing.date.year,
      month: existing.date.month,
      goal_id: existing.goal_id,
      date: existing.date.to_s
    ), params: { status: 2 }, as: :json

    assert_response :success
    assert_equal 2, existing.reload.status
  end

  test "authenticated user should see their goals in monthly progress" do
    sign_in @user
    get monthly_progress_url(year: 2025, month: 6), as: :json
    assert_response :success
    body = JSON.parse(response.body)
    returned_ids = body["goals"].map { |g| g["id"] }
    assert_includes returned_ids, @goal.id
    assert_not_includes returned_ids, @other_users_goal.id
  end

  test "authenticated user should see their journal entries in monthly progress" do
    sign_in @user
    get monthly_progress_url(year: 2025, month: 6), as: :json
    assert_response :success
    body = JSON.parse(response.body)
    assert_instance_of Hash, body["journal_entries"]
  end

  test "should not update progress for another user's goal" do
    sign_in @user
    date = Date.today

    assert_raises(ActiveRecord::RecordNotFound) do
      patch update_progress_url(
        year: date.year,
        month: date.month,
        goal_id: @other_users_goal.id,
        date: date.to_s
      ), params: { status: 1 }, as: :json
    end
  end

  test "index should redirect to current month" do
    sign_in @user
    get "/progress"
    assert_redirected_to monthly_progress_path(Date.current.year, Date.current.month)
  end
end
