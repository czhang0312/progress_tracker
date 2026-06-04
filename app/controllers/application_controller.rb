class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  # Require authentication by default, but allow selected read-only guest routes.
  before_action :authenticate_user!, unless: :allow_guest_access?
  before_action :log_session_debug

  # Add helper methods for views
  helper_method :current_user, :guest_user?

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

  def guest_user?
    !user_signed_in?
  end

  def guest_user_payload
    {
      id: nil,
      email: "guest",
      is_guest: true
    }
  end

  def require_auth_for_write!
    return if user_signed_in?

    respond_to do |format|
      format.json do
        render json: {
          success: false,
          code: "AUTH_REQUIRED",
          message: "Sign in to save your data."
        }, status: :unauthorized
      end
      format.any do
        redirect_to new_user_session_path, alert: "Sign in to save your data."
      end
    end
  end

  # Skip authentication for API endpoints that need to handle unauthenticated requests
  # skip_before_action :authenticate_user!, only: [ :health_check ]  # Not needed when auth is disabled

  def health_check
    render json: { status: "ok" }
  end

  private

  def allow_guest_access?
    return false if user_signed_in?

    guest_enabled_controllers = %w[progress goals journal_entries]
    guest_enabled_controllers.include?(controller_name)
  end
end
