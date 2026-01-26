require "test_helper"

class DailyProgressTest < ActiveSupport::TestCase
  test "should be valid with valid attributes" do
    progress = DailyProgress.new(
      goal: goals(:one),
      date: Date.today,
      status: 1
    )
    assert progress.valid?
  end

  test "should require date" do
    progress = DailyProgress.new(goal: goals(:one), status: 1)
    assert_not progress.valid?
    assert_includes progress.errors[:date], "can't be blank"
  end

  test "should require valid status" do
    progress = DailyProgress.new(goal: goals(:one), date: Date.today, status: 5)
    assert_not progress.valid?
    assert_includes progress.errors[:status], "is not included in the list"
  end

  test "should belong to goal" do
    progress = DailyProgress.new(goal: goals(:one), date: Date.today, status: 1)
    assert_respond_to progress, :goal
  end

  test "should return status text" do
    progress = DailyProgress.new(goal: goals(:one), date: Date.today, status: 0)
    assert_equal "Empty", progress.status_text
    
    progress.status = 1
    assert_equal "Half", progress.status_text
    
    progress.status = 2
    assert_equal "Filled", progress.status_text
  end
end
