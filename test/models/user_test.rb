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

  test "should require email" do
    user = User.new(password: "password123")
    assert_not user.valid?
    assert_includes user.errors[:email], "can't be blank"
  end
end
