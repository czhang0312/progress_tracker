require "test_helper"

class ExportImportTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)   # has goals :one, :two and journal entries :one, :two
    @other = users(:two)  # has goal :three and journal entry :three
  end

  # ── Export ──────────────────────────────────────────────────────────────────
  test "export requires authentication" do
    get export_url, as: :json
    assert_response :unauthorized
  end

  test "export returns the current user's data nested by goal" do
    sign_in @user
    get export_url, as: :json
    assert_response :success

    body = JSON.parse(response.body)
    assert_equal "progress-tracker-export", body["format"]
    assert_equal 1, body["version"]

    names = body["goals"].map { |g| g["name"] }
    assert_equal ["Learn Ruby", "Exercise Daily"], names # ordered by position
    assert_not_includes names, "Read Books" # other user's goal excluded

    learn_ruby = body["goals"].find { |g| g["name"] == "Learn Ruby" }
    assert_equal [{ "date" => "2025-06-24", "status" => 1 }], learn_ruby["daily_progresses"]

    assert_equal 2, body["journal_entries"].length
  end

  # ── Import ──────────────────────────────────────────────────────────────────
  test "import requires authentication" do
    assert_no_difference("Goal.count") do
      post import_url, params: valid_payload, as: :json
    end
    assert_response :unauthorized
  end

  test "import replaces all of the current user's data" do
    sign_in @user
    post import_url, params: valid_payload, as: :json
    assert_response :success

    body = JSON.parse(response.body)
    assert_equal true, body["success"]
    assert_equal({ "goals" => 1, "daily_progresses" => 2, "journal_entries" => 1 }, body["counts"])

    @user.reload
    assert_equal ["Meditate"], @user.goals.pluck(:name)
    assert_equal 2, @user.goals.first.daily_progresses.count
    assert_equal ["Imported note"], @user.journal_entries.pluck(:content)

    # The other user's data is untouched.
    assert_equal ["Read Books"], @other.goals.pluck(:name)
  end

  test "import rejects an unrecognized format and changes nothing" do
    sign_in @user
    before = @user.goals.pluck(:name).sort

    assert_no_difference(["Goal.count", "JournalEntry.count"]) do
      post import_url, params: { format: "something-else", version: 1, goals: [] }, as: :json
    end
    assert_response :unprocessable_content
    assert_equal false, JSON.parse(response.body)["success"]
    assert_equal before, @user.reload.goals.pluck(:name).sort
  end

  test "import rolls back when a record is invalid" do
    sign_in @user
    bad = {
      format: "progress-tracker-export",
      version: 1,
      goals: [{ name: "", description: "no name", daily_progresses: [] }],
      journal_entries: []
    }

    assert_no_difference(["Goal.count", "JournalEntry.count"]) do
      post import_url, params: bad, as: :json
    end
    assert_response :unprocessable_content
    # Original data survives the rollback.
    assert_equal ["Exercise Daily", "Learn Ruby"], @user.reload.goals.pluck(:name).sort
  end

  private

  def valid_payload
    {
      format: "progress-tracker-export",
      version: 1,
      goals: [
        {
          name: "Meditate",
          description: "10 minutes",
          position: 1,
          started_at: "2026-02-01",
          daily_progresses: [
            { date: "2026-02-01", status: 2 },
            { date: "2026-02-02", status: 1 }
          ]
        }
      ],
      journal_entries: [
        { date: "2026-02-01", content: "Imported note" }
      ]
    }
  end
end
