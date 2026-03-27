require "test_helper"

class ProgressControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @goal = goals(:one)
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
  end
end
