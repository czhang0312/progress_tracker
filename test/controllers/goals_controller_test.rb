require "test_helper"

class GoalsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @goal = goals(:one)
    sign_in @user
  end

  test "should get index as json" do
    get goals_url, as: :json
    assert_response :success
  end

  test "should create goal" do
    assert_difference("Goal.count") do
      post goals_url, params: { goal: { name: "New Goal", description: "Test description" } }
    end
  end

  test "should show goal as json" do
    get goal_url(@goal), as: :json
    assert_response :success
  end

  test "should update goal" do
    patch goal_url(@goal), params: { goal: { name: "Updated Name" } }
    @goal.reload
    assert_equal "Updated Name", @goal.name
  end

  test "should destroy goal" do
    assert_difference("Goal.count", -1) do
      delete goal_url(@goal)
    end
  end
end
