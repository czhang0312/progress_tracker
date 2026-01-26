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
end
