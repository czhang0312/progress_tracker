require "test_helper"

class JournalEntriesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @journal_entry = journal_entries(:one)
    sign_in @user
  end

  test "should create journal entry" do
    assert_difference("JournalEntry.count") do
      post journal_entries_url, params: { 
        journal_entry: { 
          date: Date.tomorrow, 
          content: "Test content" 
        } 
      }
    end
  end

  test "should update journal entry" do
    patch journal_entry_url(@journal_entry), params: { 
      journal_entry: { content: "Updated content" } 
    }
    @journal_entry.reload
    assert_equal "Updated content", @journal_entry.content
  end

  test "journal entry belongs to user" do
    assert_equal @user, @journal_entry.user
  end
end
