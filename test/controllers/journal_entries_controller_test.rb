require "test_helper"

class JournalEntriesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @journal_entry = journal_entries(:one)
  end

  test "should get 401 when not signed in" do
    get journal_entries_url, as: :json
    assert_response :unauthorized
  end

  test "should get index as json" do
    sign_in @user
    get journal_entries_url, as: :json
    assert_response :success
  end

  test "should show journal entry as json" do
    sign_in @user
    get journal_entry_url(@journal_entry), as: :json
    assert_response :success
  end

  test "should create journal entry" do
    sign_in @user
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
    sign_in @user
    patch journal_entry_url(@journal_entry), params: { 
      journal_entry: { content: "Updated content" } 
    }
    @journal_entry.reload
    assert_equal "Updated content", @journal_entry.content
  end
end
