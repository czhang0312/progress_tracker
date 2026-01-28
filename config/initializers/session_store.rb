# Be sure to restart your server when you modify this file.

Rails.application.config.session_store :cookie_store,
  key: "_progress_tracker_session",
  same_site: Rails.env.production? ? :none : :lax,
  secure: Rails.env.production?, # Required for same_site: :none
  path: "/"
