Rails.application.routes.draw do
  devise_for :users, skip: [ :sessions, :registrations, :passwords, :confirmations, :unlocks ]

  # Authentication
  post "auth/login", to: "auth#login"
  post "auth/logout", to: "auth#logout"
  get  "auth/current_user", to: "auth#current_user_info"
  post "auth/register", to: "auth#register"
  get  "auth/whoami", to: "auth#whoami"

  # Password reset
  post "passwords", to: "passwords#create"

  # Goals
  resources :goals do
    member do
      patch :move_up
      patch :move_down
    end
    collection do
      patch :reorder
    end
  end

  # Journal entries
  resources :journal_entries

  # Progress
  get   "progress/:year/:month", to: "progress#show", as: :monthly_progress
  patch "progress/:year/:month/:goal_id/:date", to: "progress#update", as: :update_progress
end
