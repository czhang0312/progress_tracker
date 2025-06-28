Rails.application.routes.draw do
  # Main progress tracking view
  root "progress#index"
  
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
