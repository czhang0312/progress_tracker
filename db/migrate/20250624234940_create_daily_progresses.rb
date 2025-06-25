class CreateDailyProgresses < ActiveRecord::Migration[8.0]
  def change
    create_table :daily_progresses do |t|
      t.references :goal, null: false, foreign_key: true
      t.date :date
      t.integer :status

      t.timestamps
    end
  end
end
