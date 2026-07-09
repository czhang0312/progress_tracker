class Task < ApplicationRecord
  belongs_to :user
  belongs_to :goal, optional: true
  has_many :pomodoro_sessions, dependent: :nullify

  validates :name, presence: true
  validates :estimated_pomodoros, numericality: { only_integer: true, greater_than_or_equal_to: 1 }
  validates :completed_pomodoros, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  scope :finished, -> { where(done: true) }
end
