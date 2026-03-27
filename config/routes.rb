Rails.application.routes.draw do
  devise_for :users

  # API routes for Next.js frontend
  namespace :api do
    post "auth/login", to: "auth#login"
    post "auth/logout", to: "auth#logout"
    get "auth/current_user", to: "auth#current_user_info"
    post "auth/register", to: "auth#register"
    get "auth/whoami", to: "auth#whoami"
  end

  # Root route - redirect to current month progress for authenticated users
  authenticated :user do
    root "progress#index", as: :authenticated_root
  end

  # Root route for unauthenticated users - allow guest dashboard access
  unauthenticated do
    root "progress#index", as: :unauthenticated_root
  end

  # Progress tracking by month
  get "progress/:year/:month", to: "progress#show", as: :monthly_progress
  patch "progress/:year/:month/:goal_id/:date", to: "progress#update", as: :update_progress

  # Goals management
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

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker
end
