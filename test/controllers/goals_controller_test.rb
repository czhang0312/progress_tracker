require "test_helper"

class GoalsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @goal = goals(:one)
  end

  test "should get 401 when not signed in" do
    get goals_url, as: :json
    assert_response :unauthorized
  end

  test "should get index as json" do
    sign_in @user
    get goals_url, as: :json
    assert_response :success
  end

  test "should create goal" do
    sign_in @user
    assert_difference("Goal.count") do
      post goals_url, params: { goal: { name: "New Goal", description: "Test description" } }
    end
  end

  test "should show goal as json" do
    sign_in @user
    get goal_url(@goal), as: :json
    assert_response :success
  end

  test "should update goal" do
    sign_in @user
    patch goal_url(@goal), params: { goal: { name: "Updated Name" } }
    @goal.reload
    assert_equal "Updated Name", @goal.name
  end

  test "should destroy goal" do
    sign_in @user
    assert_difference("Goal.count", -1) do
      delete goal_url(@goal)
    end
  end
end
