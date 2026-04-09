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
    assert_includes duplicate.errors[:date], "There is already a journal entry for this date. Choose a different date or edit the existing entry."
  end
end
