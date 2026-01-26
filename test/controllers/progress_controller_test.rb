require "test_helper"

class ProgressControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @goal = goals(:one)
  end

  test "should get 401 when not signed in" do
    get monthly_progress_url(year: 2024, month: 6), as: :json
    assert_response :unauthorized
  end

  test "should update progress" do
    sign_in @user
    date = Date.today
    patch update_progress_url(
      year: date.year, 
      month: date.month,
      goal_id: @goal.id, 
      date: date.day
    ), params: { status: 1 }, as: :json
    
    assert_response :success
  end
end
