class FixStartedAtTimezone < ActiveRecord::Migration[8.0]
  def up
    # Original backfill used DATE(created_at) in raw SQL, which PostgreSQL
    # evaluates in UTC. Goals created between 8pm–midnight ET got a started_at
    # one day ahead of the actual ET date. Re-derive using Rails' configured
    # time zone (Eastern) so started_at matches the user's local date.
    Goal.find_each do |goal|
      goal.update_column(:started_at, goal.created_at.in_time_zone.to_date)
    end
  end

  def down
    # No safe reverse — original UTC dates are gone
  end
end
