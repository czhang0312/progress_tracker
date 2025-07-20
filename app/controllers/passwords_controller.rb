class PasswordsController < ApplicationController
  skip_before_action :authenticate_user!

  def create
    user = User.find_by(email: params[:email])

    if user
      user.send_reset_password_instructions
      render json: {
        success: true,
        message: "Password reset instructions have been sent to your email."
      }
    else
      # For security reasons, don't reveal if the email exists or not
      render json: {
        success: true,
        message: "If your email address exists in our database, you will receive a password recovery link at your email address in a few minutes."
      }
    end
  end
end
