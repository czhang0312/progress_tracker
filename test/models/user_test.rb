require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "should have valid factory" do
    user = users(:one)
    assert user.valid?
  end

  test "should have many goals" do
    user = users(:one)
    assert_respond_to user, :goals
  end

  test "should have many journal entries" do
    user = users(:one)
    assert_respond_to user, :journal_entries
  end

  test "should have many daily progresses through goals" do
    user = users(:one)
    assert_respond_to user, :daily_progresses
  end

  test "should require email" do
    user = User.new(password: "password123")
    assert_not user.valid?
    assert_includes user.errors[:email], "can't be blank"
  end

  test "should require password" do
    user = User.new(email: "new@example.com")
    assert_not user.valid?
    assert_includes user.errors[:password], "can't be blank"
  end

  test "should require unique email" do
    duplicate = User.new(email: users(:one).email, password: "password123")
    assert_not duplicate.valid?
    assert_includes duplicate.errors[:email], "has already been taken"
  end

  test "should reject invalid email format" do
    user = User.new(email: "not-an-email", password: "password123")
    assert_not user.valid?
    assert user.errors[:email].any?
  end

  test "should destroy goals when user is destroyed" do
    user = users(:one)
    goal_ids = user.goals.pluck(:id)
    assert goal_ids.any?
    user.destroy
    assert Goal.where(id: goal_ids).empty?
  end

  test "should destroy journal entries when user is destroyed" do
    user = users(:one)
    entry_ids = user.journal_entries.pluck(:id)
    assert entry_ids.any?
    user.destroy
    assert JournalEntry.where(id: entry_ids).empty?
  end
end
