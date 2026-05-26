class Goal < ApplicationRecord
  belongs_to :user
  has_many :daily_progresses, dependent: :destroy

  validates :name, presence: true, uniqueness: { scope: :user_id }
  validates :description, presence: true

  # Status constants for daily progress
  STATUS_EMPTY = 0
  STATUS_HALF = 1
  STATUS_FILLED = 2

  def self.status_options
    {
      STATUS_EMPTY => "Empty",
      STATUS_HALF => "Half",
      STATUS_FILLED => "Filled"
    }
  end
end
