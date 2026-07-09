class Goal < ApplicationRecord
  belongs_to :user
  has_many :daily_progresses, dependent: :destroy
  has_many :tasks, dependent: :nullify
  has_many :pomodoro_sessions, dependent: :nullify

  validates :name, presence: true, uniqueness: { scope: :user_id }
  validates :target_pomodoros, numericality: { only_integer: true, greater_than: 0 }, allow_nil: true

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
