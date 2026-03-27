require "test_helper"

class Api::AuthControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
  end

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
