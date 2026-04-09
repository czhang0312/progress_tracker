require "test_helper"

class Api::AuthControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
  end

  # current_user_info

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

  # login

  test "login with valid credentials signs in user" do
    post api_auth_login_url, params: { email: @user.email, password: "password123" }, as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal true, body["success"]
    assert_equal @user.id, body.dig("user", "id")
    assert_equal @user.email, body.dig("user", "email")
    assert_equal false, body.dig("user", "is_guest")
  end

  test "login with invalid password returns unauthorized" do
    post api_auth_login_url, params: { email: @user.email, password: "wrongpassword" }, as: :json

    assert_response :unauthorized
    body = JSON.parse(response.body)
    assert_equal false, body["success"]
    assert body["error"].present?
  end

  test "login with unknown email returns unauthorized" do
    post api_auth_login_url, params: { email: "nobody@example.com", password: "password123" }, as: :json

    assert_response :unauthorized
    body = JSON.parse(response.body)
    assert_equal false, body["success"]
  end

  # logout

  test "logout signs out authenticated user" do
    sign_in @user
    post api_auth_logout_url, as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal true, body["success"]
  end

  test "logout is a no-op for guest" do
    post api_auth_logout_url, as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal true, body["success"]
  end

  # register

  test "register with valid data creates user and signs in" do
    assert_difference("User.count") do
      post api_auth_register_url, params: {
        email: "newuser@example.com",
        password: "securepass1",
        password_confirmation: "securepass1"
      }, as: :json
    end

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal true, body["success"]
    assert_equal "newuser@example.com", body.dig("user", "email")
    assert_equal false, body.dig("user", "is_guest")
  end

  test "register with mismatched passwords returns unprocessable entity" do
    assert_no_difference("User.count") do
      post api_auth_register_url, params: {
        email: "newuser@example.com",
        password: "securepass1",
        password_confirmation: "different"
      }, as: :json
    end

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal false, body["success"]
    assert body["errors"].any?
  end

  test "register with existing email returns unprocessable entity" do
    assert_no_difference("User.count") do
      post api_auth_register_url, params: {
        email: @user.email,
        password: "password123",
        password_confirmation: "password123"
      }, as: :json
    end

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal false, body["success"]
    assert body["errors"].any?
  end

  test "register with blank email returns unprocessable entity" do
    assert_no_difference("User.count") do
      post api_auth_register_url, params: {
        email: "",
        password: "password123",
        password_confirmation: "password123"
      }, as: :json
    end

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal false, body["success"]
  end

  # whoami

  test "whoami for guest returns not authenticated" do
    get api_auth_whoami_url, as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal false, body["authenticated"]
    assert_equal true, body["is_guest"]
  end

  test "whoami for authenticated user returns user info" do
    sign_in @user
    get api_auth_whoami_url, as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal true, body["authenticated"]
    assert_equal @user.email, body["email"]
    assert_equal false, body["is_guest"]
  end
end
