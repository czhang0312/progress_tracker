require "test_helper"

class JournalEntryTest < ActiveSupport::TestCase
  test "should be valid with valid attributes" do
    entry = journal_entries(:one)
    assert entry.valid?
  end

  test "should require date" do
    entry = JournalEntry.new(user: users(:one))
    assert_not entry.valid?
    assert_includes entry.errors[:date], "can't be blank"
  end

  test "should belong to user" do
    entry = journal_entries(:one)
    assert_respond_to entry, :user
  end

  test "should enforce unique date per user" do
    existing = journal_entries(:one)
    duplicate = JournalEntry.new(
      date: existing.date,
      user: existing.user
    )
    assert_not duplicate.valid?
    assert_includes duplicate.errors[:date], "has already been taken"
  end

  test "should allow same date for different users" do
    entry_user_one = journal_entries(:one)
    entry_user_two = JournalEntry.new(
      date: entry_user_one.date,
      content: "Different user's entry",
      user: users(:two)
    )
    assert entry_user_two.valid?
  end

  test "should store content" do
    entry = journal_entries(:one)
    assert_equal "Today was productive", entry.content
  end

  test "should be valid without content" do
    entry = JournalEntry.new(date: Date.today, user: users(:one))
    assert entry.valid?
  end
end
