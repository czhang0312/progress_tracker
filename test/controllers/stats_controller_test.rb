require "test_helper"

class StatsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @user_two = users(:two)
  end

  # --- Guest access ---

  test "guest should get stats with empty data" do
    get stats_url, as: :json
    assert_response :success
    body = JSON.parse(response.body)
    assert body.key?("year")
    assert_equal({}, body["daily_totals"])
    assert_equal([], body["per_goal"])
  end

  # --- Response structure ---

  test "authenticated user should get stats with correct keys" do
    sign_in @user
    get stats_url, as: :json
    assert_response :success
    body = JSON.parse(response.body)
    assert body.key?("year")
    assert body.key?("daily_totals")
    assert body.key?("per_goal")
  end

  test "per_goal items have expected keys" do
    sign_in @user
    get stats_url, as: :json
    body = JSON.parse(response.body)
    assert body["per_goal"].any?
    stat = body["per_goal"].first
    %w[id name created_at completion_pct current_streak longest_streak best_month].each do |key|
      assert stat.key?(key), "Expected per_goal item to have key: #{key}"
    end
  end

  # --- Year parameter ---

  test "year parameter is reflected in response" do
    sign_in @user
    get stats_url(year: 2025), as: :json
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal 2025, body["year"]
  end

  test "daily_totals only includes days within the requested year" do
    sign_in @user
    # Fixture data is on 2025-06-24; requesting 2024 should produce no entries
    get stats_url(year: 2024), as: :json
    body = JSON.parse(response.body)
    assert_empty body["daily_totals"]
  end

  # --- daily_totals aggregation ---

  test "daily_totals aggregates filled and half counts per day" do
    sign_in @user
    # Fixtures: goal :one and goal :two both have status 1 (half) on 2025-06-24
    get stats_url(year: 2025), as: :json
    body = JSON.parse(response.body)
    assert body["daily_totals"].key?("2025-06-24")
    day = body["daily_totals"]["2025-06-24"]
    assert_equal 0, day["filled"]
    assert_equal 2, day["half"]
    assert_equal 0, day["empty"]
  end

  test "daily_totals counts filled status correctly" do
    sign_in @user
    DailyProgress.create!(goal: goals(:one), date: "2025-07-01", status: 2)
    get stats_url(year: 2025), as: :json
    body = JSON.parse(response.body)
    assert_equal 1, body["daily_totals"]["2025-07-01"]["filled"]
    assert_equal 0, body["daily_totals"]["2025-07-01"]["half"]
  end

  # --- Data isolation ---

  test "per_goal includes only the authenticated user's goals" do
    sign_in @user
    get stats_url, as: :json
    body = JSON.parse(response.body)
    goal_ids = body["per_goal"].map { |g| g["id"] }
    assert_includes goal_ids, goals(:one).id
    assert_includes goal_ids, goals(:two).id
    refute_includes goal_ids, goals(:three).id
  end

  test "user two sees only their own goals" do
    sign_in @user_two
    get stats_url, as: :json
    body = JSON.parse(response.body)
    goal_ids = body["per_goal"].map { |g| g["id"] }
    assert_includes goal_ids, goals(:three).id
    refute_includes goal_ids, goals(:one).id
  end

  # --- completion_pct ---

  test "completion_pct is within 0 to 100" do
    sign_in @user
    get stats_url, as: :json
    body = JSON.parse(response.body)
    body["per_goal"].each do |stat|
      assert stat["completion_pct"] >= 0, "completion_pct should be >= 0"
      assert stat["completion_pct"] <= 100, "completion_pct should be <= 100"
    end
  end

  # --- Streak computation ---

  test "current_streak reflects consecutive days ending today" do
    sign_in @user
    goal = goals(:one)
    today = Date.current
    DailyProgress.create!(goal: goal, date: today - 2, status: 2)
    DailyProgress.create!(goal: goal, date: today - 1, status: 2)
    DailyProgress.create!(goal: goal, date: today,     status: 2)

    get stats_url, as: :json
    body = JSON.parse(response.body)
    stat = body["per_goal"].find { |g| g["id"] == goal.id }
    assert stat["current_streak"] >= 3
  end

  test "current_streak is zero when no recent activity" do
    sign_in @user
    goal = goals(:one)
    # Clear all existing progress for this goal
    goal.daily_progresses.delete_all
    DailyProgress.create!(goal: goal, date: Date.current - 30, status: 2)

    get stats_url, as: :json
    body = JSON.parse(response.body)
    stat = body["per_goal"].find { |g| g["id"] == goal.id }
    assert_equal 0, stat["current_streak"]
  end

  test "longest_streak tracks the best consecutive run" do
    sign_in @user
    goal = goals(:one)
    goal.daily_progresses.delete_all
    # Run of 5 days (not recent)
    (0..4).each { |i| DailyProgress.create!(goal: goal, date: Date.current - 30 + i, status: 2) }
    # Run of 2 days more recently (gap in between)
    DailyProgress.create!(goal: goal, date: Date.current - 5, status: 2)
    DailyProgress.create!(goal: goal, date: Date.current - 4, status: 2)

    get stats_url, as: :json
    body = JSON.parse(response.body)
    stat = body["per_goal"].find { |g| g["id"] == goal.id }
    assert_equal 5, stat["longest_streak"]
  end
end
