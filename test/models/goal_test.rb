require "test_helper"

class GoalTest < ActiveSupport::TestCase
  test "should be valid with valid attributes" do
    goal = goals(:one)
    assert goal.valid?
  end

  test "should require name" do
    goal = Goal.new(description: "Test", user: users(:one))
    assert_not goal.valid?
    assert_includes goal.errors[:name], "can't be blank"
  end

  test "should require description" do
    goal = Goal.new(name: "Test Goal", user: users(:one))
    assert_not goal.valid?
    assert_includes goal.errors[:description], "can't be blank"
  end

  test "should belong to user" do
    goal = goals(:one)
    assert_respond_to goal, :user
  end

  test "should have many daily progresses" do
    goal = goals(:one)
    assert_respond_to goal, :daily_progresses
  end

  test "should have status options" do
    options = Goal.status_options
    assert_equal 3, options.size
    assert_equal "Empty", options[0]
    assert_equal "Half", options[1]
    assert_equal "Filled", options[2]
  end

  test "should enforce name uniqueness within the same user" do
    duplicate = Goal.new(
      name: goals(:one).name,
      description: "Different description",
      user: users(:one)
    )
    assert_not duplicate.valid?
    assert_includes duplicate.errors[:name], "has already been taken"
  end

  test "should allow same name for different users" do
    goal = Goal.new(
      name: goals(:one).name,
      description: goals(:one).description,
      user: users(:two)
    )
    assert goal.valid?
  end

  test "should have correct status constants" do
    assert_equal 0, Goal::STATUS_EMPTY
    assert_equal 1, Goal::STATUS_HALF
    assert_equal 2, Goal::STATUS_FILLED
  end

  test "should destroy daily progresses when goal is destroyed" do
    goal = goals(:one)
    progress_ids = goal.daily_progresses.pluck(:id)
    assert progress_ids.any?
    goal.destroy
    assert DailyProgress.where(id: progress_ids).empty?
  end
end
