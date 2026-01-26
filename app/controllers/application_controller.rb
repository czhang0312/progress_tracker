class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  # Require authentication for all controllers
  before_action :authenticate_user!

  # Add helper methods for views
  helper_method :current_user

  # Skip authentication for API endpoints that need to handle unauthenticated requests
  # skip_before_action :authenticate_user!, only: [ :health_check ]  # Not needed when auth is disabled

  def health_check
    render json: { status: "ok" }
  end
end
