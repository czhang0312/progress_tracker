require "test_helper"

class GoalsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @goal = goals(:one)
  end

  test "guest should get index as json" do
    get goals_url, as: :json
    assert_response :success
    assert_equal [], JSON.parse(response.body)
  end

  test "guest should get auth required on create" do
    assert_no_difference("Goal.count") do
      post goals_url,
           params: { goal: { name: "Guest Goal", description: "Should not save" } },
           as: :json
    end

    assert_response :unauthorized
    body = JSON.parse(response.body)
    assert_equal false, body["success"]
    assert_equal "AUTH_REQUIRED", body["code"]
  end

  test "should get index as json" do
    sign_in @user
    get goals_url, as: :json
    assert_response :success
  end

  test "should create goal" do
    sign_in @user
    assert_difference("Goal.count") do
      post goals_url, params: { goal: { name: "New Goal", description: "Test description" } }, as: :json
    end

    assert_response :created
  end

  test "should show goal as json" do
    sign_in @user
    get goal_url(@goal), as: :json
    assert_response :success
  end

  test "should update goal" do
    sign_in @user
    patch goal_url(@goal), params: { goal: { name: "Updated Name" } }, as: :json
    assert_response :success
    @goal.reload
    assert_equal "Updated Name", @goal.name
  end

  test "should destroy goal" do
    sign_in @user
    assert_difference("Goal.count", -1) do
      delete goal_url(@goal), as: :json
    end

    assert_response :no_content
  end

  test "guest should get auth required on reorder" do
    patch reorder_goals_url, params: { goal_ids: [ @goal.id ] }, as: :json

    assert_response :unauthorized
    body = JSON.parse(response.body)
    assert_equal "AUTH_REQUIRED", body["code"]
  end
end
