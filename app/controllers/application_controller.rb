class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  # Require authentication for all controllers
  before_action :authenticate_user!
  before_action :log_session_debug

  # Add helper methods for views
  helper_method :current_user

  def log_session_debug
    Rails.logger.info "=== Request Debug ==="
    Rails.logger.info "Path: #{request.path}"
    Rails.logger.info "user_signed_in?: #{user_signed_in?}"
    Rails.logger.info "current_user: #{current_user&.email}"
    Rails.logger.info "session.id: #{session.id}"
    Rails.logger.info "cookies present: #{request.cookies.keys}"
    Rails.logger.info "session cookie: #{request.cookies['_progress_tracker_session']&.first(50)}"
    Rails.logger.info "===================="
  end

  # Skip authentication for API endpoints that need to handle unauthenticated requests
  # skip_before_action :authenticate_user!, only: [ :health_check ]  # Not needed when auth is disabled

  def health_check
    render json: { status: "ok" }
  end
end
