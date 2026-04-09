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

  test "should accept status 0 (empty)" do
    progress = DailyProgress.new(goal: goals(:one), date: Date.today, status: 0)
    assert progress.valid?
  end

  test "should accept status 1 (half)" do
    progress = DailyProgress.new(goal: goals(:one), date: Date.today, status: 1)
    assert progress.valid?
  end

  test "should accept status 2 (filled)" do
    progress = DailyProgress.new(goal: goals(:one), date: Date.today, status: 2)
    assert progress.valid?
  end

  test "should belong to goal" do
    progress = DailyProgress.new(goal: goals(:one), date: Date.today, status: 1)
    assert_equal goals(:one), progress.goal
  end

  test "should return status text" do
    progress = DailyProgress.new(goal: goals(:one), date: Date.today, status: 0)
    assert_equal "Empty", progress.status_text

    progress.status = 1
    assert_equal "Half", progress.status_text

    progress.status = 2
    assert_equal "Filled", progress.status_text
  end

  test "should return Unknown for unrecognised status" do
    progress = DailyProgress.new(goal: goals(:one), date: Date.today, status: 99)
    assert_equal "Unknown", progress.status_text
  end

  test "should prevent duplicate goal and date on create" do
    existing = daily_progresses(:one)
    duplicate = DailyProgress.new(
      goal: existing.goal,
      date: existing.date,
      status: 2
    )
    assert_not duplicate.valid?
    assert duplicate.errors[:goal_id].any?
  end

  test "should allow same goal on different dates" do
    progress = DailyProgress.new(
      goal: goals(:one),
      date: Date.today,
      status: 1
    )
    assert progress.valid?
  end

  test "should allow different goals on the same date" do
    existing = daily_progresses(:one)
    progress = DailyProgress.new(
      goal: goals(:two),
      date: existing.date,
      status: 1
    )
    assert progress.valid?
  end

  test "should bypass uniqueness check on update" do
    existing = daily_progresses(:one)
    existing.status = 2
    assert existing.valid?
  end

  test "should have correct status constants" do
    assert_equal 0, DailyProgress::STATUS_EMPTY
    assert_equal 1, DailyProgress::STATUS_HALF
    assert_equal 2, DailyProgress::STATUS_FILLED
  end
end
