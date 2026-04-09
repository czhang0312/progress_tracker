require "test_helper"

class GoalsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @other_user = users(:two)
    @goal = goals(:one)
    @other_users_goal = goals(:three)
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
    body = JSON.parse(response.body)
    assert_instance_of Array, body
  end

  test "index should only return current user goals" do
    sign_in @user
    get goals_url, as: :json
    assert_response :success
    body = JSON.parse(response.body)
    returned_ids = body.map { |g| g["id"] }
    assert_not_includes returned_ids, @other_users_goal.id
  end

  test "should create goal" do
    sign_in @user
    assert_difference("Goal.count") do
      post goals_url, params: { goal: { name: "New Goal", description: "Test description" } }, as: :json
    end

    assert_response :created
  end

  test "should return unprocessable entity when creating goal with missing name" do
    sign_in @user
    assert_no_difference("Goal.count") do
      post goals_url, params: { goal: { description: "No name" } }, as: :json
    end

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert body["name"].any?
  end

  test "should return unprocessable entity when creating goal with duplicate name" do
    sign_in @user
    assert_no_difference("Goal.count") do
      post goals_url, params: { goal: { name: @goal.name, description: "Duplicate" } }, as: :json
    end

    assert_response :unprocessable_entity
  end

  test "should show goal as json" do
    sign_in @user
    get goal_url(@goal), as: :json
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal @goal.id, body["id"]
  end

  test "should not show another user's goal" do
    sign_in @user
    assert_raises(ActiveRecord::RecordNotFound) do
      get goal_url(@other_users_goal), as: :json
    end
  end

  test "should update goal" do
    sign_in @user
    patch goal_url(@goal), params: { goal: { name: "Updated Name" } }, as: :json
    assert_response :success
    @goal.reload
    assert_equal "Updated Name", @goal.name
  end

  test "should return unprocessable entity when updating goal with blank name" do
    sign_in @user
    patch goal_url(@goal), params: { goal: { name: "" } }, as: :json
    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert body["name"].any?
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

  test "should reorder goals" do
    sign_in @user
    goal_two = goals(:two)
    patch reorder_goals_url, params: { goal_ids: [ goal_two.id, @goal.id ] }, as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal true, body["success"]

    assert_equal 1, goal_two.reload.position
    assert_equal 2, @goal.reload.position
  end

  test "should return bad request when reorder receives invalid goal_ids" do
    sign_in @user
    patch reorder_goals_url, params: { goal_ids: "not-an-array" }, as: :json

    assert_response :bad_request
    body = JSON.parse(response.body)
    assert body["error"].present?
  end

  test "should move goal up" do
    sign_in @user
    goal_two = goals(:two)
    original_position = goal_two.position

    patch move_up_goal_url(goal_two), as: :json

    assert_response :redirect
    assert_equal original_position - 1, goal_two.reload.position
  end

  test "should not move goal up when already at top" do
    sign_in @user
    original_position = @goal.position
    assert_equal 1, original_position

    patch move_up_goal_url(@goal), as: :json

    assert_response :redirect
    assert_equal original_position, @goal.reload.position
  end

  test "should move goal down" do
    sign_in @user
    original_position = @goal.position

    patch move_down_goal_url(@goal), as: :json

    assert_response :redirect
    assert_equal original_position + 1, @goal.reload.position
  end

  test "should not move goal down when already at bottom" do
    sign_in @user
    goal_two = goals(:two)
    original_position = goal_two.position
    assert_equal 2, original_position

    patch move_down_goal_url(goal_two), as: :json

    assert_response :redirect
    assert_equal original_position, goal_two.reload.position
  end
end
