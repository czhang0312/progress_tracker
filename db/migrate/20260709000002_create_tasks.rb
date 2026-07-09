class CreateTasks < ActiveRecord::Migration[8.0]
  def change
    create_table :tasks do |t|
      t.references :user, null: false, foreign_key: true
      t.references :goal, null: true, foreign_key: { on_delete: :nullify }
      t.string :name, null: false
      t.text :note
      t.integer :estimated_pomodoros, null: false, default: 1
      t.integer :completed_pomodoros, null: false, default: 0
      t.boolean :done, null: false, default: false
      t.integer :position, null: false, default: 0

      t.timestamps
    end

    add_index :tasks, [ :user_id, :position ]
  end
end
