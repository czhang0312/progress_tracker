class DailyProgress < ApplicationRecord
  belongs_to :goal

  validates :date, presence: true
  validates :status, inclusion: { in: [ 0, 1, 2 ] }
  validates :goal_id, uniqueness: { scope: :date, message: "already has progress recorded for this date" }, on: :create

  # Status constants
  STATUS_EMPTY = 0
  STATUS_HALF = 1
  STATUS_FILLED = 2

  def status_text
    case status
    when STATUS_EMPTY
      "Empty"
    when STATUS_HALF
      "Half"
    when STATUS_FILLED
      "Filled"
    else
      "Unknown"
    end
  end
end
