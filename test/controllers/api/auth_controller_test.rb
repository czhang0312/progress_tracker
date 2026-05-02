require "test_helper"

class Api::AuthControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
  end

  # --- forgot_password ---

  test "forgot_password with valid email returns success" do
    post api_auth_forgot_password_url, params: { email: @user.email }, as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal true, body["success"]
  end

  test "forgot_password with unknown email still returns success to prevent enumeration" do
    post api_auth_forgot_password_url, params: { email: "nobody@example.com" }, as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal true, body["success"]
  end

  test "forgot_password enqueues reset instructions for valid email" do
    assert_emails 1 do
      post api_auth_forgot_password_url, params: { email: @user.email }, as: :json
    end
  end

  test "forgot_password does not send email for unknown address" do
    assert_emails 0 do
      post api_auth_forgot_password_url, params: { email: "nobody@example.com" }, as: :json
    end
  end

  # --- reset_password ---

  test "reset_password with valid token updates password" do
    raw_token, enc_token = Devise.token_generator.generate(User, :reset_password_token)
    @user.update!(reset_password_token: enc_token, reset_password_sent_at: Time.now.utc)

    post api_auth_reset_password_url,
         params: { token: raw_token, password: "newpassword1", password_confirmation: "newpassword1" },
         as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal true, body["success"]
    assert @user.reload.valid_password?("newpassword1")
  end

  test "reset_password with invalid token returns errors" do
    post api_auth_reset_password_url,
         params: { token: "badtoken", password: "newpassword1", password_confirmation: "newpassword1" },
         as: :json

    assert_response :unprocessable_content
    body = JSON.parse(response.body)
    assert_equal false, body["success"]
    assert_not_empty body["errors"]
  end

  test "reset_password with expired token returns errors" do
    raw_token, enc_token = Devise.token_generator.generate(User, :reset_password_token)
    @user.update!(reset_password_token: enc_token, reset_password_sent_at: 7.hours.ago)

    post api_auth_reset_password_url,
         params: { token: raw_token, password: "newpassword1", password_confirmation: "newpassword1" },
         as: :json

    assert_response :unprocessable_content
    body = JSON.parse(response.body)
    assert_equal false, body["success"]
  end

  test "reset_password with mismatched confirmation returns errors" do
    raw_token, enc_token = Devise.token_generator.generate(User, :reset_password_token)
    @user.update!(reset_password_token: enc_token, reset_password_sent_at: Time.now.utc)

    post api_auth_reset_password_url,
         params: { token: raw_token, password: "newpassword1", password_confirmation: "different" },
         as: :json

    assert_response :unprocessable_content
    body = JSON.parse(response.body)
    assert_equal false, body["success"]
    assert_not_empty body["errors"]
  end

  # --- existing tests ---

  test "guest current_user_info returns guest user payload" do
    get api_auth_current_user_url, as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal true, body["success"]
    assert_equal true, body.dig("user", "is_guest")
    assert_nil body.dig("user", "id")
    assert_equal "guest", body.dig("user", "email")
  end

  test "authenticated current_user_info returns signed in user payload" do
    sign_in @user

    get api_auth_current_user_url, as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal true, body["success"]
    assert_equal false, body.dig("user", "is_guest")
    assert_equal @user.id, body.dig("user", "id")
    assert_equal @user.email, body.dig("user", "email")
  end
end
