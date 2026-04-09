class JournalEntry < ApplicationRecord
  belongs_to :user

  validates :date, presence: true,
                   uniqueness: {
                     scope: :user_id,
                     message: "There is already a journal entry for this date. Choose a different date or edit the existing entry."
                   }
end
