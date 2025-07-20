class ApplicationController < ActionController::API
  include ActionController::Cookies
  include Devise::Controllers::Helpers

  # Require authentication for all controllers
  before_action :authenticate_user!

  # Skip authentication for API endpoints that need to handle unauthenticated requests
  skip_before_action :authenticate_user!, only: [ :health_check ]

  def health_check
    render json: { status: "ok" }
  end
end
