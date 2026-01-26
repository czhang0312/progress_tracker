require "test_helper"

class ProgressControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @goal = goals(:one)
    sign_in @user
  end

  test "should update progress" do
    date = Date.today
    patch update_progress_url(
      year: date.year, 
      month: date.month,
      goal_id: @goal.id, 
      date: date.day
    ), params: { status: 1 }, as: :json
    
    assert_response :success
  end
  
  test "progress belongs to goal" do
    progress = DailyProgress.create!(
      goal: @goal,
      date: Date.today,
      status: 1
    )
    assert_equal @goal, progress.goal
  end
end
