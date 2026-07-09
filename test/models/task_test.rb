require "test_helper"

class TaskTest < ActiveSupport::TestCase
  test "should be valid with valid attributes" do
    assert tasks(:one).valid?
  end

  test "should require name" do
    task = Task.new(user: users(:one))
    assert_not task.valid?
    assert_includes task.errors[:name], "can't be blank"
  end

  test "should not require a goal" do
    assert_nil tasks(:one).goal
    assert tasks(:one).valid?
  end

  test "should require estimated pomodoros of at least 1" do
    task = tasks(:one)
    task.estimated_pomodoros = 0
    assert_not task.valid?
  end

  test "should not allow negative completed pomodoros" do
    task = tasks(:one)
    task.completed_pomodoros = -1
    assert_not task.valid?
  end

  test "finished scope returns only done tasks" do
    finished = users(:one).tasks.finished
    assert_includes finished, tasks(:finished)
    assert_not_includes finished, tasks(:one)
  end

  test "destroying goal nullifies task goal_id" do
    task = tasks(:linked)
    task.goal.destroy
    task.reload
    assert_nil task.goal_id
  end
end
