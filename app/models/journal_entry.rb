class JournalEntry < ApplicationRecord
  validates :date, presence: true, uniqueness: true
end
