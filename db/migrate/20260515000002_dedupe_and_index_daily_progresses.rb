class DedupeAndIndexDailyProgresses < ActiveRecord::Migration[8.0]
  def up
    # Remove duplicates: for each (goal_id, date) group, keep the row with
    # the highest id (most recently written) and delete the rest.
    duplicate_groups = DailyProgress
      .group(:goal_id, :date)
      .having("count(*) > 1")
      .pluck(:goal_id, :date)

    duplicate_groups.each do |goal_id, date|
      rows = DailyProgress.where(goal_id: goal_id, date: date).order(id: :desc)
      rows.offset(1).delete_all
    end

    add_index :daily_progresses, [ :goal_id, :date ], unique: true,
              name: "index_daily_progresses_on_goal_id_and_date"
  end

  def down
    remove_index :daily_progresses, name: "index_daily_progresses_on_goal_id_and_date"
  end
end
