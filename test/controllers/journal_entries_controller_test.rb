require "test_helper"

class JournalEntriesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @journal_entry = journal_entries(:one)
  end

  test "guest should get index as json" do
    get journal_entries_url, as: :json
    assert_response :success
    assert_equal [], JSON.parse(response.body)
  end

  test "guest should get auth required on create" do
    assert_no_difference("JournalEntry.count") do
      post journal_entries_url,
           params: {
             journal_entry: {
               date: Date.today,
               content: "Guest write"
             }
           },
           as: :json
    end

    assert_response :unauthorized
    body = JSON.parse(response.body)
    assert_equal false, body["success"]
    assert_equal "AUTH_REQUIRED", body["code"]
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
      }, as: :json
    end

    assert_response :created
  end

  test "should update journal entry" do
    sign_in @user
    patch journal_entry_url(@journal_entry), params: {
      journal_entry: { content: "Updated content" }
    }, as: :json
    assert_response :success
    @journal_entry.reload
    assert_equal "Updated content", @journal_entry.content
  end

  test "guest should get auth required on destroy" do
    assert_no_difference("JournalEntry.count", -1) do
      delete journal_entry_url(@journal_entry), as: :json
    end

    assert_response :unauthorized
    body = JSON.parse(response.body)
    assert_equal "AUTH_REQUIRED", body["code"]
  end
end
