require "test_helper"

class ProgressControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get progress_index_url
    assert_response :success
  end

  test "should get show" do
    get progress_show_url
    assert_response :success
  end

  test "should get update" do
    get progress_update_url
    assert_response :success
  end
end
