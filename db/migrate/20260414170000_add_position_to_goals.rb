class AddPositionToGoals < ActiveRecord::Migration[8.0]
  def up
    add_column :goals, :position, :integer, default: 0, null: false unless column_exists?(:goals, :position)
    add_index :goals, :position unless index_exists?(:goals, :position)

    execute <<~SQL
      WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at, id) AS seq
        FROM goals
      )
      UPDATE goals
      SET position = ranked.seq
      FROM ranked
      WHERE goals.id = ranked.id;
    SQL
  end

  def down
    remove_index :goals, :position if index_exists?(:goals, :position)
    remove_column :goals, :position if column_exists?(:goals, :position)
  end
end
