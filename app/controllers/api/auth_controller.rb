class Api::AuthController < ApplicationController
  skip_before_action :verify_authenticity_token # verify_authenticity_token used for CSRF protection, but we disable it for API endpoints
  skip_before_action :authenticate_user!, only: [ :login, :logout, :current_user_info, :register, :whoami ]

  def login
    user = User.find_by(email: params[:email])

    if user&.valid_password?(params[:password])
      sign_in(user)

      # Debug session after login
      Rails.logger.info "=== Login Debug ==="
      Rails.logger.info "user_signed_in?: #{user_signed_in?}"
      Rails.logger.info "current_user: #{current_user&.email}"
      Rails.logger.info "session: #{session.to_h}"
      Rails.logger.info "cookies: #{cookies.to_h}"
      Rails.logger.info "================================"

      render json: {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          is_guest: false
        }
      }
    else
      render json: {
        success: false,
        error: "Invalid email or password"
      }, status: :unauthorized
    end
  end

  def logout
    sign_out(current_user) if user_signed_in?
    render json: { success: true }
  end

  def current_user_info
    if user_signed_in?
      render json: {
        success: true,
        user: {
          id: current_user.id,
          email: current_user.email,
          is_guest: false
        }
      }
    else
      render json: {
        success: true,
        user: guest_user_payload
      }
    end
  end

  def register
    user = User.new(
      email: params[:email],
      password: params[:password],
      password_confirmation: params[:password_confirmation]
    )

    if user.save
      sign_in(user)
      render json: {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          is_guest: false
        }
      }, status: :created
    else
      render json: {
        success: false,
        errors: user.errors.full_messages
      }, status: :unprocessable_entity
    end
  end

  # Test endpoint for debugging authentication
  def whoami
    if user_signed_in?
      render json: { authenticated: true, email: current_user.email, is_guest: false }
    else
      render json: { authenticated: false, is_guest: true, user: guest_user_payload }
    end
  end
end
