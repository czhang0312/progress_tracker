class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  # Associations
  has_many :goals, dependent: :destroy
  has_many :journal_entries, dependent: :destroy
  has_many :daily_progresses, through: :goals, dependent: :destroy
end
