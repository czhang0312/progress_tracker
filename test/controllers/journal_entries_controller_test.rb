require "test_helper"

class JournalEntriesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @other_user = users(:two)
    @journal_entry = journal_entries(:one)
    @other_users_entry = journal_entries(:three)
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
    body = JSON.parse(response.body)
    assert_instance_of Array, body
  end

  test "index should only return current user entries" do
    sign_in @user
    get journal_entries_url, as: :json
    assert_response :success
    body = JSON.parse(response.body)
    returned_ids = body.map { |e| e["id"] }
    assert_not_includes returned_ids, @other_users_entry.id
  end

  test "should show journal entry as json" do
    sign_in @user
    get journal_entry_url(@journal_entry), as: :json
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal @journal_entry.id, body["id"]
  end

  test "should not show another user's journal entry" do
    sign_in @user
    assert_raises(ActiveRecord::RecordNotFound) do
      get journal_entry_url(@other_users_entry), as: :json
    end
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

  test "should return unprocessable entity when creating with duplicate date" do
    sign_in @user
    assert_no_difference("JournalEntry.count") do
      post journal_entries_url, params: {
        journal_entry: {
          date: @journal_entry.date,
          content: "Duplicate date"
        }
      }, as: :json
    end

    assert_response :unprocessable_entity
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

  test "should delete journal entry when updated with empty content" do
    sign_in @user
    assert_difference("JournalEntry.count", -1) do
      patch journal_entry_url(@journal_entry), params: {
        journal_entry: { content: "" }
      }, as: :json
    end

    assert_response :no_content
  end

  test "should destroy journal entry" do
    sign_in @user
    assert_difference("JournalEntry.count", -1) do
      delete journal_entry_url(@journal_entry), as: :json
    end

    assert_response :no_content
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
