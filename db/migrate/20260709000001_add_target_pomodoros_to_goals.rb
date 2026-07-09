class AddTargetPomodorosToGoals < ActiveRecord::Migration[8.0]
  def change
    add_column :goals, :target_pomodoros, :integer, null: true
  end
end
