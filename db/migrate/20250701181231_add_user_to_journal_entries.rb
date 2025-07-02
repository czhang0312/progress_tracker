class AddUserToJournalEntries < ActiveRecord::Migration[8.0]
  def change
    # Add user_id as nullable first
    add_reference :journal_entries, :user, null: true, foreign_key: true

    # Create a default user if no users exist
    if User.count == 0
      default_user = User.create!(
        email: 'default@example.com',
        password: 'password123',
        password_confirmation: 'password123'
      )
    else
      default_user = User.first
    end

    # Update existing journal entries to belong to the default user
    JournalEntry.where(user_id: nil).update_all(user_id: default_user.id)

    # Make user_id non-nullable
    change_column_null :journal_entries, :user_id, false
  end
end
