class AddStartedAtToGoals < ActiveRecord::Migration[8.0]
  def up
    add_column :goals, :started_at, :date
    Goal.update_all("started_at = DATE(created_at)")
    change_column_null :goals, :started_at, false
  end

  def down
    remove_column :goals, :started_at
  end
end
