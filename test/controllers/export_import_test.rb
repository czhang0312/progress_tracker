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
    assert_equal [ "Learn Ruby", "Exercise Daily" ], names # ordered by position
    assert_not_includes names, "Read Books" # other user's goal excluded

    learn_ruby = body["goals"].find { |g| g["name"] == "Learn Ruby" }
    assert_equal [ { "date" => "2025-06-24", "status" => 1 } ], learn_ruby["daily_progresses"]

    exercise = body["goals"].find { |g| g["name"] == "Exercise Daily" }
    assert_equal 2, exercise["target_pomodoros"]

    assert_equal 2, body["journal_entries"].length

    task_names = body["tasks"].map { |t| t["name"] }
    assert_includes task_names, "Write project outline"
    assert_not_includes task_names, "Someone else's task"
    linked = body["tasks"].find { |t| t["name"] == "Exercise Daily" }
    assert_equal "Exercise Daily", linked["goal_name"]
  end

  test "export nests sessions under their task" do
    sign_in @user
    tasks(:linked).pomodoro_sessions.create!(user: @user, goal: goals(:two), date: "2026-07-09", duration_minutes: 25)

    get export_url, as: :json
    linked = JSON.parse(response.body)["tasks"].find { |t| t["name"] == "Exercise Daily" }
    assert_equal [ { "date" => "2026-07-09", "duration_minutes" => 25 } ], linked["sessions"]
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
    assert_equal({ "goals" => 1, "daily_progresses" => 2, "journal_entries" => 1, "tasks" => 1 }, body["counts"])

    @user.reload
    assert_equal [ "Meditate" ], @user.goals.pluck(:name)
    goal = @user.goals.first
    assert_equal 2, goal.daily_progresses.count
    assert_equal 3, goal.target_pomodoros
    assert_equal [ "Imported note" ], @user.journal_entries.pluck(:content)

    task = @user.tasks.sole
    assert_equal "Meditate", task.name
    assert_equal goal, task.goal
    assert_equal 3, task.estimated_pomodoros
    assert_equal 1, task.completed_pomodoros
    session = @user.pomodoro_sessions.sole
    assert_equal task, session.task
    assert_equal goal, session.goal

    # The other user's data is untouched.
    assert_equal [ "Read Books" ], @other.goals.pluck(:name)
  end

  test "import accepts pre-pomodoro files without tasks" do
    sign_in @user
    post import_url, params: valid_payload.except(:tasks), as: :json
    assert_response :success
    assert_equal 0, @user.reload.tasks.count
  end

  test "import rejects an unrecognized format and changes nothing" do
    sign_in @user
    before = @user.goals.pluck(:name).sort

    assert_no_difference([ "Goal.count", "JournalEntry.count" ]) do
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
      goals: [ { name: "", description: "no name", daily_progresses: [] } ],
      journal_entries: []
    }

    assert_no_difference([ "Goal.count", "JournalEntry.count" ]) do
      post import_url, params: bad, as: :json
    end
    assert_response :unprocessable_content
    # Original data survives the rollback.
    assert_equal [ "Exercise Daily", "Learn Ruby" ], @user.reload.goals.pluck(:name).sort
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
          target_pomodoros: 3,
          daily_progresses: [
            { date: "2026-02-01", status: 2 },
            { date: "2026-02-02", status: 1 }
          ]
        }
      ],
      journal_entries: [
        { date: "2026-02-01", content: "Imported note" }
      ],
      tasks: [
        {
          name: "Meditate",
          goal_name: "Meditate",
          estimated_pomodoros: 3,
          completed_pomodoros: 1,
          done: false,
          position: 1,
          sessions: [
            { date: "2026-02-01", duration_minutes: 25 }
          ]
        }
      ]
    }
  end
end
