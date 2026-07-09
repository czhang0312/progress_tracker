class PomodoroSession < ApplicationRecord
  belongs_to :user
  belongs_to :task, optional: true
  belongs_to :goal, optional: true

  validates :date, presence: true
  validates :duration_minutes, numericality: { only_integer: true, greater_than: 0 }
end
