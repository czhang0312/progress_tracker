class Goal < ApplicationRecord
  has_many :daily_progresses, dependent: :destroy
  
  validates :name, presence: true, uniqueness: true
  validates :description, presence: true
  
  # Status constants for daily progress
  STATUS_EMPTY = 0
  STATUS_HALF = 1
  STATUS_FILLED = 2
  
  def self.status_options
    {
      STATUS_EMPTY => 'Empty',
      STATUS_HALF => 'Half',
      STATUS_FILLED => 'Filled'
    }
  end
end
