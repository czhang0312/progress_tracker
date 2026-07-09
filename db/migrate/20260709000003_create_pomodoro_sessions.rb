class CreatePomodoroSessions < ActiveRecord::Migration[8.0]
  def change
    create_table :pomodoro_sessions do |t|
      t.references :user, null: false, foreign_key: true
      t.references :task, null: true, foreign_key: { on_delete: :nullify }
      t.references :goal, null: true, foreign_key: { on_delete: :nullify }
      t.date :date, null: false
      t.datetime :started_at
      t.datetime :ended_at
      t.integer :duration_minutes, null: false

      t.timestamps
    end

    add_index :pomodoro_sessions, [ :user_id, :date ]
    add_index :pomodoro_sessions, [ :goal_id, :date ]
  end
end
