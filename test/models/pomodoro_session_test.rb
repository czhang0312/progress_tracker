require "test_helper"

class PomodoroSessionTest < ActiveSupport::TestCase
  test "should be valid with task and goal" do
    session = PomodoroSession.new(
      user: users(:one), task: tasks(:linked), goal: goals(:two),
      date: Date.new(2026, 7, 9), duration_minutes: 25
    )
    assert session.valid?
  end

  test "should be valid without task or goal" do
    session = PomodoroSession.new(user: users(:one), date: Date.new(2026, 7, 9), duration_minutes: 25)
    assert session.valid?
  end

  test "should require date" do
    session = PomodoroSession.new(user: users(:one), duration_minutes: 25)
    assert_not session.valid?
  end

  test "should require positive duration" do
    session = PomodoroSession.new(user: users(:one), date: Date.new(2026, 7, 9), duration_minutes: 0)
    assert_not session.valid?
  end

  test "destroying goal nullifies session goal_id" do
    session = PomodoroSession.create!(
      user: users(:one), task: tasks(:linked), goal: goals(:two),
      date: Date.new(2026, 7, 9), duration_minutes: 25
    )
    goals(:two).destroy
    session.reload
    assert_nil session.goal_id
  end

  test "destroying task nullifies session task_id" do
    session = PomodoroSession.create!(
      user: users(:one), task: tasks(:one),
      date: Date.new(2026, 7, 9), duration_minutes: 25
    )
    tasks(:one).destroy
    session.reload
    assert_nil session.task_id
  end
end
